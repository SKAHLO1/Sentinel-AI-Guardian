import { NextRequest, NextResponse } from "next/server"
import { copilotAnswer } from "@/lib/engine/copilot"
import { enforceRateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const maxDuration = 60

// POST /api/copilot — AI Security Copilot (Module 14).
export async function POST(req: NextRequest) {
  const limited = await enforceRateLimit(req, "copilot", 20, 60) // 20/min (Bedrock cost)
  if (limited) return limited
  let body: { message?: string; data?: string; to?: string; domain?: string; walletAddress?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  if (!body.message?.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 })
  }
  // Ground the answer on any calldata / domain embedded in the message, so the
  // endpoint works even when the caller doesn't separate them out.
  const data = body.data ?? body.message.match(/0x[0-9a-fA-F]{8,}/)?.[0]
  const domain = body.domain ?? body.message.match(/\b([a-z0-9-]+\.)+[a-z]{2,}\b/i)?.[0]
  const { answer, backend } = await copilotAnswer(body.message, {
    data,
    to: body.to,
    domain,
    walletAddress: body.walletAddress,
  })
  return NextResponse.json({ answer, backend })
}
