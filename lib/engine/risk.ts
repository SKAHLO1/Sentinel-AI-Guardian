// Risk Engine (Module 3 / 6 core). Aggregates signals from the decoder, threat
// intel, and domain engine into a single 0-100 score, verdict, and signal list.

import type {
  AnalysisRequest,
  AnalysisResult,
  RiskSignal,
  ThreatMatch,
  Verdict,
} from "./types"
import { decodeCalldata, shortenAddress } from "./calldata"
import { lookupAddress, lookupSelector, lookupDomain } from "./threat-intel"
import { analyzeDomain } from "./domains"

const SEVERITY_BASE: Record<RiskSignal["severity"], number> = {
  critical: 45,
  high: 30,
  medium: 14,
  low: 6,
  info: 0,
}

function verdictFor(score: number): { verdict: Verdict; label: string } {
  if (score >= 66) return { verdict: "danger", label: "High Risk" }
  if (score >= 33) return { verdict: "warning", label: "Caution" }
  return { verdict: "safe", label: "Looks Safe" }
}

/**
 * Score signals using a saturating sum so multiple high-severity issues push
 * toward (but never exceed) 100, and a single info-level call stays near 0.
 */
function scoreSignals(signals: RiskSignal[]): number {
  let acc = 0
  // Sort so the heaviest signals contribute their full weight first; later
  // signals contribute with diminishing returns.
  const sorted = [...signals].sort((a, b) => b.weight - a.weight)
  let damp = 1
  for (const s of sorted) {
    acc += s.weight * damp
    damp *= 0.9
  }
  return Math.max(0, Math.min(100, Math.round(acc)))
}

export function analyzeTransaction(req: AnalysisRequest): AnalysisResult {
  const signals: RiskSignal[] = []
  const threats: ThreatMatch[] = []
  const decoded = decodeCalldata(req.data)

  // --- Decoder-derived signals -------------------------------------------
  if (decoded) {
    if (decoded.isUnlimitedApproval) {
      signals.push({
        id: "unlimited-approval",
        message: "Unlimited token approval — the spender can move your full balance with no cap",
        severity: "critical",
        weight: SEVERITY_BASE.critical,
        category: "approval",
      })
    } else if (decoded.signature?.startsWith("approve") || decoded.name?.includes("Approval")) {
      signals.push({
        id: "approval",
        message: `Token approval to ${decoded.args.spenderShort ?? "a spender"} — grants spending permission`,
        severity: "medium",
        weight: SEVERITY_BASE.medium,
        category: "approval",
      })
    }

    if (decoded.isApprovalForAll) {
      signals.push({
        id: "approval-for-all",
        message: "setApprovalForAll(true) — grants control over ALL NFTs in this collection",
        severity: "high",
        weight: SEVERITY_BASE.high,
        category: "approval",
      })
    }

    if (decoded.standard === "Unknown" && decoded.signature === null) {
      signals.push({
        id: "unknown-selector",
        message: `Unrecognized function selector ${decoded.selector} — calldata could not be decoded (blind signing risk)`,
        severity: "medium",
        weight: SEVERITY_BASE.medium,
        category: "blind-signing",
      })
    }

    // Selector-level threat-intel match.
    const selHit = lookupSelector(decoded.selector)
    if (selHit) {
      threats.push(selHit)
      signals.push({
        id: "selector-threat",
        message: selHit.label,
        severity: selHit.severity,
        weight: SEVERITY_BASE[selHit.severity],
        category: "threat-intel",
      })
    }
  } else if (req.data && req.data !== "0x") {
    signals.push({
      id: "undecodable",
      message: "Calldata present but not parseable — high blind-signing risk",
      severity: "high",
      weight: SEVERITY_BASE.high,
      category: "blind-signing",
    })
  }

  // --- Signature-method signals ------------------------------------------
  if (req.method === "eth_sign") {
    signals.push({
      id: "eth-sign",
      message: "eth_sign requested — can sign arbitrary data including transactions. Almost always malicious.",
      severity: "critical",
      // Dedicated high weight: a blind eth_sign request alone is danger-level.
      weight: 72,
      category: "signing",
    })
  }
  if (req.method === "eth_signTypedData" || req.method === "eth_signTypedData_v4") {
    signals.push({
      id: "typed-data",
      message: "Off-chain typed-data signature — may be a Permit/Permit2 approval that grants token access without an on-chain tx",
      severity: "medium",
      weight: SEVERITY_BASE.medium,
      category: "signing",
    })
  }

  // --- Address threat intel ----------------------------------------------
  for (const addr of [req.to, decoded?.args.spender, decoded?.args.operator].filter(Boolean) as string[]) {
    const hit = lookupAddress(addr)
    if (hit && !threats.find((t) => t.value === hit.value)) {
      threats.push(hit)
      signals.push({
        id: `addr-threat-${hit.value.slice(-6)}`,
        message: `${hit.label} (${shortenAddress(hit.value)})`,
        severity: hit.severity,
        weight: SEVERITY_BASE[hit.severity],
        category: "threat-intel",
      })
    }
  }

  // --- Domain protection --------------------------------------------------
  if (req.domain) {
    const known = lookupDomain(req.domain)
    if (known) {
      threats.push(known)
      signals.push({
        id: "domain-phishing",
        message: `Origin "${req.domain}" is a known phishing site: ${known.label}`,
        severity: "critical",
        weight: SEVERITY_BASE.critical,
        category: "phishing",
      })
    } else {
      const dom = analyzeDomain(req.domain)
      if (dom.verdict !== "safe") {
        signals.push({
          id: "domain-suspicious",
          message: `Origin domain risk: ${dom.reasons[0]}`,
          severity: dom.severity,
          weight: SEVERITY_BASE[dom.severity],
          category: "phishing",
        })
      }
    }
  }

  const score = scoreSignals(signals)
  const { verdict, label } = verdictFor(score)

  const recommendation =
    verdict === "danger"
      ? "Reject this transaction. Multiple high-severity threat signals were detected."
      : verdict === "warning"
        ? "Proceed only if you fully understand and trust this action. Consider setting a spending cap."
        : "No major threats detected. Always verify the recipient and amount before signing."

  const summary = buildSummary(decoded, signals, verdict)

  return {
    riskScore: score,
    verdict,
    label,
    decoded,
    signals: signals.sort((a, b) => b.weight - a.weight),
    threats,
    recommendation,
    summary,
    analyzedAt: new Date().toISOString(),
  }
}

function buildSummary(
  decoded: AnalysisResult["decoded"],
  signals: RiskSignal[],
  verdict: Verdict,
): string {
  if (signals.length === 0) {
    return "This call decodes cleanly with no threat-intelligence matches and no dangerous approval patterns."
  }
  const action = decoded?.name ?? "This transaction"
  const top = signals[0]?.message ?? "elevated risk signals"
  const lead =
    verdict === "danger"
      ? "This transaction is dangerous."
      : verdict === "warning"
        ? "This transaction needs caution."
        : "This transaction looks safe."
  return `${lead} ${action} triggered ${signals.length} signal(s); the most severe is: ${top}.`
}
