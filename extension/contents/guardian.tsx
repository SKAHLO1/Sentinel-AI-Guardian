// Guardian Overlay (Module 9) — isolated-world content script. Listens for the
// MAIN-world interceptor's review requests, asks the background worker to run
// the Guardian engine, renders a warning overlay, and returns the user's choice.

import { useEffect, useRef, useState } from "react"
import type { PlasmoCSConfig } from "plasmo"
import iconUrl from "data-base64:~assets/icon.png"

import type { AnalysisResult } from "~lib/types"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_idle",
}

interface Review {
  id: string
  method: string
  params: unknown[]
  origin: string
}

const VERDICT: Record<string, { color: string; label: string }> = {
  danger: { color: "#EF4444", label: "HIGH RISK DETECTED" },
  warning: { color: "#F59E0B", label: "CAUTION ADVISED" },
  safe: { color: "#22C55E", label: "LOOKS SAFE" },
}

const SEV: Record<string, string> = {
  critical: "#EF4444",
  high: "#F59E0B",
  medium: "#8B5CF6",
  low: "#4F9CF9",
  info: "#6B7A8D",
}

function decode(method: string, params: unknown[]): { data?: string; to?: string; from?: string } {
  if (method === "eth_sendTransaction" && params[0] && typeof params[0] === "object") {
    const tx = params[0] as { data?: string; to?: string; from?: string }
    return { data: tx.data, to: tx.to, from: tx.from }
  }
  // personal_sign / eth_sign carry the message as a hex param.
  const hex = params.find((p) => typeof p === "string" && (p as string).startsWith("0x")) as string | undefined
  return { data: hex }
}

export default function GuardianOverlay() {
  const [review, setReview] = useState<Review | null>(null)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [aiNote, setAiNote] = useState<string | null>(null)
  const [aiDecode, setAiDecode] = useState<string | null>(null)
  const reviewRef = useRef<Review | null>(null)

  useEffect(() => {
    // Ensure the MAIN-world interceptor is installed in this tab (reliable
    // trigger, since this content script always loads).
    chrome.runtime.sendMessage({ type: "ensureInterceptor" }).catch(() => {})

    function onMessage(event: MessageEvent) {
      if (event.source !== window) return
      const msg = event.data
      if (!msg || !msg.__sentinel) return

      // Forward the connected wallet address to the background worker so the
      // popup can fetch real on-chain data for it.
      if (msg.__sentinel === "accounts" && msg.address) {
        chrome.runtime.sendMessage({ type: "setAccount", address: msg.address }).catch(() => {})
        return
      }

      if (msg.__sentinel !== "intercept") return
      const r: Review = { id: msg.id, method: msg.method, params: msg.params ?? [], origin: msg.origin }
      reviewRef.current = r
      setReview(r)
      setResult(null)
      setAiNote(null)
      setAiDecode(null)
      setLoading(true)

      const { data, to, from } = decode(r.method, r.params)
      chrome.runtime
        .sendMessage({ type: "analyze", payload: { data, to, from, method: r.method, domain: hostOf(r.origin) } })
        .then((res: AnalysisResult) => {
          if (reviewRef.current?.id !== r.id) return
          setResult(res)
          // Auto AI-decode when the calldata isn't a recognized function.
          if (data && data !== "0x" && (!res.decoded || !res.decoded.signature)) {
            void runAiDecode(r, data, to)
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [])

  function decide(decision: "approve" | "reject") {
    if (review) window.postMessage({ __sentinel: "decision", id: review.id, decision }, "*")
    setReview(null)
    setResult(null)
    setAiDecode(null)
    setAiNote(null)
    reviewRef.current = null
  }

  async function runAiDecode(r: Review, data?: string, to?: string) {
    if (!data) return
    setAiDecode("…decoding calldata")
    try {
      const res = (await chrome.runtime.sendMessage({ type: "decode", payload: { data, to } })) as {
        decode?: string
        error?: string
      }
      if (reviewRef.current?.id !== r.id) return
      // Always resolve the loading state to a concrete message.
      setAiDecode(res?.decode || (res?.error ? `AI decode error: ${res.error}` : "No response from the AI decoder."))
    } catch (e) {
      if (reviewRef.current?.id === r.id) setAiDecode(`Couldn't reach the AI decoder: ${(e as Error).message}`)
    }
  }

  async function decodeNow() {
    if (!review) return
    const { data, to } = decode(review.method, review.params)
    await runAiDecode(review, data, to)
  }

  async function explain() {
    if (!review) return
    const { data } = decode(review.method, review.params)
    setAiNote("…thinking")
    try {
      const res = (await chrome.runtime.sendMessage({
        type: "copilot",
        payload: { message: "Explain this transaction and whether I should sign it.", data, domain: hostOf(review.origin) },
      })) as { answer: string }
      setAiNote(res.answer)
    } catch {
      setAiNote("Couldn't reach the AI engine.")
    }
  }

  if (!review) return null

  const v = VERDICT[result?.verdict ?? "warning"]
  const score = result?.riskScore ?? 0

  return (
    <div style={S.backdrop}>
      <div style={{ ...S.card, borderColor: `${v.color}55` }}>
        <div style={S.header}>
          <img src={iconUrl} alt="SentinelAI Guardian" style={{ width: 38, height: 38, borderRadius: 10 }} />
          <div>
            <div style={{ ...S.title, color: v.color }}>{loading ? "ANALYZING…" : v.label}</div>
            <div style={S.subtitle}>{hostOf(review.origin)} · {review.method}</div>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div style={{ ...S.score, color: v.color }}>{loading ? "…" : score}</div>
            <div style={S.scoreLabel}>/100 risk</div>
          </div>
        </div>

        <div style={S.bar}>
          <div style={{ ...S.barFill, width: `${score}%`, background: v.color }} />
        </div>

        {result?.summary && <p style={S.summary}>{result.summary}</p>}

        <div style={S.signals}>
          {loading && <div style={S.muted}>Running simulation, threat-intel & AI analysis…</div>}
          {!loading && result?.signals.length === 0 && (
            <div style={{ ...S.signal, color: "#22C55E", borderColor: "#22C55E33", background: "#22C55E0d" }}>
              No threat signals detected.
            </div>
          )}
          {result?.signals.slice(0, 5).map((s, i) => (
            <div key={i} style={{ ...S.signal, color: SEV[s.severity], borderColor: `${SEV[s.severity]}33`, background: `${SEV[s.severity]}0d` }}>
              <strong style={{ textTransform: "uppercase", fontSize: 9, opacity: 0.8 }}>{s.severity}</strong>
              <span>{s.message}</span>
            </div>
          ))}
        </div>

        {aiDecode && (
          <div style={{ ...S.ai, background: "#4F9CF90d", borderColor: "#4F9CF933" }}>
            <div style={{ ...S.aiLabel, color: "#4F9CF9" }}>AI Calldata Decode</div>
            <div style={S.aiText}>{aiDecode}</div>
          </div>
        )}

        {aiNote && (
          <div style={S.ai}>
            <div style={S.aiLabel}>AI Copilot</div>
            <div style={S.aiText}>{aiNote}</div>
          </div>
        )}

        {/* Secondary: AI tools */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
          <button style={{ ...S.btn, ...S.decodeBtn }} onClick={decodeNow}>
            🔍 AI Decode Calldata
          </button>
          <button style={{ ...S.btn, ...S.explainBtn }} onClick={explain}>
            Explain With AI
          </button>
        </div>
        {/* Primary: decision */}
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 8 }}>
          <button style={{ ...S.btn, ...S.reject }} onClick={() => decide("reject")}>
            Reject Transaction
          </button>
          <button style={{ ...S.btn, ...S.proceed }} onClick={() => decide("approve")}>
            Proceed Anyway
          </button>
        </div>
        <div style={S.footer}>SentinelAI never auto-signs. You make the final decision.</div>
      </div>
    </div>
  )
}

function hostOf(origin: string): string {
  try {
    return new URL(origin).host
  } catch {
    return origin
  }
}

const S: Record<string, React.CSSProperties> = {
  backdrop: {
    position: "fixed", inset: 0, zIndex: 2147483647,
    background: "rgba(3,7,18,0.72)", backdropFilter: "blur(4px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
  },
  card: {
    width: 440, maxWidth: "92vw", background: "#0D1117", color: "#E6EDF3",
    border: "1px solid", borderRadius: 18, padding: 20,
    boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
  },
  header: { display: "flex", alignItems: "center", gap: 12, marginBottom: 14 },
  shield: { width: 40, height: 40, borderRadius: 12, border: "1px solid", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 },
  title: { fontSize: 14, fontWeight: 800, letterSpacing: 0.4 },
  subtitle: { fontSize: 11, color: "#8B949E", marginTop: 2, fontFamily: "ui-monospace, monospace" },
  score: { fontSize: 26, fontWeight: 800, lineHeight: 1 },
  scoreLabel: { fontSize: 10, color: "#8B949E" },
  bar: { height: 8, borderRadius: 999, background: "rgba(255,255,255,0.07)", overflow: "hidden", marginBottom: 14 },
  barFill: { height: "100%", borderRadius: 999, transition: "width .4s ease" },
  summary: { fontSize: 12.5, lineHeight: 1.5, color: "#C9D1D9", margin: "0 0 12px" },
  signals: { display: "flex", flexDirection: "column", gap: 7, marginBottom: 12 },
  signal: { display: "flex", flexDirection: "column", gap: 2, padding: "8px 10px", borderRadius: 10, border: "1px solid", fontSize: 12, lineHeight: 1.4 },
  muted: { fontSize: 12, color: "#8B949E", padding: "8px 0" },
  ai: { background: "#FF99000d", border: "1px solid #FF990033", borderRadius: 12, padding: 12, marginBottom: 12 },
  aiLabel: { fontSize: 10, fontWeight: 700, color: "#FF9900", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  aiText: { fontSize: 12, lineHeight: 1.5, color: "#C9D1D9", whiteSpace: "pre-wrap", maxHeight: 180, overflow: "auto" },
  actions: { display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 8 },
  btn: { height: 40, borderRadius: 11, fontSize: 12.5, fontWeight: 700, cursor: "pointer", border: "1px solid transparent" },
  reject: { background: "#EF4444", color: "#fff" },
  proceed: { background: "transparent", color: "#22C55E", borderColor: "#22C55E55" },
  explainBtn: { background: "rgba(255,153,0,0.1)", color: "#FF9900", borderColor: "#FF990055" },
  decodeBtn: { background: "rgba(79,156,249,0.1)", color: "#4F9CF9", borderColor: "#4F9CF955" },
  footer: { fontSize: 10, color: "#6B7280", textAlign: "center", marginTop: 12 },
}
