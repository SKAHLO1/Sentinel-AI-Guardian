import { NextRequest, NextResponse } from "next/server"
import { aiDecodeCalldata } from "@/lib/engine/copilot"
import { enforceRateLimit } from "@/lib/rate-limit"

// Node runtime (AWS SDK) + room for Bedrock latency on Vercel.
export const runtime = "nodejs"
export const maxDuration = 60

// POST /api/decode — AI calldata decoder (Module 5).
// Body: { data, to?, value?, chainId? } → plain-English decode of the calldata.
export async function POST(req: NextRequest) {
  const limited = await enforceRateLimit(req, "decode", 20, 60) // 20/min (Bedrock cost)
  if (limited) return limited
  let body: { data?: string; to?: string; value?: string; chainId?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  if (!body.data) return NextResponse.json({ error: "data (calldata) is required" }, { status: 400 })
  const result = await aiDecodeCalldata(body)
  return NextResponse.json(result)
}
