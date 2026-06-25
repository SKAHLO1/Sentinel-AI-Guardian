import { NextRequest, NextResponse } from "next/server"
import { getSettings, putSettings, isDbConfigured, type UserSettings } from "@/lib/engine/db"
import { enforceRateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"

// GET /api/settings?address=0x... — load a wallet's saved settings.
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address")
  if (!isDbConfigured()) return NextResponse.json({ configured: false, settings: null })
  if (!address) return NextResponse.json({ configured: true, settings: null })
  try {
    return NextResponse.json({ configured: true, settings: await getSettings(address) })
  } catch (err) {
    return NextResponse.json({ configured: true, settings: null, error: (err as Error).message }, { status: 502 })
  }
}

// PUT /api/settings — save a wallet's settings. Body: { address, settings }.
export async function PUT(req: NextRequest) {
  const limited = await enforceRateLimit(req, "settings", 60, 60)
  if (limited) return limited

  let body: { address?: string; settings?: UserSettings }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  if (!body.address) return NextResponse.json({ error: "address required" }, { status: 400 })
  if (!isDbConfigured()) return NextResponse.json({ saved: false, reason: "no-database" })
  try {
    // Persist only the safe fields (never an API key/secret).
    const settings: UserSettings = {
      toggles: body.settings?.toggles ?? {},
      profile: { email: body.settings?.profile?.email, name: body.settings?.profile?.name },
    }
    await putSettings(body.address, settings)
    return NextResponse.json({ saved: true })
  } catch (err) {
    return NextResponse.json({ saved: false, error: (err as Error).message }, { status: 502 })
  }
}
