import { NextRequest, NextResponse } from "next/server"
import { getContractReputation } from "@/lib/engine/reputation"

export const runtime = "nodejs"

// GET /api/reputation?address=0x...&chainId= — contract verification status.
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address")
  const chainId = Number(req.nextUrl.searchParams.get("chainId")) || 1
  if (!address) return NextResponse.json({ error: "address required" }, { status: 400 })
  return NextResponse.json(await getContractReputation(address, chainId))
}
