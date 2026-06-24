import { NextRequest, NextResponse } from "next/server"
import { simulate } from "@/lib/engine/simulate"
import type { AnalysisRequest } from "@/lib/engine/types"
import { putScanEvent, toScanEvent } from "@/lib/engine/db"

// Sample calldata used when the simulator loads with no input (an unlimited
// USDC approval to an unverified contract — the canonical drainer pattern).
const SAMPLE: AnalysisRequest = {
  data: "0x095ea7b3000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25effffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
  to: "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
  from: "0x3f4a000000000000000000000000000000008b2c",
  domain: "uniswap-v3.app",
}

// POST /api/simulate — full simulation report. Empty body falls back to SAMPLE.
export async function POST(req: NextRequest) {
  let body: AnalysisRequest & { address?: string } = {}
  try {
    body = await req.json()
  } catch {
    /* empty body allowed */
  }
  const request = body.data ? body : SAMPLE
  const report = simulate(request)

  if (body.address) {
    void putScanEvent(
      body.address,
      toScanEvent("transaction", {
        riskScore: report.risk.riskScore,
        verdict: report.risk.verdict,
        label: report.risk.label,
        to: report.to,
        summary: report.risk.summary,
        signals: report.risk.signals.map((s) => ({ severity: s.severity, message: s.message })),
      }),
    ).catch(() => {})
  }

  return NextResponse.json(report)
}

// GET returns the sample simulation so the page can render on first paint.
export async function GET() {
  return NextResponse.json(simulate(SAMPLE))
}
