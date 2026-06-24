import { NextRequest, NextResponse } from "next/server"
import { queryScanEvents, clearScanEvents, isDbConfigured } from "@/lib/engine/db"

export const runtime = "nodejs"
export const maxDuration = 30

// GET /api/history?address=0x...&type=threat&limit=25 — recall stored scans.
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address")
  const type = req.nextUrl.searchParams.get("type") as "scan" | "threat" | null
  const limit = Number(req.nextUrl.searchParams.get("limit")) || 25

  if (!isDbConfigured()) {
    return NextResponse.json({ configured: false, reason: "no-dynamodb-table", events: [] })
  }
  if (!address) {
    return NextResponse.json({ configured: true, connected: false, events: [] })
  }
  try {
    const events = await queryScanEvents(address, { entity: type ?? undefined, limit })
    return NextResponse.json({ configured: true, connected: true, events })
  } catch (err) {
    return NextResponse.json(
      { configured: true, connected: true, error: (err as Error).message, events: [] },
      { status: 502 },
    )
  }
}

// DELETE /api/history?address=0x... — clear a wallet's stored history.
export async function DELETE(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address")
  if (!isDbConfigured()) return NextResponse.json({ configured: false }, { status: 200 })
  if (!address) return NextResponse.json({ error: "address is required" }, { status: 400 })
  try {
    const deleted = await clearScanEvents(address)
    return NextResponse.json({ deleted })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 })
  }
}
