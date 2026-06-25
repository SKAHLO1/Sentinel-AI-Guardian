import { NextRequest, NextResponse } from "next/server"
import { getTokenMetaLive, isOnchainConfigured } from "@/lib/engine/onchain"

export const runtime = "nodejs"

// GET /api/token?address=0x...&chainId= — token symbol/name/decimals.
// Used by the spending-cap rewrite to convert a human amount to on-chain units.
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address")
  const chainId = Number(req.nextUrl.searchParams.get("chainId")) || undefined
  if (!address) return NextResponse.json({ error: "address required" }, { status: 400 })
  if (!isOnchainConfigured()) return NextResponse.json({ configured: false, decimals: 18 })
  try {
    const meta = await getTokenMetaLive(address, chainId)
    return NextResponse.json({ configured: true, ...meta })
  } catch (err) {
    return NextResponse.json({ configured: true, error: (err as Error).message, decimals: 18 }, { status: 200 })
  }
}
