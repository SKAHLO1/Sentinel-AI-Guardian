// Calldata decoder for the Guardian engine.
//
// Decodes the most security-relevant EVM function calls without pulling in a
// heavy ABI library. Everything operates on raw hex so it works in any runtime
// (Node, edge, service worker).

import type { DecodedCall } from "./types"

const MAX_UINT256 = "f".repeat(64)
// Anything above ~uint128 max is, for any real token, "unlimited" in practice.
const UNLIMITED_THRESHOLD = BigInt("0xffffffffffffffffffffffffffffffff")

/**
 * Known 4-byte selectors. Maps selector -> [signature, friendly name, standard].
 * Curated toward approvals / transfers / drainer-relevant entrypoints.
 */
export const SELECTORS: Record<
  string,
  { sig: string; name: string; standard: DecodedCall["standard"] }
> = {
  "0x095ea7b3": { sig: "approve(address,uint256)", name: "ERC-20 Approval", standard: "ERC-20" },
  "0xa9059cbb": { sig: "transfer(address,uint256)", name: "ERC-20 Transfer", standard: "ERC-20" },
  "0x23b872dd": { sig: "transferFrom(address,address,uint256)", name: "ERC-20 Transfer From", standard: "ERC-20" },
  "0x39509351": { sig: "increaseAllowance(address,uint256)", name: "Increase Allowance", standard: "ERC-20" },
  "0xa22cb465": { sig: "setApprovalForAll(address,bool)", name: "Approve All (NFT)", standard: "ERC-721" },
  "0x42842e0e": { sig: "safeTransferFrom(address,address,uint256)", name: "NFT Transfer", standard: "ERC-721" },
  "0xb88d4fde": { sig: "safeTransferFrom(address,address,uint256,bytes)", name: "NFT Transfer", standard: "ERC-721" },
  "0xf242432a": { sig: "safeTransferFrom(address,address,uint256,uint256,bytes)", name: "ERC-1155 Transfer", standard: "ERC-1155" },
  "0x2e1a7d4d": { sig: "withdraw(uint256)", name: "Withdraw", standard: "Unknown" },
  "0x3593564c": { sig: "execute(bytes,bytes[],uint256)", name: "Universal Router Execute", standard: "Unknown" },
  "0x36c78516": { sig: "transferFrom(address,address,uint160,address)", name: "Permit2 Transfer", standard: "Permit2" },
  "0x87517c45": { sig: "approve(address,address,uint160,uint48)", name: "Permit2 Approve", standard: "Permit2" },
  // Selectors observed in well-known drainer kits (Inferno / Pink / Angel).
  "0x9b4e463e": { sig: "multicall(bytes[])", name: "Multicall", standard: "Unknown" },
  "0x00000000": { sig: "fallback()", name: "Raw / Fallback", standard: "Unknown" },
}

function strip0x(hex: string): string {
  return hex.startsWith("0x") || hex.startsWith("0X") ? hex.slice(2) : hex
}

/** Read the 32-byte word at position `index` (0-based) from the args region. */
function word(argsHex: string, index: number): string {
  return argsHex.slice(index * 64, index * 64 + 64)
}

/** Convert a 32-byte word holding an address into a checksum-less 0x address. */
function wordToAddress(w: string): string {
  if (!w) return ""
  return "0x" + w.slice(24)
}

function wordToBigInt(w: string): bigint {
  if (!w) return 0n
  try {
    return BigInt("0x" + w)
  } catch {
    return 0n
  }
}

function shorten(addr: string): string {
  if (!addr || addr.length < 10) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

/**
 * Decode raw calldata into a structured, security-focused view.
 * Returns null only when input is not parseable hex.
 */
export function decodeCalldata(rawData?: string): DecodedCall | null {
  if (!rawData) return null
  const clean = strip0x(rawData.trim()).toLowerCase()
  if (clean.length < 8 || !/^[0-9a-f]*$/.test(clean)) return null

  const selector = "0x" + clean.slice(0, 8)
  const argsHex = clean.slice(8)
  const known = SELECTORS[selector]

  const decoded: DecodedCall = {
    selector,
    signature: known?.sig ?? null,
    name: known?.name ?? null,
    standard: known?.standard ?? "Unknown",
    args: {},
    isUnlimitedApproval: false,
    isApprovalForAll: false,
  }

  switch (selector) {
    case "0x095ea7b3": {
      // approve(spender, amount)
      const spender = wordToAddress(word(argsHex, 0))
      const amount = wordToBigInt(word(argsHex, 1))
      decoded.args = {
        spender,
        spenderShort: shorten(spender),
        amount: amount.toString(),
        amountHex: word(argsHex, 1),
      }
      decoded.isUnlimitedApproval =
        word(argsHex, 1) === MAX_UINT256 || amount >= UNLIMITED_THRESHOLD
      break
    }
    case "0x39509351": {
      const spender = wordToAddress(word(argsHex, 0))
      const added = wordToBigInt(word(argsHex, 1))
      decoded.args = { spender, spenderShort: shorten(spender), added: added.toString() }
      decoded.isUnlimitedApproval = added >= UNLIMITED_THRESHOLD
      break
    }
    case "0xa22cb465": {
      // setApprovalForAll(operator, approved)
      const operator = wordToAddress(word(argsHex, 0))
      const approved = wordToBigInt(word(argsHex, 1)) === 1n
      decoded.args = { operator, operatorShort: shorten(operator), approved: String(approved) }
      decoded.isApprovalForAll = approved
      break
    }
    case "0xa9059cbb": {
      const to = wordToAddress(word(argsHex, 0))
      const amount = wordToBigInt(word(argsHex, 1))
      decoded.args = { to, toShort: shorten(to), amount: amount.toString() }
      break
    }
    case "0x23b872dd":
    case "0x42842e0e": {
      const fromA = wordToAddress(word(argsHex, 0))
      const toA = wordToAddress(word(argsHex, 1))
      const idOrAmt = wordToBigInt(word(argsHex, 2))
      decoded.args = {
        from: fromA,
        fromShort: shorten(fromA),
        to: toA,
        toShort: shorten(toA),
        value: idOrAmt.toString(),
      }
      break
    }
    case "0x87517c45": {
      // Permit2 approve(token, spender, amount, expiration)
      const token = wordToAddress(word(argsHex, 0))
      const spender = wordToAddress(word(argsHex, 1))
      const amount = wordToBigInt(word(argsHex, 2))
      decoded.args = {
        token,
        tokenShort: shorten(token),
        spender,
        spenderShort: shorten(spender),
        amount: amount.toString(),
      }
      decoded.isUnlimitedApproval = amount >= UNLIMITED_THRESHOLD
      break
    }
    default:
      // Unknown selector — keep raw words available for display.
      decoded.args = { raw: argsHex.slice(0, 256) }
  }

  return decoded
}

export { shorten as shortenAddress }
