import { describe, it, expect } from "vitest"
import { decodeCalldata } from "@/lib/engine/calldata"
import { analyzeTransaction } from "@/lib/engine/risk"
import { analyzeDomain, levenshtein } from "@/lib/engine/domains"
import { detectAddressPoisoning, detectClipboardSwap } from "@/lib/engine/address"
import { simulate } from "@/lib/engine/simulate"
import { computeWalletHealth, type Approval } from "@/lib/engine/wallet"
import { fallbackExplain } from "@/lib/engine/copilot"

const UNLIMITED_APPROVE =
  "0x095ea7b3000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25effffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
const CAPPED_APPROVE =
  "0x095ea7b3000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff0000000000000000000000000000000000000000000000000000000000002710"

describe("calldata decoder", () => {
  it("decodes an unlimited ERC-20 approval", () => {
    const d = decodeCalldata(UNLIMITED_APPROVE)
    expect(d).not.toBeNull()
    expect(d!.signature).toBe("approve(address,uint256)")
    expect(d!.isUnlimitedApproval).toBe(true)
    expect(d!.args.spender).toBe("0xdef1c0ded9bec7f1a1670819833240f027b25eff")
  })

  it("does not flag a capped approval as unlimited", () => {
    const d = decodeCalldata(CAPPED_APPROVE)
    expect(d!.isUnlimitedApproval).toBe(false)
    expect(d!.args.amount).toBe("10000")
  })

  it("decodes setApprovalForAll(true)", () => {
    const data = "0xa22cb465000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff0000000000000000000000000000000000000000000000000000000000000001"
    const d = decodeCalldata(data)
    expect(d!.isApprovalForAll).toBe(true)
  })

  it("returns null for non-hex input", () => {
    expect(decodeCalldata("hello")).toBeNull()
    expect(decodeCalldata("")).toBeNull()
  })

  it("marks unknown selectors as Unknown standard", () => {
    const d = decodeCalldata("0xdeadbeef")
    expect(d!.signature).toBeNull()
    expect(d!.standard).toBe("Unknown")
  })
})

describe("risk engine", () => {
  it("scores an unlimited approval to a flagged contract as danger", () => {
    const r = analyzeTransaction({ data: UNLIMITED_APPROVE, to: "0xdef1c0ded9bec7f1a1670819833240f027b25eff" })
    expect(r.verdict).toBe("danger")
    expect(r.riskScore).toBeGreaterThanOrEqual(66)
    expect(r.signals.some((s) => s.id === "unlimited-approval")).toBe(true)
  })

  it("flags eth_sign as critical", () => {
    const r = analyzeTransaction({ method: "eth_sign" })
    expect(r.signals.some((s) => s.id === "eth-sign")).toBe(true)
    expect(r.verdict).toBe("danger")
  })

  it("treats a capped approval to an unknown spender as lower risk than unlimited", () => {
    const capped = analyzeTransaction({ data: CAPPED_APPROVE })
    const unlimited = analyzeTransaction({ data: UNLIMITED_APPROVE })
    expect(capped.riskScore).toBeLessThan(unlimited.riskScore)
  })

  it("flags a known phishing origin domain", () => {
    const r = analyzeTransaction({ data: CAPPED_APPROVE, domain: "uniswap-airdrop.com" })
    expect(r.threats.some((t) => t.type === "domain")).toBe(true)
  })
})

describe("domain engine", () => {
  it("allows a known-good domain", () => {
    expect(analyzeDomain("app.uniswap.org").verdict).toBe("safe")
  })

  it("flags a typosquat of uniswap", () => {
    const d = analyzeDomain("uniswaq.org")
    expect(d.verdict).not.toBe("safe")
    expect(d.impersonates).toContain("uniswap")
  })

  it("flags a known phishing domain as danger", () => {
    expect(analyzeDomain("metamask-wallet.io").verdict).toBe("danger")
  })

  it("computes levenshtein distance", () => {
    expect(levenshtein("uniswap", "uniswaq")).toBe(1)
    expect(levenshtein("abc", "abc")).toBe(0)
  })
})

describe("address threats", () => {
  it("detects address poisoning by shared affixes", () => {
    const real = "0xabcd111111111111111111111111111111119876"
    const lure = "0xabcd999999999999999999999999999999999876"
    const r = detectAddressPoisoning(lure, [real])
    expect(r.kind).toBe("poisoning")
  })

  it("does not flag unrelated addresses", () => {
    const real = "0xabcd111111111111111111111111111111119876"
    const other = "0x1234567890123456789012345678901234567890"
    expect(detectAddressPoisoning(other, [real]).kind).toBe("none")
  })

  it("detects a clipboard swap", () => {
    const intended = "0xabcd111111111111111111111111111111119876"
    const swapped = "0x1234567890123456789012345678901234567890"
    expect(detectClipboardSwap(intended, swapped).kind).toBe("clipboard-swap")
  })

  it("passes an unchanged clipboard", () => {
    const a = "0xabcd111111111111111111111111111111119876"
    expect(detectClipboardSwap(a, a).kind).toBe("none")
  })
})

describe("simulation", () => {
  it("produces an unlimited approval scope for a drainer approval", () => {
    const s = simulate({ data: UNLIMITED_APPROVE, to: "0xdef1c0ded9bec7f1a1670819833240f027b25eff" })
    expect(s.approvalScope.isApproval).toBe(true)
    expect(s.approvalScope.unlimited).toBe(true)
    expect(s.risk.verdict).toBe("danger")
  })

  it("is deterministic for the same input", () => {
    const a = simulate({ data: UNLIMITED_APPROVE })
    const b = simulate({ data: UNLIMITED_APPROVE })
    expect(a.gasUnits).toBe(b.gasUnits)
  })
})

describe("wallet health scoring", () => {
  const mk = (risk: Approval["risk"], unlimited: boolean): Approval => ({
    id: Math.random().toString(), token: "USD Coin", tokenSymbol: "USDC",
    spender: "0xdef1c0ded9bec7f1a1670819833240f027b25eff", spenderLabel: "Unknown",
    amount: unlimited ? "Unlimited" : "1000", unlimited, ageDays: 30, verified: false, risk, valueAtRisk: 0,
  })

  it("scores an empty wallet as a perfect 100", () => {
    const h = computeWalletHealth("0xabc", [])
    expect(h.healthScore).toBe(100)
    expect(h.grade).toBe("A")
    expect(h.totalApprovals).toBe(0)
  })

  it("lowers health as risky/unlimited approvals accumulate", () => {
    const clean = computeWalletHealth("0xabc", [mk("low", false)])
    const dirty = computeWalletHealth("0xabc", [mk("critical", true), mk("critical", true), mk("high", true)])
    expect(dirty.healthScore).toBeLessThan(clean.healthScore)
    expect(dirty.unlimitedApprovals).toBe(3)
    expect(dirty.riskyApprovals).toBe(3)
    expect(dirty.healthScore).toBeGreaterThanOrEqual(0)
    expect(dirty.healthScore).toBeLessThanOrEqual(100)
  })
})

describe("signature decoding", () => {
  it("flags an unlimited Permit2 signature as critical", async () => {
    const { decodeTypedData } = await import("@/lib/engine/signature")
    const td = {
      domain: { name: "Permit2", verifyingContract: "0x000000000022d473030f116ddee9f6b43ac78ba3" },
      primaryType: "PermitSingle",
      message: {
        details: { token: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", amount: ((1n << 160n) - 1n).toString(), expiration: "0", nonce: "0" },
        spender: "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        sigDeadline: "0",
      },
    }
    const d = decodeTypedData(td)
    expect(d?.kind).toBe("permit2")
    expect(d?.unlimited).toBe(true)
    expect(d?.signals[0].severity).toBe("critical")
  })

  it("flags a zero-consideration Seaport listing", async () => {
    const { decodeTypedData } = await import("@/lib/engine/signature")
    const td = {
      domain: { name: "Seaport" },
      primaryType: "OrderComponents",
      message: { offer: [{ token: "0xnft" }], consideration: [{ startAmount: "0" }] },
    }
    const d = decodeTypedData(td)
    expect(d?.kind).toBe("seaport")
    expect(d?.signals[0].severity).toBe("critical")
  })

  it("raises risk when typedData is passed to analyzeTransaction", () => {
    const td = {
      domain: { name: "Permit2", verifyingContract: "0x000000000022d473030f116ddee9f6b43ac78ba3" },
      primaryType: "PermitSingle",
      message: { details: { token: "0xa0b8", amount: ((1n << 160n) - 1n).toString() }, spender: "0xdef1c0ded9bec7f1a1670819833240f027b25eff" },
    }
    const r = analyzeTransaction({ method: "eth_signTypedData_v4", typedData: td })
    expect(r.verdict).toBe("danger")
    expect(r.signals.some((s) => s.id === "permit2-sig")).toBe(true)
  })
})

describe("copilot fallback", () => {
  it("explains a pasted unlimited approval with a reject recommendation", () => {
    const out = fallbackExplain("is this safe?", { data: UNLIMITED_APPROVE })
    expect(out.toLowerCase()).toContain("reject")
  })

  it("answers generic approval questions", () => {
    const out = fallbackExplain("what is an unlimited approval?", {})
    expect(out.toLowerCase()).toContain("unlimited approval")
  })
})
