// Tiny typed client for the SentinelAI Guardian API routes.

import type { SimulationReport } from "./engine/simulate"
import type { AnalysisResult } from "./engine/types"
import type { DomainVerdict } from "./engine/domains"
import type { Approval, WalletHealth } from "./engine/wallet"
import type { FeedThreat } from "./engine/threat-feed"

// Live wallet/approvals responses carry honest configuration flags.
export interface LiveWallet extends Partial<WalletHealth> {
  configured: boolean
  connected?: boolean
  reason?: string
  error?: string
}
export interface LiveApprovals {
  configured: boolean
  connected?: boolean
  reason?: string
  error?: string
  approvals: Approval[]
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${url} -> ${res.status}`)
  return res.json() as Promise<T>
}

async function put<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${url} -> ${res.status}`)
  return res.json() as Promise<T>
}

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} -> ${res.status}`)
  return res.json() as Promise<T>
}

export interface UserSettings {
  toggles?: Record<string, boolean>
  profile?: { email?: string; name?: string }
}

export const api = {
  analyze: (body: { data?: string; to?: string; domain?: string; address?: string }) =>
    post<AnalysisResult>("/api/analyze", body),
  simulate: (body: { data?: string; to?: string; from?: string; domain?: string; address?: string; chainId?: number }) =>
    post<SimulationReport>("/api/simulate", body),
  simulateSample: () => get<SimulationReport>("/api/simulate"),
  copilot: (body: { message: string; data?: string; domain?: string; walletAddress?: string }) =>
    post<{ answer: string; backend: string }>("/api/copilot", body),
  decode: (body: { data: string; to?: string; value?: string; chainId?: number }) =>
    post<{ decode: string; signatures: string[]; backend: string; selector: string | null }>("/api/decode", body),
  // Real on-chain wallet health for a connected address (via Alchemy).
  wallet: (address: string, chainId?: number) =>
    get<LiveWallet>(`/api/wallet?address=${address}${chainId ? `&chainId=${chainId}` : ""}`),
  approvals: (address: string, chainId?: number) =>
    get<LiveApprovals>(`/api/approvals?address=${address}${chainId ? `&chainId=${chainId}` : ""}`),
  revoke: (body: { token?: string; spender: string }) =>
    post<{ revoked: boolean; calldata: string }>("/api/approvals", body),
  threats: () => get<{ threats: FeedThreat[]; stats: FeedStats }>("/api/threats"),
  searchThreats: (q: string) =>
    get<{ results: FeedThreat[]; stats: FeedStats }>(`/api/threats?q=${encodeURIComponent(q)}`),
  domain: (domain: string) => get<DomainVerdict>(`/api/domains?domain=${encodeURIComponent(domain)}`),
  // Contract reputation (Etherscan V2) for a contract on a given chain.
  reputation: (address: string, chainId?: number) =>
    get<{ configured: boolean; verified: boolean; name?: string; address: string; chainId: number }>(
      `/api/reputation?address=${address}${chainId ? `&chainId=${chainId}` : ""}`,
    ),
  // Submit a crowdsourced threat report.
  report: (body: { type: "domain" | "address"; value: string; reason?: string }) =>
    post<{ recorded: boolean; reason?: string }>("/api/report", body),
  // Cross-device settings persisted in DynamoDB, keyed by wallet address.
  getSettings: (address: string) =>
    get<{ configured: boolean; settings: UserSettings | null }>(`/api/settings?address=${address}`),
  saveSettings: (address: string, settings: UserSettings) =>
    put<{ saved: boolean; reason?: string }>("/api/settings", { address, settings }),
  // Recall a wallet's stored scan/threat history from DynamoDB.
  history: (address: string, type?: "scan" | "threat") =>
    get<LiveHistory>(`/api/history?address=${address}${type ? `&type=${type}` : ""}`),
}

export interface ScanEvent {
  id: string
  entity: "scan" | "threat"
  kind: "transaction" | "domain" | "guardian"
  riskScore: number
  verdict: "safe" | "warning" | "danger"
  label?: string
  domain?: string
  to?: string
  summary?: string
  signals?: { severity: string; message: string }[]
  createdAt: string
}
export interface LiveHistory {
  configured: boolean
  connected?: boolean
  error?: string
  events: ScanEvent[]
}

export interface FeedStats {
  phishingDomains: number
  scamAddresses: number
  sources: string[]
  updatedAt: number | null
}

export type { SimulationReport, AnalysisResult, DomainVerdict, Approval, WalletHealth, FeedThreat }
