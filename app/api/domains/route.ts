import { NextRequest, NextResponse } from "next/server"
import { analyzeDomain } from "@/lib/engine/domains"
import { ensureFeedLoaded } from "@/lib/engine/threat-feed"

// GET /api/domains?domain=... — website protection engine (Module 7).
export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get("domain")
  if (!domain) return NextResponse.json({ error: "domain query param is required" }, { status: 400 })
  await ensureFeedLoaded() // ensure live blocklists are warm before checking
  return NextResponse.json(analyzeDomain(domain))
}

export async function POST(req: NextRequest) {
  let body: { domain?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  if (!body.domain) return NextResponse.json({ error: "domain is required" }, { status: 400 })
  return NextResponse.json(analyzeDomain(body.domain))
}
