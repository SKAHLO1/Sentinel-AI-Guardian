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
  analyze: (body: { data?: string; to?: string; from?: string; domain?: string; method?: string; address?: string; typedData?: unknown; chainId?: number }) =>
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
  token: (address: string, chainId?: number) =>
    get<{ configured: boolean; symbol?: string; name?: string; decimals: number }>(
      `/token?address=${address}${chainId ? `&chainId=${chainId}` : ""}`,
    ),
  simulate: (body: { data?: string; to?: string; from?: string; value?: string; chainId?: number; address?: string }) =>
    post<{ live?: boolean; assetChanges: { direction: string; asset: string; amount: string; note: string }[] }>(
      "/simulate",
      body,
      20000,
    ),
  domain: (domain: string) => get<DomainVerdict>(`/domains?domain=${encodeURIComponent(domain)}`),
  health: () => get<{ status: string; aiBackend: string }>("/health"),
  // Live (real on-chain) wallet health for a connected address via Alchemy.
  walletLive: (address: string, chainId?: number) =>
    get<{
      configured: boolean
      connected?: boolean
      chainId?: number
      healthScore?: number
      grade?: string
      exposureScore?: number
      riskScore?: number
      totalApprovals?: number
      unlimitedApprovals?: number
      riskyApprovals?: number
      tokenCount?: number
      error?: string
    }>(`/wallet?address=${address}${chainId ? `&chainId=${chainId}` : ""}`),
  approvalsLive: (address: string, chainId?: number) =>
    get<{
      configured: boolean
      connected?: boolean
      error?: string
      approvals: { id: string; tokenSymbol: string; spenderLabel: string; amount: string; risk: string; unlimited: boolean; verified: boolean }[]
    }>(`/approvals?address=${address}${chainId ? `&chainId=${chainId}` : ""}`),
  threats: () =>
    get<{ threats: { id: string; type: string; title: string; severity: string; detectedAt: string }[] }>("/threats"),
  report: (body: { type: "domain" | "address"; value: string; reason?: string }) =>
    post<{ recorded: boolean }>("/report", body),
}

/** Ask the background worker for the connected wallet address + chain. */
export async function getConnectedWallet(): Promise<{ address: string | null; chainId: number | null }> {
  try {
    const res = (await chrome.runtime.sendMessage({ type: "getAccount" })) as {
      address: string | null
      chainId: number | null
    }
    return { address: res?.address ?? null, chainId: res?.chainId ?? null }
  } catch {
    return { address: null, chainId: null }
  }
}

/** Back-compat helper returning just the address. */
export async function getConnectedAddress(): Promise<string | null> {
  return (await getConnectedWallet()).address
}

/** Trigger the wallet connect prompt on the active dApp tab. */
export async function connectWallet(): Promise<{ address?: string; chainId?: number; error?: string }> {
  try {
    return (await chrome.runtime.sendMessage({ type: "connectWallet" })) as {
      address?: string
      chainId?: number
      error?: string
    }
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
