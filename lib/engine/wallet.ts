// Wallet Health & Approval types + scoring (Modules 3 & 12).
//
// No synthetic data lives here anymore. Real approvals come from Alchemy
// (see onchain.ts); this file only defines the shapes and the pure risk-scoring
// heuristic that runs over real on-chain approvals.

export interface Approval {
  id: string
  token: string
  tokenSymbol: string
  spender: string
  spenderLabel: string
  amount: "Unlimited" | string
  unlimited: boolean
  ageDays: number
  verified: boolean
  risk: "critical" | "high" | "medium" | "low"
  valueAtRisk: number
}

export interface WalletHealth {
  address: string
  healthScore: number // 0-100, higher = safer
  exposureScore: number // 0-100, higher = more exposed
  riskScore: number // 0-100, higher = riskier
  grade: "A" | "B" | "C" | "D" | "F"
  totalApprovals: number
  unlimitedApprovals: number
  riskyApprovals: number
  valueAtRisk: number
  tokenCount: number
  nftCount: number
}

/**
 * Pure wallet-health scoring over a set of (real) approvals. This is the actual
 * risk heuristic — exposure rises with unlimited + risky approvals, and health
 * is its inverse. Each factor is counted once to avoid compounding.
 */
export function computeWalletHealth(
  address: string,
  approvals: Approval[],
  opts: { tokenCount?: number; nftCount?: number } = {},
): WalletHealth {
  const unlimited = approvals.filter((a) => a.unlimited).length
  const critical = approvals.filter((a) => a.risk === "critical").length
  const risky = approvals.filter((a) => a.risk === "critical" || a.risk === "high").length
  const valueAtRisk = approvals.reduce((s, a) => s + a.valueAtRisk, 0)

  const exposure = Math.min(100, unlimited * 8 + risky * 11 + critical * 6)
  const riskScore = Math.min(100, critical * 22 + risky * 9 + unlimited * 4)
  const health =
    approvals.length === 0 ? 100 : Math.max(5, 100 - Math.round(exposure * 0.6) - critical * 8)

  const grade: WalletHealth["grade"] =
    health >= 90 ? "A" : health >= 75 ? "B" : health >= 55 ? "C" : health >= 35 ? "D" : "F"

  return {
    address,
    healthScore: Math.round(health),
    exposureScore: Math.round(exposure),
    riskScore: Math.round(riskScore),
    grade,
    totalApprovals: approvals.length,
    unlimitedApprovals: unlimited,
    riskyApprovals: risky,
    valueAtRisk,
    tokenCount: opts.tokenCount ?? 0,
    nftCount: opts.nftCount ?? 0,
  }
}
