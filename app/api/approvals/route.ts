import { NextRequest, NextResponse } from "next/server"
import { getApprovalsLive, isOnchainConfigured } from "@/lib/engine/onchain"
import { enforceRateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const maxDuration = 60

// GET /api/approvals?address=0x... — real approval scanner via Alchemy (Module 12).
export async function GET(req: NextRequest) {
  const limited = await enforceRateLimit(req, "approvals", 30, 60) // 30/min (Alchemy cost)
  if (limited) return limited
  const address = req.nextUrl.searchParams.get("address")

  if (!isOnchainConfigured()) {
    return NextResponse.json({ configured: false, reason: "no-alchemy-key", approvals: [] })
  }
  if (!address) {
    return NextResponse.json({ configured: true, connected: false, reason: "no-address", approvals: [] })
  }
  try {
    const approvals = await getApprovalsLive(address)
    return NextResponse.json({ configured: true, connected: true, approvals })
  } catch (err) {
    console.error("[/api/approvals] Alchemy error:", (err as Error).message)
    return NextResponse.json(
      { configured: true, connected: true, error: (err as Error).message, approvals: [] },
      { status: 502 },
    )
  }
}

// POST /api/approvals — build a one-click revoke (approve(spender, 0)) calldata.
export async function POST(req: NextRequest) {
  let body: { token?: string; spender?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  if (!body.spender) return NextResponse.json({ error: "spender is required" }, { status: 400 })
  const spenderPadded = body.spender.replace(/^0x/, "").toLowerCase().padStart(64, "0")
  const revokeCalldata = "0x095ea7b3" + spenderPadded + "0".repeat(64)
  return NextResponse.json({
    revoked: true,
    spender: body.spender,
    token: body.token ?? null,
    calldata: revokeCalldata,
    note: "Sets allowance to 0. Submit this calldata to the token contract to revoke.",
  })
}
