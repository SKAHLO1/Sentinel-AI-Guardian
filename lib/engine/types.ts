// Shared types for the SentinelAI Guardian engine.

export type Severity = "critical" | "high" | "medium" | "low" | "info"

export type Verdict = "safe" | "warning" | "danger"

export interface RiskSignal {
  id: string
  /** Human-readable warning shown in the UI. */
  message: string
  severity: Severity
  /** Weighted contribution to the 0-100 risk score. */
  weight: number
  /** Optional machine category for analytics. */
  category?: string
}

export interface DecodedCall {
  selector: string
  /** Canonical signature, e.g. "approve(address,uint256)". */
  signature: string | null
  /** Friendly name, e.g. "ERC-20 Approval". */
  name: string | null
  standard: "ERC-20" | "ERC-721" | "ERC-1155" | "Permit2" | "Unknown" | null
  args: Record<string, string>
  /** True when an approval grants effectively unlimited allowance. */
  isUnlimitedApproval: boolean
  /** True when the call is setApprovalForAll(operator,true). */
  isApprovalForAll: boolean
}

export interface AnalysisRequest {
  /** Hex calldata, e.g. 0x095ea7b3... */
  data?: string
  /** Destination contract address. */
  to?: string
  /** Sender / connected wallet. */
  from?: string
  /** Wei value as decimal or hex string. */
  value?: string
  /** Origin domain of the dApp requesting the signature. */
  domain?: string
  /** RPC method being intercepted. */
  method?:
    | "eth_sendTransaction"
    | "eth_sign"
    | "personal_sign"
    | "eth_signTypedData"
    | "eth_signTypedData_v3"
    | "eth_signTypedData_v4"
  /** Raw EIP-712 typed-data payload (string or object) for signature requests. */
  typedData?: unknown
  /** Optional contract reputation (verified source?) for the `to` address. */
  reputation?: { verified: boolean; name?: string }
  chainId?: number
}

export interface ThreatMatch {
  type: "address" | "domain" | "selector" | "bytecode"
  value: string
  label: string
  severity: Severity
  source: string
  reference?: string
}

export interface AnalysisResult {
  riskScore: number
  verdict: Verdict
  label: string
  decoded: DecodedCall | null
  signals: RiskSignal[]
  threats: ThreatMatch[]
  recommendation: string
  summary: string
  analyzedAt: string
}
