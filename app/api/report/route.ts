import { NextRequest, NextResponse } from "next/server"
import { putReport, isDbConfigured } from "@/lib/engine/db"
import { enforceRateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"

// POST /api/report — crowdsourced threat report (Module 13/15).
// Body: { type: "domain"|"address", value, reason? }
export async function POST(req: NextRequest) {
  const limited = await enforceRateLimit(req, "report", 30, 60)
  if (limited) return limited

  let body: { type?: string; value?: string; reason?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  const type = body.type === "address" ? "address" : body.type === "domain" ? "domain" : null
  const value = body.value?.trim()
  if (!type || !value) {
    return NextResponse.json({ error: "type ('domain'|'address') and value are required" }, { status: 400 })
  }
  if (!isDbConfigured()) {
    return NextResponse.json({ recorded: false, reason: "no-database" })
  }
  try {
    await putReport({ type, value, reason: body.reason?.slice(0, 280) })
    return NextResponse.json({ recorded: true })
  } catch (err) {
    return NextResponse.json({ recorded: false, error: (err as Error).message }, { status: 502 })
  }
}
