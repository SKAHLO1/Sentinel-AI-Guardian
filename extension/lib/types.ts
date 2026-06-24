// Shared types for the extension. Mirror the backend AnalysisResult shape.

export type Severity = "critical" | "high" | "medium" | "low" | "info"
export type Verdict = "safe" | "warning" | "danger"

export interface RiskSignal {
  id: string
  message: string
  severity: Severity
  weight: number
  category?: string
}

export interface ThreatMatch {
  type: string
  value: string
  label: string
  severity: Severity
  source: string
}

export interface AnalysisResult {
  riskScore: number
  verdict: Verdict
  label: string
  decoded: {
    selector: string
    signature: string | null
    name: string | null
    isUnlimitedApproval: boolean
    isApprovalForAll: boolean
    args: Record<string, string>
  } | null
  signals: RiskSignal[]
  threats: ThreatMatch[]
  recommendation: string
  summary: string
  analyzedAt: string
}

export interface DomainVerdict {
  domain: string
  verdict: Verdict
  score: number
  reasons: string[]
  impersonates?: string
  severity: Severity
}

export interface GuardianScan {
  threatScore: number
  status: "clear" | "warning" | "blocked"
  findings: { module: string; severity: string; message: string }[]
  scannedAt: string
}

// Risky RPC methods the interceptor pauses for review.
export const RISKY_METHODS = [
  "eth_sendTransaction",
  "eth_sign",
  "personal_sign",
  "eth_signTypedData",
  "eth_signTypedData_v3",
  "eth_signTypedData_v4",
] as const

export type RiskyMethod = (typeof RISKY_METHODS)[number]
