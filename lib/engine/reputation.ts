// Contract reputation via the Etherscan V2 unified multichain API.
//
// One free API key works across Ethereum, Base, Arbitrum, Optimism, Polygon,
// BNB, etc. (passed as `chainid`). Optional — when ETHERSCAN_API_KEY is unset
// every call returns { configured:false } and the risk engine simply skips it.

export interface ContractReputation {
  configured: boolean
  verified: boolean
  name?: string
  address: string
  chainId: number
}

const SUPPORTED = new Set([1, 8453, 42161, 10, 137, 56])
const cache = new Map<string, ContractReputation>()

export function isReputationConfigured(): boolean {
  return Boolean(process.env.ETHERSCAN_API_KEY)
}

export async function getContractReputation(address: string, chainId = 1): Promise<ContractReputation> {
  const cid = SUPPORTED.has(chainId) ? chainId : 1
  const out: ContractReputation = { configured: true, verified: false, address, chainId: cid }
  if (!isReputationConfigured() || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return { ...out, configured: isReputationConfigured() }
  }
  const key = `${cid}:${address.toLowerCase()}`
  if (cache.has(key)) return cache.get(key)!
  try {
    const url = `https://api.etherscan.io/v2/api?chainid=${cid}&module=contract&action=getsourcecode&address=${address}&apikey=${process.env.ETHERSCAN_API_KEY}`
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) })
    const json = (await res.json()) as { result?: { SourceCode?: string; ContractName?: string }[] }
    const r = Array.isArray(json.result) ? json.result[0] : null
    if (r) {
      out.verified = typeof r.SourceCode === "string" && r.SourceCode.length > 0
      out.name = r.ContractName || undefined
    }
  } catch {
    /* leave unverified on any error */
  }
  cache.set(key, out)
  return out
}
