// Address-poisoning & clipboard-attack detection (Modules 10 & 11).

export interface AddressThreat {
  kind: "poisoning" | "clipboard-swap" | "known-scam" | "none"
  severity: "critical" | "high" | "medium" | "low" | "info"
  message: string
  similarity?: number
}

function isAddress(a: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(a.trim())
}

/** Count matching leading/trailing hex chars between two addresses. */
function affixMatch(a: string, b: string): { prefix: number; suffix: number } {
  const x = a.toLowerCase().replace(/^0x/, "")
  const y = b.toLowerCase().replace(/^0x/, "")
  let prefix = 0
  while (prefix < x.length && x[prefix] === y[prefix]) prefix++
  let suffix = 0
  while (suffix < x.length && x[x.length - 1 - suffix] === y[y.length - 1 - suffix]) suffix++
  return { prefix, suffix }
}

/**
 * Address poisoning: an attacker seeds your history with an address whose first
 * and last few characters match a real counterparty, hoping you copy the wrong
 * one. Flags candidates that share long affixes but are not identical.
 */
export function detectAddressPoisoning(candidate: string, knownGood: string[]): AddressThreat {
  if (!isAddress(candidate)) {
    return { kind: "none", severity: "info", message: "Not a valid address" }
  }
  for (const good of knownGood) {
    if (!isAddress(good)) continue
    if (good.toLowerCase() === candidate.toLowerCase()) continue
    const { prefix, suffix } = affixMatch(candidate, good)
    if (prefix >= 4 && suffix >= 4) {
      return {
        kind: "poisoning",
        severity: "high",
        message: `Address shares first ${prefix} and last ${suffix} characters with one of your known contacts but is NOT the same address. Classic address-poisoning lure — verify the full address.`,
        similarity: prefix + suffix,
      }
    }
  }
  return { kind: "none", severity: "info", message: "No poisoning lookalike detected" }
}

/**
 * Clipboard swap: malware replaces a copied address with the attacker's. If the
 * address the user *intended* differs from what is now on the clipboard, warn.
 */
export function detectClipboardSwap(intended: string, current: string): AddressThreat {
  if (!isAddress(current)) {
    return { kind: "none", severity: "info", message: "Clipboard does not contain an address" }
  }
  if (!isAddress(intended)) {
    return { kind: "none", severity: "info", message: "No intended address to compare" }
  }
  if (intended.toLowerCase() === current.toLowerCase()) {
    return { kind: "none", severity: "info", message: "Clipboard address is unchanged — safe" }
  }
  const { prefix, suffix } = affixMatch(intended, current)
  return {
    kind: "clipboard-swap",
    severity: "critical",
    message:
      prefix >= 3 || suffix >= 3
        ? "Clipboard address changed to a deceptive look-alike since you copied it. Possible clipboard-hijacking malware. Do NOT paste."
        : "Clipboard address differs from the one you copied. Possible clipboard hijacking. Do NOT paste.",
    similarity: prefix + suffix,
  }
}
