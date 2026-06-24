import { NextRequest, NextResponse } from "next/server"
import { analyzeTransaction } from "@/lib/engine/risk"
import type { AnalysisRequest } from "@/lib/engine/types"
import { putScanEvent, toScanEvent } from "@/lib/engine/db"
import { enforceRateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const maxDuration = 30

// POST /api/analyze — run the Guardian risk engine over a transaction.
// When an `address` (or `from`) is supplied, the result is persisted to
// DynamoDB so it can be recalled as scan history.
export async function POST(req: NextRequest) {
  const limited = await enforceRateLimit(req, "analyze", 120, 60)
  if (limited) return limited
  let body: AnalysisRequest & { address?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  const result = analyzeTransaction(body)

  const address = body.address || body.from
  if (address) {
    // Fire-and-forget so persistence never delays the security response.
    void putScanEvent(
      address,
      toScanEvent("transaction", {
        riskScore: result.riskScore,
        verdict: result.verdict,
        label: result.label,
        domain: body.domain,
        to: body.to,
        summary: result.summary,
        signals: result.signals.map((s) => ({ severity: s.severity, message: s.message })),
      }),
    ).catch(() => {})
  }

  return NextResponse.json(result)
}
