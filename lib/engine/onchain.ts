// Real on-chain data via Alchemy (Module 3/4 data source).
//
// Fetches genuine ERC-20 allowances and NFT operator approvals for a wallet by
// reading Approval / ApprovalForAll logs and the *current* on-chain allowance.
// The Alchemy key lives only here on the server — never in the extension.

import type { Approval, WalletHealth } from "./wallet"
import { computeWalletHealth } from "./wallet"
import { lookupAddress } from "./threat-intel"

// keccak256("Approval(address,address,uint256)") — shared by ERC-20 & ERC-721.
const APPROVAL_TOPIC = "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925"
// keccak256("ApprovalForAll(address,address,bool)")
const APPROVAL_FOR_ALL_TOPIC = "0x17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31"

const ALLOWANCE_SELECTOR = "0xdd62ed3e" // allowance(address,address)
const IS_APPROVED_FOR_ALL_SELECTOR = "0xe985e9c5" // isApprovedForAll(address,address)

const UNLIMITED_THRESHOLD = BigInt("0xffffffffffffffffffffffffffffffff")
const BLOCKS_PER_DAY = 7150

// Well-known, audited spenders. Anything not here is treated as unverified.
const KNOWN_SPENDERS: Record<string, string> = {
  "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45": "Uniswap V3 Router",
  "0xe592427a0aece92de3edee1f18e0157c05861564": "Uniswap V3 Router",
  "0x66a9893cc07d91d95644aedd05d03f95e1dba8af": "Uniswap V4 Router",
  "0x1111111254eeb25477b68fb85ed929f73a960582": "1inch Router",
  "0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2": "Aave V3 Pool",
  "0x00000000000000adc04c56bf30ac9d3c0aaf14dc": "OpenSea Seaport",
  "0x000000000022d473030f116ddee9f6b43ac78ba3": "Uniswap Permit2",
  "0xdef1c0ded9bec7f1a1670819833240f027b25eff": "0x Exchange Proxy",
}

export function isOnchainConfigured(): boolean {
  return Boolean(process.env.ALCHEMY_API_KEY)
}

function rpcUrl(): string {
  const key = process.env.ALCHEMY_API_KEY
  const network = process.env.ALCHEMY_NETWORK || "eth-mainnet"
  return `https://${network}.g.alchemy.com/v2/${key}`
}

let rpcId = 1
async function rpc<T = any>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(rpcUrl(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: rpcId++, method, params }),
  })
  if (!res.ok) throw new Error(`Alchemy ${method} -> ${res.status}`)
  const json = await res.json()
  if (json.error) throw new Error(`Alchemy ${method}: ${json.error.message}`)
  return json.result as T
}

function pad32(addr: string): string {
  return addr.toLowerCase().replace(/^0x/, "").padStart(64, "0")
}
function topicAddr(topic: string): string {
  return "0x" + topic.slice(-40)
}
function isAddress(a?: string): a is string {
  return Boolean(a && /^0x[0-9a-fA-F]{40}$/.test(a))
}

interface TokenMeta {
  symbol: string
  name: string
  decimals: number
}
const metaCache = new Map<string, TokenMeta>()
async function tokenMeta(contract: string): Promise<TokenMeta> {
  const key = contract.toLowerCase()
  if (metaCache.has(key)) return metaCache.get(key)!
  try {
    const m = await rpc<TokenMeta>("alchemy_getTokenMetadata", [contract])
    const meta = { symbol: m.symbol || "?", name: m.name || "Unknown Token", decimals: m.decimals ?? 18 }
    metaCache.set(key, meta)
    return meta
  } catch {
    const meta = { symbol: "?", name: "Unknown Token", decimals: 18 }
    metaCache.set(key, meta)
    return meta
  }
}

/** Bounded-concurrency map to stay within Alchemy rate limits. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = []
  let i = 0
  const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (i < items.length) {
      const idx = i++
      out[idx] = await fn(items[idx])
    }
  })
  await Promise.all(workers)
  return out
}

// The ERC-20 contracts a wallet currently holds (Alchemy enhanced API).
async function getErc20Contracts(owner: string): Promise<string[]> {
  try {
    const res = await rpc<{ tokenBalances: { contractAddress: string; tokenBalance: string }[] }>(
      "alchemy_getTokenBalances",
      [owner, "erc20"],
    )
    return res.tokenBalances.map((t) => t.contractAddress.toLowerCase())
  } catch {
    return []
  }
}

// The NFT contracts a wallet holds (Alchemy NFT API — separate base path).
async function getNftContracts(owner: string): Promise<string[]> {
  try {
    const key = process.env.ALCHEMY_API_KEY
    const network = process.env.ALCHEMY_NETWORK || "eth-mainnet"
    const url = `https://${network}.g.alchemy.com/nft/v3/${key}/getContractsForOwner?owner=${owner}&pageSize=100`
    const res = await fetch(url)
    if (!res.ok) return []
    const json = (await res.json()) as { contracts?: { address: string }[] }
    return (json.contracts ?? []).map((c) => c.address.toLowerCase())
  } catch {
    return []
  }
}

// Approval logs for ONE contract (address-scoped → Alchemy allows full history).
async function logsForContract(
  contract: string,
  topic0: string,
  ownerTopic: string,
): Promise<{ address: string; spender: string; block: number }[]> {
  try {
    const logs: any[] = await rpc("eth_getLogs", [
      { address: contract, fromBlock: "0x0", toBlock: "latest", topics: [topic0, ownerTopic] },
    ])
    return logs.map((l: any) => ({
      address: contract,
      spender: topicAddr(l.topics[2]).toLowerCase(),
      block: parseInt(l.blockNumber, 16),
    }))
  } catch {
    return []
  }
}

function classify(spender: string, unlimited: boolean, ageDays: number, verified: boolean): Approval["risk"] {
  if (lookupAddress(spender)) return "critical"
  if (!verified && unlimited) return "critical"
  if (!verified || (unlimited && ageDays > 180)) return "high"
  if (unlimited) return "medium"
  return "low"
}

/** Real ERC-20 + NFT operator approvals for an address. */
export async function getApprovalsLive(address: string): Promise<Approval[]> {
  if (!isAddress(address)) throw new Error("invalid address")
  const ownerTopic = "0x" + pad32(address)

  // Discover the wallet's token & NFT contracts, then scan each contract's
  // approval logs individually (address-scoped queries are allowed full-range).
  const [latest, erc20Contracts, nftContracts] = await Promise.all([
    rpc<string>("eth_blockNumber", []).then((h) => parseInt(h, 16)),
    getErc20Contracts(address),
    getNftContracts(address),
  ])

  const erc20Logs = (
    await mapLimit(erc20Contracts.slice(0, 80), 6, (c) => logsForContract(c, APPROVAL_TOPIC, ownerTopic))
  ).flat()
  const nftLogs = (
    await mapLimit(nftContracts.slice(0, 60), 6, (c) => logsForContract(c, APPROVAL_FOR_ALL_TOPIC, ownerTopic))
  ).flat()

  // Dedup to the latest log per (contract, spender).
  const latestByPair = new Map<string, { address: string; spender: string; block: number; kind: "erc20" | "nft" }>()
  for (const l of erc20Logs) {
    const k = `${l.address}:${l.spender}`
    if (!latestByPair.has(k) || latestByPair.get(k)!.block < l.block) latestByPair.set(k, { ...l, kind: "erc20" })
  }
  for (const l of nftLogs) {
    const k = `${l.address}:${l.spender}`
    if (!latestByPair.has(k) || latestByPair.get(k)!.block < l.block) latestByPair.set(k, { ...l, kind: "nft" })
  }

  const pairs = [...latestByPair.values()]
  const approvals = await mapLimit(pairs, 8, async (p): Promise<Approval | null> => {
    try {
      if (p.kind === "erc20") {
        // Read current allowance(owner, spender).
        const data = ALLOWANCE_SELECTOR + pad32(address) + pad32(p.spender)
        const raw = await rpc<string>("eth_call", [{ to: p.address, data }, "latest"])
        const allowance = BigInt(raw === "0x" ? "0x0" : raw)
        if (allowance === 0n) return null // revoked / spent — not a live approval
        const meta = await tokenMeta(p.address)
        const unlimited = allowance >= UNLIMITED_THRESHOLD
        const ageDays = Math.max(0, Math.floor((latest - p.block) / BLOCKS_PER_DAY))
        const verified = p.spender in KNOWN_SPENDERS
        const human = unlimited
          ? "Unlimited"
          : (Number(allowance) / 10 ** meta.decimals).toLocaleString(undefined, { maximumFractionDigits: 4 })
        return {
          id: `${p.address}-${p.spender}`,
          token: meta.name,
          tokenSymbol: meta.symbol,
          spender: p.spender,
          spenderLabel: KNOWN_SPENDERS[p.spender] ?? lookupAddress(p.spender)?.label ?? "Unknown contract",
          amount: human,
          unlimited,
          ageDays,
          verified,
          risk: classify(p.spender, unlimited, ageDays, verified),
          valueAtRisk: 0, // USD pricing not fetched — kept honest rather than invented
        }
      } else {
        // NFT operator approval — read isApprovedForAll(owner, operator).
        const data = IS_APPROVED_FOR_ALL_SELECTOR + pad32(address) + pad32(p.spender)
        const raw = await rpc<string>("eth_call", [{ to: p.address, data }, "latest"])
        if (BigInt(raw === "0x" ? "0x0" : raw) !== 1n) return null // revoked
        const meta = await tokenMeta(p.address)
        const ageDays = Math.max(0, Math.floor((latest - p.block) / BLOCKS_PER_DAY))
        const verified = p.spender in KNOWN_SPENDERS
        return {
          id: `${p.address}-${p.spender}`,
          token: meta.name || "NFT Collection",
          tokenSymbol: meta.symbol || "NFT",
          spender: p.spender,
          spenderLabel: KNOWN_SPENDERS[p.spender] ?? lookupAddress(p.spender)?.label ?? "Unknown operator",
          amount: "All NFTs",
          unlimited: true,
          ageDays,
          verified,
          risk: classify(p.spender, true, ageDays, verified),
          valueAtRisk: 0,
        }
      }
    } catch {
      return null
    }
  })

  return approvals
    .filter((a): a is Approval => a !== null)
    .sort((a, b) => rank(b.risk) - rank(a.risk) || Number(b.unlimited) - Number(a.unlimited))
}

function rank(r: Approval["risk"]): number {
  return { critical: 3, high: 2, medium: 1, low: 0 }[r]
}

async function countTokens(address: string): Promise<number> {
  try {
    const res = await rpc<{ tokenBalances: { tokenBalance: string }[] }>("alchemy_getTokenBalances", [address])
    return res.tokenBalances.filter((t) => t.tokenBalance && BigInt(t.tokenBalance) > 0n).length
  } catch {
    return 0
  }
}

/** Real wallet health for an address, computed from live approvals. */
export async function getWalletHealthLive(address: string): Promise<WalletHealth> {
  const [approvals, tokenCount] = await Promise.all([getApprovalsLive(address), countTokens(address)])
  return computeWalletHealth(address, approvals, { tokenCount })
}
