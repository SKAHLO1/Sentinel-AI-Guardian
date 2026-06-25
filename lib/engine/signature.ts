// Off-chain signature decoder (EIP-712 typed data).
//
// Most modern wallet drains happen through SIGNATURES, not on-chain txs:
// ERC-2612 Permit, Uniswap Permit2, and Seaport NFT orders all grant token
// access via `eth_signTypedData` with no on-chain trace. This module decodes
// those into plain English and risk signals.

import type { RiskSignal } from "./types"

export interface SignatureDecode {
  kind: "permit" | "permit2" | "seaport" | "typed-data"
  title: string
  summary: string
  spender?: string
  token?: string
  amount?: string
  unlimited?: boolean
  signals: RiskSignal[]
}

const PERMIT2_ADDRESS = "0x000000000022d473030f116ddee9f6b43ac78ba3"
const UNLIMITED_160 = (1n << 159n) // ~half of uint160 max ⇒ effectively unlimited
const UNLIMITED_256 = 1n << 255n

function parse(raw: unknown): any | null {
  if (!raw) return null
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }
  if (typeof raw === "object") return raw
  return null
}

function shorten(a?: string): string {
  return a && a.length > 10 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a || "?"
}

function bn(v: any): bigint {
  try {
    return BigInt(v)
  } catch {
    return 0n
  }
}

/** Decode the typed-data payload from an eth_signTypedData request. */
export function decodeTypedData(raw: unknown): SignatureDecode | null {
  const td = parse(raw)
  if (!td || !td.primaryType) return null
  const domain = td.domain || {}
  const msg = td.message || {}
  const pt: string = td.primaryType

  // --- ERC-2612 Permit (gasless token approval) --------------------------
  if (pt === "Permit" && msg.spender !== undefined && msg.value !== undefined) {
    const value = bn(msg.value)
    const unlimited = value >= UNLIMITED_256
    const token = domain.name || shorten(domain.verifyingContract)
    return {
      kind: "permit",
      token,
      spender: msg.spender,
      amount: unlimited ? "Unlimited" : value.toString(),
      unlimited,
      title: "Off-chain token approval (Permit)",
      summary: `Gasless approval — this signature lets ${shorten(msg.spender)} spend ${
        unlimited ? "UNLIMITED" : value.toString()
      } of ${token}. No on-chain tx, but it grants real spending power.`,
      signals: [
        {
          id: "permit-sig",
          message: `Permit signature grants ${shorten(msg.spender)} ${unlimited ? "unlimited " : ""}spending of ${token}`,
          severity: unlimited ? "critical" : "high",
          weight: unlimited ? 45 : 30,
          category: "signing",
        },
      ],
    }
  }

  // --- Uniswap Permit2 (PermitSingle / PermitBatch) ----------------------
  const isPermit2 =
    domain.name === "Permit2" ||
    (typeof domain.verifyingContract === "string" && domain.verifyingContract.toLowerCase() === PERMIT2_ADDRESS)
  if (isPermit2) {
    const spender = msg.spender
    const details = Array.isArray(msg.details) ? msg.details : msg.details ? [msg.details] : []
    const items = details.map((d: any) => ({ token: d.token, amount: bn(d.amount), unlimited: bn(d.amount) >= UNLIMITED_160 }))
    const anyUnlimited = items.some((i) => i.unlimited)
    const list = items.map((i) => `${i.unlimited ? "Unlimited" : i.amount.toString()} of ${shorten(i.token)}`).join(", ")
    return {
      kind: "permit2",
      spender,
      unlimited: anyUnlimited,
      title: "Permit2 approval signature",
      summary: `Permit2 — this signature lets ${shorten(spender)} spend ${
        list || "your tokens"
      }. A Permit2 signature is as powerful as an on-chain approval.`,
      signals: [
        {
          id: "permit2-sig",
          message: `Permit2 signature grants ${shorten(spender)} ${anyUnlimited ? "unlimited " : ""}token spending`,
          severity: anyUnlimited ? "critical" : "high",
          weight: anyUnlimited ? 45 : 30,
          category: "signing",
        },
      ],
    }
  }

  // --- Seaport order (NFT marketplace) -----------------------------------
  const isSeaport = domain.name === "Seaport" || pt === "OrderComponents"
  if (isSeaport) {
    const offer = Array.isArray(msg.offer) ? msg.offer : []
    const consideration = Array.isArray(msg.consideration) ? msg.consideration : []
    const receiving = consideration.reduce((s: bigint, c: any) => s + bn(c.startAmount ?? c.amount ?? 0), 0n)
    const givingNfts = offer.length
    const zeroValue = receiving === 0n && givingNfts > 0
    return {
      kind: "seaport",
      title: "NFT marketplace order (Seaport)",
      summary: zeroValue
        ? `⚠ You are offering ${givingNfts} item(s) for ~0 in return — the classic scam NFT-listing pattern.`
        : `Seaport order offering ${givingNfts} item(s). Verify the price you receive.`,
      signals: [
        {
          id: "seaport-sig",
          message: zeroValue
            ? `Seaport order gives away ${givingNfts} NFT(s) for near-zero consideration`
            : `Seaport order — verify offer vs. consideration`,
          severity: zeroValue ? "critical" : "medium",
          weight: zeroValue ? 45 : 14,
          category: "signing",
        },
      ],
    }
  }

  // --- Unknown typed data ------------------------------------------------
  return {
    kind: "typed-data",
    title: `Typed-data signature (${pt})`,
    summary: `Off-chain signature of type "${pt}" for ${domain.name || "an unknown domain"}. Verify exactly what it authorizes before signing.`,
    signals: [
      {
        id: "typed-data-unknown",
        message: `Off-chain ${pt} signature — could authorize token or asset access`,
        severity: "medium",
        weight: 14,
        category: "signing",
      },
    ],
  }
}
