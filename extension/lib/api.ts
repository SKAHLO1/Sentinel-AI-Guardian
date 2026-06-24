// Backend client for the extension. Points at the SentinelAI Guardian API
// (the Next.js app, or an API Gateway URL in production).

import type { AnalysisResult, DomainVerdict, GuardianScan } from "./types"

// Configure via .env: PLASMO_PUBLIC_API_URL=https://api.your-deploy.com
export const API_BASE =
  process.env.PLASMO_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:3000"

async function post<T>(path: string, body: unknown, timeoutMs = 12000): Promise<T> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${API_BASE}/api${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`${path} -> ${res.status}`)
    return (await res.json()) as T
  } finally {
    clearTimeout(t)
  }
}

async function get<T>(path: string, timeoutMs = 12000): Promise<T> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${API_BASE}/api${path}`, { signal: controller.signal })
    if (!res.ok) throw new Error(`${path} -> ${res.status}`)
    return (await res.json()) as T
  } finally {
    clearTimeout(t)
  }
}

export const guardianApi = {
  analyze: (body: { data?: string; to?: string; from?: string; domain?: string; method?: string; address?: string }) =>
    post<AnalysisResult>("/analyze", body),
  guardianScan: (body: {
    domain?: string
    data?: string
    method?: string
    clipboard?: { intended?: string; current?: string }
    candidateAddress?: string
    knownContacts?: string[]
    address?: string
  }) => post<GuardianScan>("/guardian-scan", body, 20000),
  // AI calls (Bedrock) can take 10-20s — give them a generous timeout.
  copilot: (body: { message: string; data?: string; domain?: string }) =>
    post<{ answer: string; backend: string }>("/copilot", body, 35000),
  decode: (body: { data: string; to?: string; value?: string; chainId?: number }) =>
    post<{ decode: string; signatures: string[]; backend: string; selector: string | null }>("/decode", body, 35000),
  domain: (domain: string) => get<DomainVerdict>(`/domains?domain=${encodeURIComponent(domain)}`),
  health: () => get<{ status: string; aiBackend: string }>("/health"),
  // Live (real on-chain) wallet health for a connected address via Alchemy.
  walletLive: (address: string) =>
    get<{
      configured: boolean
      connected?: boolean
      healthScore?: number
      grade?: string
      exposureScore?: number
      riskScore?: number
      totalApprovals?: number
      unlimitedApprovals?: number
      riskyApprovals?: number
      tokenCount?: number
      error?: string
    }>(`/wallet?live=1&address=${address}`),
  approvalsLive: (address: string) =>
    get<{
      configured: boolean
      connected?: boolean
      error?: string
      approvals: { id: string; tokenSymbol: string; spenderLabel: string; amount: string; risk: string; unlimited: boolean; verified: boolean }[]
    }>(`/approvals?live=1&address=${address}`),
  threats: () =>
    get<{ threats: { id: string; type: string; title: string; severity: string; detectedAt: string }[] }>("/threats"),
}

/** Ask the background worker for the connected wallet address. */
export async function getConnectedAddress(): Promise<string | null> {
  try {
    const res = (await chrome.runtime.sendMessage({ type: "getAccount" })) as { address: string | null }
    return res?.address ?? null
  } catch {
    return null
  }
}

/** Trigger the wallet connect prompt on the active dApp tab. */
export async function connectWallet(): Promise<{ address?: string; error?: string }> {
  try {
    return (await chrome.runtime.sendMessage({ type: "connectWallet" })) as { address?: string; error?: string }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function disconnectWallet(): Promise<void> {
  try {
    await chrome.runtime.sendMessage({ type: "disconnectWallet" })
  } catch {
    /* ignore */
  }
}
