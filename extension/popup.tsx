// Extension popup (Module 20) — Home, Wallet Health, Approvals, Threat Feed,
// Copilot, and Settings. The control surface for the Guardian antivirus.

import { createContext, useContext, useEffect, useRef, useState } from "react"
import iconUrl from "data-base64:~assets/icon.png"

import { API_BASE, connectWallet, disconnectWallet, getConnectedWallet, guardianApi } from "~lib/api"

type Tab = "home" | "wallet" | "approvals" | "threats" | "copilot" | "settings"

// Minimal chain registry for display (mirrors the backend CHAINS map).
const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum", 8453: "Base", 42161: "Arbitrum", 10: "Optimism", 137: "Polygon", 56: "BNB Chain",
}
const chainName = (id: number | null | undefined) => (id ? CHAIN_NAMES[id] ?? `Chain ${id}` : "")

// --- Wallet connection state, shared across all tabs --------------------
interface WalletCtx {
  address: string | null | undefined // undefined = still loading
  chainId: number | null
  connecting: boolean
  error: string | null
  connect: () => Promise<void>
  disconnect: () => void
}
const WalletContext = createContext<WalletCtx>({
  address: undefined, chainId: null, connecting: false, error: null, connect: async () => {}, disconnect: () => {},
})
const useW = () => useContext(WalletContext)

const C = {
  blue: "#4F9CF9", green: "#22C55E", amber: "#F59E0B", red: "#EF4444", aws: "#FF9900",
  bg: "#0A0E14", panel: "#111827", panel2: "#0D1117", text: "#E6EDF3", muted: "#8B949E",
  border: "rgba(255,255,255,0.07)",
}

const sevColor: Record<string, string> = {
  critical: C.red, high: C.amber, medium: "#8B5CF6", low: C.blue, info: C.muted,
}

export default function Popup() {
  const [tab, setTab] = useState<Tab>("home")
  const [address, setAddress] = useState<string | null | undefined>(undefined)
  const [chainId, setChainId] = useState<number | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { getConnectedWallet().then((w) => { setAddress(w.address); setChainId(w.chainId) }) }, [])

  async function connect() {
    setConnecting(true); setError(null)
    const res = await connectWallet()
    if (res.address) { setAddress(res.address); if (res.chainId) setChainId(res.chainId) }
    else setError(res.error ?? "Connection failed")
    setConnecting(false)
  }
  function disconnect() { setAddress(null); setChainId(null); void disconnectWallet() }

  return (
    <WalletContext.Provider value={{ address, chainId, connecting, error, connect, disconnect }}>
      <div style={s.root}>
        <Header />
        <div style={s.body}>
          {tab === "home" && <Home />}
          {tab === "wallet" && <WalletHealth />}
          {tab === "approvals" && <Approvals />}
          {tab === "threats" && <Threats />}
          {tab === "copilot" && <Copilot />}
          {tab === "settings" && <Settings />}
        </div>
        <Nav tab={tab} setTab={setTab} />
      </div>
    </WalletContext.Provider>
  )
}

function Header() {
  const { address, chainId, connect, disconnect, connecting } = useW()
  return (
    <div style={s.header}>
      <img src={iconUrl} alt="SentinelAI Guardian" style={{ width: 30, height: 30, borderRadius: 8 }} />
      <div>
        <div style={{ fontWeight: 700, fontSize: 14 }}>SentinelAI Guardian</div>
        <div style={{ fontSize: 10, color: C.muted }}>The AI Antivirus for Web3</div>
      </div>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
        {address && chainId ? (
          <span style={{ fontSize: 9, color: C.blue, background: `${C.blue}14`, border: `1px solid ${C.blue}33`, borderRadius: 999, padding: "3px 7px", fontWeight: 600 }}>
            {chainName(chainId)}
          </span>
        ) : null}
        {address ? (
          <button onClick={disconnect} title="Disconnect" style={s.addrPill}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: C.green, display: "inline-block" }} />
            {address.slice(0, 5)}…{address.slice(-3)}
          </button>
        ) : (
          <button onClick={connect} disabled={connecting} style={s.connectBtn}>
            {connecting ? "Connecting…" : "Connect"}
          </button>
        )}
      </div>
    </div>
  )
}

// --- Home: current site protection status -------------------------------
function Home() {
  const { address, connect, connecting, error } = useW()
  const [scan, setScan] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    chrome.runtime.sendMessage({ type: "getStatus" }).then((r) => { setScan(r); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const status = scan?.status ?? "clear"
  const color = status === "blocked" ? C.red : status === "warning" ? C.amber : C.green
  const label = status === "blocked" ? "Threat Blocked" : status === "warning" ? "Caution" : "Protected"

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Connect CTA — protection works regardless, this enables wallet views */}
      {address === null && (
        <div style={{ ...s.card, borderColor: `${C.blue}44`, textAlign: "center" }}>
          <div style={{ fontSize: 12, color: C.text, fontWeight: 600, marginBottom: 4 }}>Connect your wallet</div>
          <div style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.5, marginBottom: 10 }}>
            Transaction protection is already active on every dApp. Connect to also see your
            wallet health, approvals & history.
          </div>
          <button onClick={connect} disabled={connecting} style={{ ...s.connectBtn, padding: "8px 16px", fontSize: 12 }}>
            {connecting ? "Connecting…" : "Connect Wallet"}
          </button>
          {error && <div style={{ color: C.red, fontSize: 10.5, marginTop: 8 }}>{error}</div>}
        </div>
      )}

      <div style={{ ...s.card, borderColor: `${color}44`, textAlign: "center", padding: 18 }}>
        <div style={{ fontSize: 34 }}>{status === "blocked" ? "⛔" : status === "warning" ? "⚠️" : "✅"}</div>
        <div style={{ fontWeight: 800, color, fontSize: 16, marginTop: 6 }}>{label}</div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
          {loading ? "Scanning…" : scan?.host ? `Monitoring ${scan.host}` : "Open a dApp to start scanning"}
        </div>
        {typeof scan?.threatScore === "number" && (
          <div style={{ marginTop: 10 }}>
            <div style={s.barTrack}><div style={{ ...s.barFill, width: `${scan.threatScore}%`, background: color }} /></div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>Threat score {scan.threatScore}/100</div>
          </div>
        )}
      </div>

      {scan?.findings?.length > 0 && (
        <div style={s.card}>
          <div style={s.cardTitle}>Live findings</div>
          {scan.findings.slice(0, 4).map((f: any, i: number) => (
            <div key={i} style={{ ...s.row, color: sevColor[f.severity] ?? C.muted }}>
              <span style={{ fontSize: 9, textTransform: "uppercase", fontWeight: 700, opacity: 0.8 }}>{f.module}</span>
              <span style={{ fontSize: 11 }}>{f.message}</span>
            </div>
          ))}
        </div>
      )}

      <div style={s.card}>
        <div style={s.cardTitle}>Real-time protection</div>
        {[
          ["Transaction interception", true],
          ["Website / phishing scan", true],
          ["Clipboard & address-poisoning", true],
          ["AI risk explanations", true],
        ].map(([label, on]) => (
          <div key={label as string} style={{ ...s.row, justifyContent: "space-between" }}>
            <span style={{ fontSize: 12 }}>{label}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: on ? C.green : C.muted }}>{on ? "ON" : "OFF"}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Resolve the connected wallet address from shared context.
function useConnectedAddress() {
  return useW().address
}
function useChainId() {
  return useW().chainId ?? undefined
}

function NoWallet() {
  const { connect, connecting, error } = useW()
  return (
    <div style={{ color: C.muted, fontSize: 12, textAlign: "center", padding: 24, lineHeight: 1.5 }}>
      🔌 No wallet connected.<br />
      Open a dApp tab (with MetaMask/Rabby), then connect — SentinelAI reads your
      address to scan real approvals.
      <div style={{ marginTop: 14 }}>
        <button onClick={connect} disabled={connecting} style={{ ...s.connectBtn, padding: "8px 16px", fontSize: 12 }}>
          {connecting ? "Connecting…" : "Connect Wallet"}
        </button>
      </div>
      {error && <div style={{ color: C.red, fontSize: 11, marginTop: 10 }}>{error}</div>}
    </div>
  )
}
function NeedsProvider() {
  return (
    <div style={{ color: C.muted, fontSize: 12, textAlign: "center", padding: 24, lineHeight: 1.5 }}>
      ⚙️ On-chain data source not configured.<br />Set <code style={{ color: C.blue }}>ALCHEMY_API_KEY</code> on
      the backend to scan real approvals & balances.
    </div>
  )
}
function shortAddr(a: string) { return `${a.slice(0, 6)}…${a.slice(-4)}` }

// --- Wallet Health (real, via Alchemy) ----------------------------------
function WalletHealth() {
  const address = useConnectedAddress()
  const chainId = useChainId()
  const [w, setW] = useState<any>(null)
  const [state, setState] = useState<"loading" | "ready" | "no-provider" | "error">("loading")

  useEffect(() => {
    if (address === undefined) return
    if (address === null) { setState("ready"); return }
    setState("loading")
    guardianApi.walletLive(address, chainId)
      .then((r) => {
        if (!r.configured) return setState("no-provider")
        if (r.error) return setState("error")
        setW(r); setState("ready")
      })
      .catch(() => setState("error"))
  }, [address, chainId])

  if (address === undefined || state === "loading") return <Loading />
  if (address === null) return <NoWallet />
  if (state === "no-provider") return <NeedsProvider />
  if (state === "error" || !w) return <Disconnected />

  const color = w.healthScore >= 75 ? C.green : w.healthScore >= 50 ? C.amber : C.red
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 10, color: C.muted, fontFamily: "monospace", textAlign: "center" }}>{shortAddr(address)}</div>
      <div style={{ ...s.card, textAlign: "center", borderColor: `${color}44` }}>
        <div style={{ fontSize: 11, color: C.muted }}>Wallet Health Score</div>
        <div style={{ fontSize: 40, fontWeight: 800, color }}>{w.healthScore}<span style={{ fontSize: 16, color: C.muted }}>/100</span></div>
        <div style={{ display: "inline-block", padding: "2px 10px", borderRadius: 999, background: `${color}1a`, color, fontSize: 11, fontWeight: 700 }}>Grade {w.grade}</div>
      </div>
      <div style={s.card}>
        {[
          ["Risk score", `${w.riskScore}/100`],
          ["Exposure score", `${w.exposureScore}/100`],
          ["Tokens held", w.tokenCount],
          ["Total approvals", w.totalApprovals],
          ["Unlimited approvals", w.unlimitedApprovals],
          ["Risky approvals", w.riskyApprovals],
        ].map(([k, v]) => (
          <div key={k as string} style={{ ...s.row, justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: C.muted }}>{k}</span>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// --- Approvals (real, via Alchemy) --------------------------------------
function Approvals() {
  const address = useConnectedAddress()
  const chainId = useChainId()
  const [list, setList] = useState<any[] | null>(null)
  const [state, setState] = useState<"loading" | "ready" | "no-provider" | "error">("loading")

  useEffect(() => {
    if (address === undefined) return
    if (address === null) { setState("ready"); return }
    setState("loading")
    guardianApi.approvalsLive(address, chainId)
      .then((r) => {
        if (!r.configured) return setState("no-provider")
        if (r.error) return setState("error")
        setList(r.approvals); setState("ready")
      })
      .catch(() => setState("error"))
  }, [address, chainId])

  if (address === undefined || state === "loading") return <Loading />
  if (address === null) return <NoWallet />
  if (state === "no-provider") return <NeedsProvider />
  if (state === "error") return <Disconnected />
  if (!list || list.length === 0) {
    return <div style={{ color: C.green, fontSize: 12, textAlign: "center", padding: 24 }}>✅ No active token approvals found for {shortAddr(address)}.</div>
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 10, color: C.muted, fontFamily: "monospace", textAlign: "center" }}>{shortAddr(address)} · {list.length} approvals</div>
      {list.map((a) => (
        <div key={a.id} style={{ ...s.card, padding: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{a.tokenSymbol}</div>
            <div style={{ fontSize: 10, padding: "1px 6px", borderRadius: 999, background: `${sevColor[a.risk]}1a`, color: sevColor[a.risk], fontWeight: 700, textTransform: "uppercase" }}>{a.risk}</div>
            <div style={{ marginLeft: "auto", fontSize: 11, color: a.unlimited ? C.red : C.muted, fontWeight: a.unlimited ? 700 : 400 }}>{a.amount}</div>
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{a.spenderLabel}{a.verified ? "" : " · unverified"}</div>
        </div>
      ))}
    </div>
  )
}

// --- Threat Feed --------------------------------------------------------
function Threats() {
  const [list, setList] = useState<any[] | null>(null)
  const [err, setErr] = useState(false)
  useEffect(() => { guardianApi.threats().then((r) => setList(r.threats)).catch(() => setErr(true)) }, [])
  if (err) return <Disconnected />
  if (!list) return <Loading />
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {list.map((t) => (
        <div key={t.id} style={{ ...s.card, padding: 12, borderLeft: `3px solid ${sevColor[t.severity]}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: sevColor[t.severity], textTransform: "uppercase" }}>{t.type}</span>
            <span style={{ marginLeft: "auto", fontSize: 10, color: C.muted }}>{timeAgo(t.detectedAt)}</span>
          </div>
          <div style={{ fontSize: 12, marginTop: 3 }}>{t.title}</div>
        </div>
      ))}
    </div>
  )
}

// --- Copilot ------------------------------------------------------------
function Copilot() {
  const [msgs, setMsgs] = useState<{ role: string; text: string }[]>([
    { role: "assistant", text: "Ask me about a transaction, contract, or site. Paste calldata or a domain and I'll analyze it." },
  ])
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => { endRef.current?.scrollIntoView() }, [msgs])

  async function send() {
    const text = input.trim()
    if (!text || busy) return
    setMsgs((m) => [...m, { role: "user", text }])
    setInput(""); setBusy(true)
    try {
      const data = text.match(/0x[0-9a-fA-F]{8,}/)?.[0]
      const domain = text.match(/\b([a-z0-9-]+\.)+[a-z]{2,}\b/i)?.[0]
      const res = await guardianApi.copilot({ message: text, data, domain })
      setMsgs((m) => [...m, { role: "assistant", text: res.answer }])
    } catch {
      setMsgs((m) => [...m, { role: "assistant", text: "Couldn't reach the Guardian engine. Check the API URL in Settings." }])
    } finally { setBusy(false) }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "85%", padding: "8px 10px", borderRadius: 12, fontSize: 12, lineHeight: 1.45, whiteSpace: "pre-wrap", background: m.role === "user" ? C.blue : C.panel, color: m.role === "user" ? "#06121f" : C.text, border: m.role === "user" ? "none" : `1px solid ${C.border}` }}>
            {m.text}
          </div>
        ))}
        {busy && <div style={{ fontSize: 11, color: C.muted }}>Analyzing…</div>}
        <div ref={endRef} />
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Ask about a tx or site…" style={s.input} />
        <button onClick={send} disabled={busy} style={{ ...s.sendBtn, opacity: busy ? 0.5 : 1 }}>➤</button>
      </div>
    </div>
  )
}

// --- Settings -----------------------------------------------------------
function Settings() {
  const [health, setHealth] = useState<any>(null)
  const [err, setErr] = useState(false)
  useEffect(() => { guardianApi.health().then(setHealth).catch(() => setErr(true)) }, [])
  const backend = health?.aiBackend ?? "unknown"
  const meta: Record<string, { label: string; color: string }> = {
    bedrock: { label: "AWS Bedrock (Claude)", color: C.aws },
    anthropic: { label: "Anthropic Claude", color: C.blue },
    fallback: { label: "Local engine — add AWS keys", color: C.muted },
    unknown: { label: "Unknown", color: C.muted },
  }
  const m = meta[backend]
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={s.card}>
        <div style={s.cardTitle}>Backend</div>
        <div style={{ ...s.row, justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: C.muted }}>API endpoint</span>
          <span style={{ fontSize: 11, fontFamily: "monospace" }}>{API_BASE}</span>
        </div>
        <div style={{ ...s.row, justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: C.muted }}>Status</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: err ? C.red : C.green }}>{err ? "Disconnected" : "Connected"}</span>
        </div>
      </div>
      <div style={s.card}>
        <div style={s.cardTitle}>AI Engine</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: m.color, boxShadow: `0 0 6px ${m.color}` }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: m.color }}>{m.label}</span>
        </div>
        <div style={{ fontSize: 10.5, color: C.muted, marginTop: 6, lineHeight: 1.4 }}>
          Set BEDROCK_MODEL_ID + AWS credentials on the backend to route AI through AWS Bedrock.
        </div>
      </div>
      <div style={{ fontSize: 10, color: C.muted, textAlign: "center" }}>SentinelAI Guardian v0.1.0 · never auto-signs</div>
    </div>
  )
}

// --- Shared bits --------------------------------------------------------
function Loading() { return <div style={{ color: C.muted, fontSize: 12, textAlign: "center", padding: 24 }}>Loading…</div> }
function Disconnected() {
  return (
    <div style={{ color: C.muted, fontSize: 12, textAlign: "center", padding: 24 }}>
      Can't reach the backend.<br />Start it with <code style={{ color: C.blue }}>pnpm dev</code> or set the API URL.
    </div>
  )
}

function Nav({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const items: [Tab, string, string][] = [
    ["home", "🏠", "Home"], ["wallet", "💼", "Wallet"], ["approvals", "🔑", "Approvals"],
    ["threats", "📡", "Threats"], ["copilot", "🤖", "Copilot"], ["settings", "⚙️", "Settings"],
  ]
  return (
    <div style={s.nav}>
      {items.map(([id, icon, label]) => (
        <button key={id} onClick={() => setTab(id)} style={{ ...s.navBtn, color: tab === id ? C.blue : C.muted, background: tab === id ? `${C.blue}14` : "transparent" }}>
          <div style={{ fontSize: 15 }}>{icon}</div>
          <div style={{ fontSize: 8.5 }}>{label}</div>
        </button>
      ))}
    </div>
  )
}

function timeAgo(iso: string): string {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 60) return `${m}m`
  const h = Math.round(m / 60)
  return h < 24 ? `${h}h` : `${Math.round(h / 24)}d`
}

const s: Record<string, React.CSSProperties> = {
  root: { width: 360, height: 480, background: C.bg, color: C.text, display: "flex", flexDirection: "column", fontFamily: "ui-sans-serif, system-ui, sans-serif" },
  header: { display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: `1px solid ${C.border}`, background: C.panel2 },
  logo: { width: 30, height: 30, borderRadius: 9, background: `${C.blue}1a`, border: `1px solid ${C.blue}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 },
  connectBtn: { background: C.blue, color: "#06121f", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" },
  addrPill: { display: "flex", alignItems: "center", gap: 6, background: `${C.green}14`, border: `1px solid ${C.green}33`, color: C.text, borderRadius: 999, padding: "5px 10px", fontSize: 11, fontFamily: "monospace", cursor: "pointer" },
  body: { flex: 1, overflow: "auto", padding: 14 },
  card: { background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14 },
  cardTitle: { fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 },
  row: { display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: `1px solid ${C.border}` },
  barTrack: { height: 7, borderRadius: 999, background: "rgba(255,255,255,0.07)", overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 999 },
  input: { flex: 1, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 10px", color: C.text, fontSize: 12, outline: "none" },
  sendBtn: { width: 38, borderRadius: 10, border: "none", background: C.blue, color: "#06121f", fontWeight: 700, cursor: "pointer" },
  nav: { display: "grid", gridTemplateColumns: "repeat(6,1fr)", borderTop: `1px solid ${C.border}`, background: C.panel2 },
  navBtn: { display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "8px 0", border: "none", cursor: "pointer", fontWeight: 600 },
}
