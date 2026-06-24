import { NextRequest, NextResponse } from "next/server"
import { ensureFeedLoaded, getFeed, searchFeed, feedStats } from "@/lib/engine/threat-feed"

// GET /api/threats?q=... — real threat feed from live blocklists (Modules 13/15).
export async function GET(req: NextRequest) {
  await ensureFeedLoaded()
  const q = req.nextUrl.searchParams.get("q")?.trim()
  if (q) {
    return NextResponse.json({ query: q, results: searchFeed(q), stats: feedStats() })
  }
  return NextResponse.json({ threats: getFeed(), stats: feedStats() })
}
