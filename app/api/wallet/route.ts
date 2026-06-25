import { NextRequest, NextResponse } from "next/server"
import { getWalletHealthLive, isOnchainConfigured } from "@/lib/engine/onchain"
import { enforceRateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const maxDuration = 60

// GET /api/wallet?address=0x... — real wallet health via Alchemy.
// Returns honest flags instead of any synthetic data:
//   { configured:false }              → no ALCHEMY_API_KEY on the backend
//   { configured:true, connected:false } → no address supplied
//   { configured:true, connected:true, ...health }
export async function GET(req: NextRequest) {
  const limited = await enforceRateLimit(req, "wallet", 30, 60) // 30/min (Alchemy cost)
  if (limited) return limited
  const address = req.nextUrl.searchParams.get("address")
  const chainId = Number(req.nextUrl.searchParams.get("chainId")) || undefined

  if (!isOnchainConfigured()) {
    return NextResponse.json({ configured: false, reason: "no-alchemy-key" })
  }
  if (!address) {
    return NextResponse.json({ configured: true, connected: false, reason: "no-address" })
  }
  try {
    const health = await getWalletHealthLive(address, chainId)
    return NextResponse.json({ configured: true, connected: true, chainId: chainId ?? 1, ...health })
  } catch (err) {
    console.error("[/api/wallet] Alchemy error:", (err as Error).message)
    return NextResponse.json(
      { configured: true, connected: true, error: (err as Error).message },
      { status: 502 },
    )
  }
}
