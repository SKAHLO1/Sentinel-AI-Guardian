// Website Protection / Domain engine (Module 7).
//
// Detects phishing via exact threat-DB match plus typosquatting against a list
// of known-good dApp domains using Levenshtein distance and homoglyph checks.

import type { Severity } from "./types"
import { KNOWN_GOOD_DOMAINS, lookupDomain } from "./threat-intel"
import { isPhishingDomain } from "./threat-feed"

export interface DomainVerdict {
  domain: string
  verdict: "safe" | "warning" | "danger"
  score: number // 0 (safe) - 100 (dangerous)
  reasons: string[]
  impersonates?: string
  severity: Severity
}

function normHost(d: string): string {
  return d
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
}

/** Classic Levenshtein edit distance. */
export function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const prev = new Array(n + 1)
  const curr = new Array(n + 1)
  for (let j = 0; j <= n; j++) prev[j] = j
  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j]
  }
  return prev[n]
}

// Characters frequently swapped in homoglyph / typosquat attacks.
const HOMOGLYPHS: Record<string, string> = {
  "0": "o",
  "1": "l",
  "5": "s",
  rn: "m",
  vv: "w",
}

function deHomoglyph(host: string): string {
  let out = host
  for (const [k, v] of Object.entries(HOMOGLYPHS)) {
    out = out.split(k).join(v)
  }
  return out
}

const SUSPICIOUS_TLDS = ["live", "xyz", "click", "gift", "claim", "support", "wtf", "top"]
const SCAM_KEYWORDS = ["airdrop", "claim", "giveaway", "bonus", "verify", "wallet-connect", "free-mint"]

/** Analyze a domain for phishing / typosquatting risk. */
export function analyzeDomain(input: string): DomainVerdict {
  const host = normHost(input)
  const reasons: string[] = []
  let score = 0
  let impersonates: string | undefined

  // 1. Exact known-good — short-circuit to safe.
  if (KNOWN_GOOD_DOMAINS.includes(host)) {
    return { domain: host, verdict: "safe", score: 0, reasons: ["Verified legitimate dApp domain"], severity: "info" }
  }

  // 2. Exact phishing hit — live feed (MetaMask / ScamSniffer) or static DB.
  if (isPhishingDomain(host)) {
    return { domain: host, verdict: "danger", score: 100, reasons: ["Listed on a live phishing blocklist (MetaMask / ScamSniffer)"], severity: "critical" }
  }
  const known = lookupDomain(host)
  if (known) {
    return { domain: host, verdict: "danger", score: 100, reasons: [known.label], severity: known.severity }
  }

  const base = host.replace(/^www\./, "")
  const label = base.split(".")[0] ?? base
  const tld = base.split(".").pop() ?? ""
  const normalized = deHomoglyph(base)

  // 3. Typosquat / homoglyph proximity to known-good domains.
  for (const good of KNOWN_GOOD_DOMAINS) {
    const goodBase = good.replace(/^app\./, "")
    const goodLabel = goodBase.split(".")[0]
    const dLabel = levenshtein(label, goodLabel)
    const dFull = levenshtein(normalized, goodBase)
    const looksLike = label.includes(goodLabel) && base !== good

    if (goodLabel.length > 3 && (dLabel > 0 && dLabel <= 2)) {
      score += 70
      impersonates = good
      reasons.push(`Name is ${dLabel} edit(s) from "${goodLabel}" — likely typosquat of ${good}`)
      break
    }
    if (deHomoglyph(label) === goodLabel && label !== goodLabel) {
      score += 75
      impersonates = good
      reasons.push(`Homoglyph spoof of "${goodLabel}" (e.g. 0→o, 1→l)`)
      break
    }
    if (looksLike) {
      score += 55
      impersonates = good
      reasons.push(`Contains brand "${goodLabel}" on a non-official domain`)
      break
    }
    if (dFull <= 2 && goodBase.length > 6) {
      score += 40
      impersonates = good
      reasons.push(`Overall domain is suspiciously close to ${good}`)
      break
    }
  }

  // 4. Scam keyword + brand combination.
  for (const kw of SCAM_KEYWORDS) {
    if (base.includes(kw)) {
      score += 25
      reasons.push(`Contains scam-associated keyword "${kw}"`)
      break
    }
  }

  // 5. Suspicious TLD raises baseline.
  if (SUSPICIOUS_TLDS.includes(tld)) {
    score += 15
    reasons.push(`Uses high-abuse TLD ".${tld}"`)
  }

  // 6. Excessive hyphens / digits — common in throwaway phishing domains.
  const hyphens = (base.match(/-/g) || []).length
  if (hyphens >= 2) {
    score += 10
    reasons.push("Multiple hyphens — pattern common in disposable phishing domains")
  }

  score = Math.min(100, score)
  const verdict: DomainVerdict["verdict"] = score >= 60 ? "danger" : score >= 25 ? "warning" : "safe"
  const severity: Severity = score >= 60 ? "critical" : score >= 25 ? "medium" : "info"
  if (reasons.length === 0) reasons.push("No known threat signals — domain not on allowlist, verify carefully")

  return { domain: host, verdict, score, reasons, impersonates, severity }
}
