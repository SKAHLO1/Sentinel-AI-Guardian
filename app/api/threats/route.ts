import { NextRequest, NextResponse } from "next/server"
import { ensureFeedLoaded, getFeed, searchFeed, feedStats, type FeedThreat } from "@/lib/engine/threat-feed"
import { getReports } from "@/lib/engine/db"

// GET /api/threats?q=... — real threat feed from live blocklists (Modules 13/15).
export async function GET(req: NextRequest) {
  await ensureFeedLoaded()
  const q = req.nextUrl.searchParams.get("q")?.trim()
  if (q) {
    return NextResponse.json({ query: q, results: searchFeed(q), stats: feedStats() })
  }

  // Surface community reports at the top of the feed (immediate, pre-refresh).
  const reports = await getReports(20).catch(() => [])
  const reported: FeedThreat[] = reports.map((r, i) => ({
    id: `report-${i}`,
    type: r.type === "domain" ? "Phishing Domain" : "Scam Address",
    value: r.value,
    title: r.value,
    severity: "high",
    source: `Community (${r.count}×)`,
    chain: r.type === "domain" ? "Multi" : "EVM",
  }))

  return NextResponse.json({ threats: [...reported, ...getFeed()], stats: feedStats() })
}
