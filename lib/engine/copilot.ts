// AI Security Copilot + Bedrock Explanation Engine (Modules 5 & 14).
//
// Tries, in order:
//   1. AWS Bedrock (Claude) when AWS credentials + BEDROCK_MODEL_ID are set.
//   2. Anthropic API when ANTHROPIC_API_KEY is set.
//   3. A deterministic, rule-based explainer that uses the real Guardian engine
//      output — so the Copilot gives genuine security answers with zero keys.

import type { AnalysisRequest } from "./types"
import { analyzeTransaction } from "./risk"
import { analyzeDomain } from "./domains"
import { decodeCalldata } from "./calldata"
import { invokeBedrock, isBedrockConfigured } from "./bedrock"
import { fourByteSignatures } from "./fourbyte"

export interface CopilotContext {
  /** Optional calldata the user is asking about. */
  data?: string
  to?: string
  domain?: string
  walletAddress?: string
}

const SYSTEM_PROMPT = `You are SentinelAI Guardian, an AI antivirus for Web3. You explain blockchain transaction risks, approvals, phishing, and wallet security in plain, calm, accurate language. Be concise, lead with a recommendation, and never tell a user a dangerous action is safe. Use short markdown with ** for emphasis.`

/** Detect which AI backend, if any, is configured. AWS Bedrock is primary. */
export function aiBackend(): "bedrock" | "anthropic" | "fallback" {
  if (isBedrockConfigured()) return "bedrock"
  if (process.env.ANTHROPIC_API_KEY) return "anthropic"
  return "fallback"
}

async function viaAnthropic(message: string, context: CopilotContext): Promise<string> {
  const grounding = buildGrounding(context)
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY as string,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL_ID || "claude-sonnet-4-6",
      max_tokens: 700,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `${grounding}\n\nUser question: ${message}` }],
    }),
  })
  if (!res.ok) throw new Error(`Anthropic ${res.status}`)
  const json = (await res.json()) as { content: { text: string }[] }
  return json.content.map((c) => c.text).join("")
}

async function viaBedrock(message: string, context: CopilotContext): Promise<string> {
  const grounding = buildGrounding(context)
  return invokeBedrock({
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: `${grounding}\n\nUser question: ${message}` }],
    maxTokens: 800,
  })
}

/** Build a grounding block from real engine analysis of the provided context. */
function buildGrounding(context: CopilotContext): string {
  const lines: string[] = []
  if (context.data) {
    const req: AnalysisRequest = { data: context.data, to: context.to, domain: context.domain }
    const a = analyzeTransaction(req)
    lines.push(`Transaction analysis: risk ${a.riskScore}/100 (${a.label}). ${a.summary}`)
    if (a.signals.length) lines.push("Signals: " + a.signals.map((s) => `[${s.severity}] ${s.message}`).join("; "))
    if (a.threats.length) lines.push("Threat matches: " + a.threats.map((t) => t.label).join("; "))
  }
  if (context.domain) {
    const d = analyzeDomain(context.domain)
    lines.push(`Domain ${d.domain}: ${d.verdict} (${d.score}/100). ${d.reasons.join("; ")}`)
  }
  return lines.length ? `Guardian engine context:\n${lines.join("\n")}` : "No specific transaction context provided."
}

/** Deterministic explainer used when no AI backend is configured. */
export function fallbackExplain(message: string, context: CopilotContext): string {
  const q = message.toLowerCase()

  if (context.data) {
    const decoded = decodeCalldata(context.data)
    const a = analyzeTransaction({ data: context.data, to: context.to, domain: context.domain })
    const verdictLine =
      a.verdict === "danger"
        ? "**I recommend rejecting this transaction.**"
        : a.verdict === "warning"
          ? "**Proceed with caution.**"
          : "**This transaction looks safe**, but always verify."
    const bullets = a.signals.slice(0, 5).map((s) => `• ${s.message}`).join("\n")
    return [
      verdictLine,
      "",
      `I decoded this as **${decoded?.name ?? "an unknown call"}**${decoded?.signature ? ` (\`${decoded.signature}\`)` : ""}.`,
      bullets || "• No notable risk signals were found in the calldata.",
      "",
      `**Risk Score: ${a.riskScore}/100** — ${a.recommendation}`,
    ].join("\n")
  }

  if (context.domain) {
    const d = analyzeDomain(context.domain)
    return [
      d.verdict === "danger" ? "**This site is dangerous — do not connect your wallet.**" : d.verdict === "warning" ? "**Be careful with this site.**" : "**This domain appears legitimate.**",
      "",
      `Domain risk score: **${d.score}/100**.`,
      ...d.reasons.map((r) => `• ${r}`),
      d.impersonates ? `\nIt appears to imitate **${d.impersonates}**.` : "",
    ].join("\n")
  }

  if (q.includes("unlimited") || q.includes("approval")) {
    return "An **unlimited approval** lets a contract move your entire balance of a token — now or any time in the future — without asking again. Legitimate dApps sometimes request it to save gas, but it's a real risk: if that contract is malicious or later compromised, your funds can be drained. **Recommendation:** revoke unlimited approvals you no longer use, and prefer exact-amount approvals. Open the Approvals page to see and revoke yours."
  }
  if (q.includes("phishing") || q.includes("scam") || q.includes("safe site") || q.includes("trust")) {
    return "To judge whether a site is safe, check: the exact domain (watch for typosquats like `uniswaq` or `0pensea`), whether it's asking for `eth_sign` or unlimited approvals, and whether it appeared via an unsolicited airdrop/DM. Paste the domain here and I'll score it with the Guardian engine."
  }
  if (q.includes("health") || q.includes("score")) {
    return "Your **wallet health score** reflects your live attack surface: open token approvals, unlimited allowances, and approvals to unverified contracts all lower it. Reducing unlimited approvals to unknown spenders is the fastest way to raise it. Check the Dashboard gauge and the Approvals page for specifics."
  }
  if (q.includes("address poisoning") || q.includes("poison")) {
    return "**Address poisoning** is when an attacker sends you a $0 transfer from an address whose first and last characters match a real contact, hoping you'll later copy the wrong one from your history. **Always verify the full address**, not just the ends, and use a saved address book. SentinelAI flags poisoning look-alikes automatically."
  }

  return "I'm your Web3 security copilot. I can decode a transaction's calldata, score a domain for phishing, explain an approval, or review your wallet's risk. Paste calldata, a contract address, or a domain and ask me about it — for example, *\"Is this approval safe?\"*"
}

const DECODE_PROMPT = `You are a precise EVM calldata decoder for a Web3 security tool. Given raw transaction calldata, the destination contract, and the ETH value, explain exactly what the transaction does:
- Identify the function being called (use the provided candidate signature(s) if any).
- Decode each argument from the calldata and explain its meaning in human terms (addresses, token amounts, booleans, deadlines).
- State the concrete on-chain effect and any risk to the user's funds (approvals, unlimited allowances, transfers, swaps, bridges).
Be concise and factual with short markdown. If something can't be determined from the data, say so plainly. Never claim a dangerous action is safe.`

export interface DecodeRequest {
  data?: string
  to?: string
  value?: string
  chainId?: number
}

/** Deterministic decode text used when no AI backend is available. */
function fallbackDecode(decoded: ReturnType<typeof decodeCalldata>, signatures: string[]): string {
  if (!decoded) return "No calldata to decode (this is a plain value transfer or empty data)."
  if (decoded.signature) {
    const args = Object.entries(decoded.args)
      .filter(([k]) => !k.endsWith("Short") && !k.endsWith("Hex") && k !== "raw")
      .map(([k, v]) => `• **${k}**: \`${v}\``)
      .join("\n")
    const flag = decoded.isUnlimitedApproval
      ? "\n\n⚠ This is an **unlimited approval** — the spender can move your entire balance."
      : decoded.isApprovalForAll
        ? "\n\n⚠ This grants control over **all NFTs** in the collection."
        : ""
    return `**${decoded.name}** — \`${decoded.signature}\`\n${args}${flag}`
  }
  if (signatures.length) {
    return `Unknown selector \`${decoded.selector}\` matches the 4byte directory signature(s):\n${signatures
      .slice(0, 5)
      .map((s) => `• \`${s}\``)
      .join("\n")}\n\nConnect AWS Bedrock for a full plain-English decode of the parameters.`
  }
  return `Opaque calldata — selector \`${decoded.selector}\` is not in our table or the 4byte directory. Connect AWS Bedrock for an AI decode, and treat blind-signing this with caution.`
}

/**
 * AI calldata decoder (Module 5). Combines the static decode + 4byte signature
 * lookup as ground truth, then asks Bedrock/Claude to explain the parameters.
 * Falls back to a deterministic decode when no AI backend is configured.
 */
export async function aiDecodeCalldata(
  req: DecodeRequest,
): Promise<{ decode: string; signatures: string[]; backend: string; selector: string | null; error?: string }> {
  const decoded = decodeCalldata(req.data)
  const selector = decoded?.selector ?? null
  // Only hit 4byte when our static table didn't already resolve the signature.
  const signatures =
    decoded && !decoded.signature && selector ? await fourByteSignatures(selector) : decoded?.signature ? [decoded.signature] : []

  const backend = aiBackend()
  if (backend !== "fallback") {
    const user = [
      `Destination contract: ${req.to ?? "unknown"}`,
      `ETH value: ${req.value ?? "0"} wei`,
      `Function selector: ${selector ?? "n/a"}`,
      `Candidate signatures (4byte.directory): ${signatures.length ? signatures.slice(0, 5).join(", ") : "none"}`,
      `Static decode: ${decoded?.signature ? `${decoded.name} (${decoded.signature})` : "not recognized"}`,
      `Raw calldata:\n${req.data ?? "0x"}`,
    ].join("\n")
    try {
      if (backend === "bedrock") {
        const decode = await invokeBedrock({ system: DECODE_PROMPT, messages: [{ role: "user", content: user }], maxTokens: 700 })
        return { decode, signatures, backend, selector }
      }
      if (backend === "anthropic") {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY as string, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({
            model: process.env.ANTHROPIC_MODEL_ID || "claude-sonnet-4-6",
            max_tokens: 700,
            system: DECODE_PROMPT,
            messages: [{ role: "user", content: user }],
          }),
        })
        if (res.ok) {
          const json = (await res.json()) as { content: { text: string }[] }
          return { decode: json.content.map((c) => c.text).join(""), signatures, backend, selector }
        }
        throw new Error(`Anthropic API ${res.status}: ${await res.text()}`)
      }
    } catch (err) {
      // Surface WHY the AI call failed instead of silently degrading.
      const message = (err as Error).message
      console.error(`[/api/decode] ${backend} invocation failed:`, message)
      return {
        decode: `⚠ AI decode unavailable (${backend} error). ${fallbackDecode(decoded, signatures)}`,
        signatures,
        backend: `${backend}-error`,
        selector,
        error: message,
      }
    }
  }

  return { decode: fallbackDecode(decoded, signatures), signatures, backend: "fallback", selector }
}

/** Main entry: returns an AI answer, upgrading to a real model when configured. */
export async function copilotAnswer(message: string, context: CopilotContext): Promise<{ answer: string; backend: string }> {
  const backend = aiBackend()
  try {
    if (backend === "bedrock") return { answer: await viaBedrock(message, context), backend }
    if (backend === "anthropic") return { answer: await viaAnthropic(message, context), backend }
  } catch (err) {
    // Surface the reason, then fall through to the deterministic explainer.
    console.error(`[/api/copilot] ${backend} invocation failed:`, (err as Error).message)
  }
  return { answer: fallbackExplain(message, context), backend: "fallback" }
}
