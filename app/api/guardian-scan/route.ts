import { NextRequest, NextResponse } from "next/server"
import { analyzeTransaction } from "@/lib/engine/risk"
import { analyzeDomain } from "@/lib/engine/domains"
import { detectAddressPoisoning, detectClipboardSwap } from "@/lib/engine/address"
import type { AnalysisRequest } from "@/lib/engine/types"
import { enforceRateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const maxDuration = 30

interface GuardianScanRequest extends AnalysisRequest {
  clipboard?: { intended?: string; current?: string }
  knownContacts?: string[]
  candidateAddress?: string
  address?: string
}

// POST /api/guardian-scan — the always-on background scanner (Module 10).
// Aggregates transaction, domain, clipboard and address-poisoning checks into a
// single threat-score the extension service worker can poll.
export async function POST(req: NextRequest) {
  const limited = await enforceRateLimit(req, "guardian-scan", 120, 60)
  if (limited) return limited
  let body: GuardianScanRequest = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  // Warm the live blocklists so domain checks use real threat intel.
  const { ensureFeedLoaded } = await import("@/lib/engine/threat-feed")
  await ensureFeedLoaded()

  const findings: { module: string; severity: string; message: string }[] = []
  let maxScore = 0

  if (body.data || body.method) {
    const tx = analyzeTransaction(body)
    maxScore = Math.max(maxScore, tx.riskScore)
    for (const s of tx.signals) findings.push({ module: "transaction", severity: s.severity, message: s.message })
  }

  if (body.domain) {
    const dom = analyzeDomain(body.domain)
    maxScore = Math.max(maxScore, dom.score)
    if (dom.verdict !== "safe") findings.push({ module: "website", severity: dom.severity, message: dom.reasons[0] })
  }

  if (body.clipboard?.intended && body.clipboard?.current) {
    const clip = detectClipboardSwap(body.clipboard.intended, body.clipboard.current)
    if (clip.kind !== "none") {
      maxScore = Math.max(maxScore, clip.severity === "critical" ? 95 : 70)
      findings.push({ module: "clipboard", severity: clip.severity, message: clip.message })
    }
  }

  if (body.candidateAddress && body.knownContacts?.length) {
    const pois = detectAddressPoisoning(body.candidateAddress, body.knownContacts)
    if (pois.kind !== "none") {
      maxScore = Math.max(maxScore, 75)
      findings.push({ module: "address-poisoning", severity: pois.severity, message: pois.message })
    }
  }

  const status = maxScore >= 66 ? "blocked" : maxScore >= 33 ? "warning" : "clear"

  // Persist only real findings (warning/blocked) so history isn't noisy.
  if (body.address && status !== "clear") {
    const { putScanEvent, toScanEvent } = await import("@/lib/engine/db")
    void putScanEvent(
      body.address,
      toScanEvent("guardian", {
        riskScore: maxScore,
        verdict: status === "blocked" ? "danger" : "warning",
        label: status === "blocked" ? "Threat Blocked" : "Caution",
        domain: body.domain,
        summary: findings[0]?.message,
        signals: findings.map((f) => ({ severity: f.severity, message: f.message })),
      }),
    ).catch(() => {})
  }

  return NextResponse.json({
    threatScore: maxScore,
    status,
    findings,
    scannedAt: new Date().toISOString(),
  })
}
