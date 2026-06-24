// Real threat-intelligence feed (Modules 13 & 15).
//
// Pulls live, publicly-maintained blocklists instead of hardcoded data:
//   • MetaMask eth-phishing-detect — phishing domain blacklist (no key).
//   • ScamSniffer scam-database     — scam domains + addresses (no key).
//
// Results are cached in-memory with a TTL. A synchronous lookup surface
// (isPhishingDomain / isScamAddress) lets the rest of the engine consult the
// feed without becoming async.

import type { Severity } from "./types"

const SOURCES = {
  metamask: "https://raw.githubusercontent.com/MetaMask/eth-phishing-detect/master/src/config.json",
  scamsnifferDomains: "https://raw.githubusercontent.com/scamsniffer/scam-database/main/blacklist/domains.json",
  scamsnifferAddresses: "https://raw.githubusercontent.com/scamsniffer/scam-database/main/blacklist/address.json",
}

const TTL_MS = 6 * 60 * 60 * 1000 // 6 hours

export interface FeedThreat {
  id: string
  type: "Phishing Domain" | "Scam Address"
  value: string
  title: string
  severity: Severity
  source: string
  chain: string
}

interface FeedCache {
  phishingDomains: Set<string>
  scamAddresses: Set<string>
  feed: FeedThreat[]
  sources: string[]
  fetchedAt: number
}

let cache: FeedCache | null = null
let inflight: Promise<FeedCache> | null = null

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { accept: "application/json" } })
  if (!res.ok) throw new Error(`${url} -> ${res.status}`)
  return res.json()
}

function asStringArray(data: unknown): string[] {
  if (Array.isArray(data)) return data.filter((x): x is string => typeof x === "string")
  return []
}

async function load(): Promise<FeedCache> {
  const phishingDomains = new Set<string>()
  const scamAddresses = new Set<string>()
  const sources: string[] = []

  // MetaMask phishing blacklist.
  try {
    const cfg = (await fetchJson(SOURCES.metamask)) as { blacklist?: string[] }
    for (const d of cfg.blacklist ?? []) phishingDomains.add(d.toLowerCase())
    if (cfg.blacklist?.length) sources.push("MetaMask eth-phishing-detect")
  } catch {
    /* source optional */
  }

  // ScamSniffer scam domains.
  try {
    const domains = asStringArray(await fetchJson(SOURCES.scamsnifferDomains))
    for (const d of domains) phishingDomains.add(d.toLowerCase())
    if (domains.length) sources.push("ScamSniffer")
  } catch {
    /* source optional */
  }

  // ScamSniffer scam addresses.
  try {
    const addrs = asStringArray(await fetchJson(SOURCES.scamsnifferAddresses))
    for (const a of addrs) scamAddresses.add(a.toLowerCase())
  } catch {
    /* source optional */
  }

  cache = {
    phishingDomains,
    scamAddresses,
    sources,
    fetchedAt: Date.now(),
    feed: buildFeed(phishingDomains, scamAddresses, sources),
  }
  return cache
}

function buildFeed(domains: Set<string>, addresses: Set<string>, sources: string[]): FeedThreat[] {
  const src = sources[0] ?? "Threat Intelligence"
  const out: FeedThreat[] = []
  // Surface a sample of the most recent additions (lists append newest last).
  const domainList = [...domains].slice(-30).reverse()
  const addrList = [...addresses].slice(-15).reverse()
  domainList.forEach((d, i) =>
    out.push({ id: `d-${i}`, type: "Phishing Domain", value: d, title: d, severity: "critical", source: src, chain: "Multi" }),
  )
  addrList.forEach((a, i) =>
    out.push({ id: `a-${i}`, type: "Scam Address", value: a, title: `${a.slice(0, 10)}…${a.slice(-6)}`, severity: "high", source: "ScamSniffer", chain: "EVM" }),
  )
  return out
}

/** Ensure the feed is loaded and fresh; safe to call on every request. */
export async function ensureFeedLoaded(): Promise<FeedCache> {
  if (cache && Date.now() - cache.fetchedAt < TTL_MS) return cache
  if (inflight) return inflight
  inflight = load().finally(() => {
    inflight = null
  })
  return inflight
}

// Kick off an initial load so synchronous lookups warm up quickly.
void ensureFeedLoaded().catch(() => {})

function normHost(d: string): string {
  return d.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/:\d+$/, "")
}

/** Synchronous lookup against the cached phishing set (empty until first load). */
export function isPhishingDomain(host: string): boolean {
  if (!cache) return false
  const h = normHost(host)
  return cache.phishingDomains.has(h) || cache.phishingDomains.has(h.replace(/^www\./, ""))
}

export function isScamAddress(addr: string): boolean {
  if (!cache) return false
  return cache.scamAddresses.has(addr.trim().toLowerCase())
}

export function getFeed(): FeedThreat[] {
  return cache?.feed ?? []
}

export function searchFeed(query: string): FeedThreat[] {
  const q = query.trim().toLowerCase()
  if (!q || !cache) return []
  const hits: FeedThreat[] = []
  for (const d of cache.phishingDomains) {
    if (d.includes(q)) hits.push({ id: `d-${hits.length}`, type: "Phishing Domain", value: d, title: d, severity: "critical", source: cache.sources[0] ?? "feed", chain: "Multi" })
    if (hits.length >= 50) break
  }
  if (cache.scamAddresses.has(q)) {
    hits.unshift({ id: "a-exact", type: "Scam Address", value: q, title: q, severity: "high", source: "ScamSniffer", chain: "EVM" })
  }
  return hits
}

export function feedStats() {
  return {
    phishingDomains: cache?.phishingDomains.size ?? 0,
    scamAddresses: cache?.scamAddresses.size ?? 0,
    sources: cache?.sources ?? [],
    updatedAt: cache?.fetchedAt ?? null,
  }
}
