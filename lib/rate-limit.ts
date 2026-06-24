// Rate limiting (Module 22). Protects the paid Bedrock/Alchemy routes from abuse.
//
// Uses an in-memory fixed-window counter by default (fine for a single instance
// / local dev), and upgrades to distributed Redis when UPSTASH_REDIS_REST_URL +
// UPSTASH_REDIS_REST_TOKEN are set — which is what you want across Vercel's many
// serverless instances.

import { NextResponse } from "next/server"

export interface RateResult {
  ok: boolean
  remaining: number
  resetSec: number
  limit: number
}

const mem = new Map<string, { count: number; resetAt: number }>()

function memoryLimit(key: string, limit: number, windowSec: number): RateResult {
  const now = Date.now()
  // Opportunistic cleanup so the map can't grow unbounded.
  if (mem.size > 5000) {
    for (const [k, v] of mem) if (v.resetAt <= now) mem.delete(k)
  }
  const e = mem.get(key)
  if (!e || e.resetAt <= now) {
    mem.set(key, { count: 1, resetAt: now + windowSec * 1000 })
    return { ok: true, remaining: limit - 1, resetSec: windowSec, limit }
  }
  e.count++
  return {
    ok: e.count <= limit,
    remaining: Math.max(0, limit - e.count),
    resetSec: Math.ceil((e.resetAt - now) / 1000),
    limit,
  }
}

async function upstashLimit(key: string, limit: number, windowSec: number): Promise<RateResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL as string
  const token = process.env.UPSTASH_REDIS_REST_TOKEN as string
  // Atomic INCR + set TTL only on first hit (EXPIRE … NX).
  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify([
      ["INCR", key],
      ["EXPIRE", key, String(windowSec), "NX"],
    ]),
  })
  if (!res.ok) throw new Error(`upstash ${res.status}`)
  const data = (await res.json()) as { result: number | string }[]
  const count = Number(data[0]?.result ?? 0)
  return { ok: count <= limit, remaining: Math.max(0, limit - count), resetSec: windowSec, limit }
}

export async function rateLimit(key: string, limit: number, windowSec: number): Promise<RateResult> {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      return await upstashLimit(key, limit, windowSec)
    } catch {
      // Redis hiccup — degrade to in-memory rather than failing the request.
    }
  }
  return memoryLimit(key, limit, windowSec)
}

export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for")
  if (xff) return xff.split(",")[0]!.trim()
  return req.headers.get("x-real-ip") || "unknown"
}

/**
 * Enforce a per-IP limit for a named route. Returns a 429 NextResponse to return
 * early, or null when the request is allowed.
 */
export async function enforceRateLimit(
  req: Request,
  name: string,
  limit: number,
  windowSec: number,
): Promise<NextResponse | null> {
  const r = await rateLimit(`rl:${name}:${clientIp(req)}`, limit, windowSec)
  if (!r.ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded — please slow down." },
      {
        status: 429,
        headers: {
          "Retry-After": String(r.resetSec),
          "X-RateLimit-Limit": String(r.limit),
          "X-RateLimit-Remaining": String(r.remaining),
        },
      },
    )
  }
  return null
}
