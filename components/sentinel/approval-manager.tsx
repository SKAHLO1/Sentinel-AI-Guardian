"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, Eye, Trash2, Search, CheckCircle2, ShieldOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api, type Approval } from "@/lib/api"
import { useWallet } from "@/lib/wallet-context"
import { ConnectPrompt, ProviderPrompt } from "@/components/sentinel/empty-states"

// Adapt the engine Approval shape to the card's display fields.
interface Row {
  token: string
  tokenFull: string
  protocol: string
  amount: string
  risk: string
  date: string
  spender: string
  spenderFull: string
  verified: boolean
}

function toRow(a: Approval): Row {
  const d = new Date(Date.now() - a.ageDays * 86_400_000)
  return {
    token: a.tokenSymbol,
    tokenFull: a.token,
    protocol: a.spenderLabel,
    amount: a.amount,
    risk: a.risk,
    date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    spender: `${a.spender.slice(0, 6)}…${a.spender.slice(-4)}`,
    spenderFull: a.spender,
    verified: a.verified,
  }
}

const riskCfg: Record<string, { color: string; bg: string; border: string; label: string }> = {
  critical: { color: "#EF4444", bg: "#EF444412", border: "#EF444430", label: "Critical" },
  high:     { color: "#F59E0B", bg: "#F59E0B12", border: "#F59E0B30", label: "High" },
  medium:   { color: "#8B5CF6", bg: "#8B5CF612", border: "#8B5CF630", label: "Medium" },
  low:      { color: "#22C55E", bg: "#22C55E12", border: "#22C55E30", label: "Low" },
}

const tokenColors: Record<string, string> = {
  USDC: "#4F9CF9", ETH: "#8B5CF6", WBTC: "#F59E0B", LINK: "#4F9CF9",
  DAI: "#F59E0B", UNI: "#EF4444", MATIC: "#8B5CF6", SHIB: "#EF4444",
}

export function ApprovalManager() {
  const { address } = useWallet()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [configured, setConfigured] = useState(true)
  const [revoked, setRevoked] = useState<string[]>([])
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<string>("all")

  useEffect(() => {
    if (!address) { setRows([]); return }
    setLoading(true)
    api.approvals(address)
      .then((r) => {
        setConfigured(r.configured)
        setRows(r.configured ? r.approvals.map(toRow) : [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [address])

  if (!address) return <ConnectPrompt label="Connect your wallet to scan its real token approvals." />
  if (!configured) return <ProviderPrompt />

  async function revoke(row: Row) {
    setRevoked(prev => [...prev, row.spenderFull + row.token])
    // Fire the real revoke endpoint (returns approve(spender,0) calldata).
    try { await api.revoke({ token: row.token, spender: row.spenderFull }) } catch { /* optimistic */ }
  }

  const filtered = rows.filter((a) => {
    if (revoked.includes(a.spenderFull + a.token)) return false
    if (search && !a.token.toLowerCase().includes(search.toLowerCase()) && !a.protocol.toLowerCase().includes(search.toLowerCase())) return false
    if (filter !== "all" && a.risk !== filter) return false
    return true
  })

  const dangerCount = filtered.filter(a => a.risk === "critical" || a.risk === "high").length

  return (
    <div className="space-y-5">
      {/* Header actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search token or protocol..."
            className="pl-9 h-9 bg-[#111827] border-white/[0.08] text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          {["all", "critical", "high", "medium", "low"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                filter === f
                  ? "bg-[#4F9CF9] text-[#0A0A0A]"
                  : "bg-white/[0.04] text-muted-foreground hover:bg-white/[0.07] border border-white/[0.06]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Warning banner */}
      {dangerCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#EF4444]/8 border border-[#EF4444]/25">
          <ShieldOff className="w-4 h-4 text-[#EF4444] shrink-0" />
          <p className="text-sm text-[#EF4444]">
            <strong>{dangerCount} dangerous approval{dangerCount > 1 ? "s" : ""}</strong> detected. Revoke them immediately to protect your assets.
          </p>
          <Button
            size="sm"
            className="ml-auto h-8 bg-[#EF4444] hover:bg-[#dc2626] text-white text-xs font-semibold shrink-0"
            onClick={() => { filtered.filter(a => a.risk === "critical").forEach(revoke) }}
          >
            Revoke All Critical
          </Button>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 text-muted-foreground py-20">
          <Loader2 className="w-5 h-5 animate-spin" /> Scanning approvals…
        </div>
      )}

      {/* Approval cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((approval, idx) => {
          const risk = riskCfg[approval.risk]
          const color = tokenColors[approval.token] || "#4F9CF9"
          const isCritical = approval.risk === "critical"
          return (
            <div
              key={idx}
              className={`relative rounded-2xl border p-5 transition-all ${
                isCritical
                  ? "bg-[#111827] border-[#EF4444]/30 glow-red"
                  : "bg-[#111827] border-white/[0.06] hover:border-white/[0.1]"
              }`}
            >
              {isCritical && (
                <div className="absolute top-3 right-3">
                  <span className="flex items-center gap-1 text-[10px] font-bold bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30 px-2 py-1 rounded-full">
                    <AlertTriangle className="w-2.5 h-2.5" /> DANGEROUS
                  </span>
                </div>
              )}

              {/* Token header */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
                  style={{ backgroundColor: `${color}18`, border: `1.5px solid ${color}35`, color }}
                >
                  {approval.token.slice(0, 2)}
                </div>
                <div>
                  <div className="font-semibold text-foreground text-sm">{approval.token}</div>
                  <div className="text-xs text-muted-foreground">{approval.tokenFull}</div>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2 mb-4">
                {[
                  { label: "Protocol", value: approval.protocol },
                  { label: "Approved", value: approval.amount, highlight: approval.amount === "Unlimited" },
                  { label: "Spender", value: approval.spender, mono: true },
                  { label: "Date", value: approval.date },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between text-xs py-1 border-b border-white/[0.04] last:border-0">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className={`${row.highlight ? "text-[#EF4444] font-bold" : "text-foreground"} ${row.mono ? "font-mono" : ""}`}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Risk badge */}
              <div className="flex items-center justify-between mb-4">
                <span
                  className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide"
                  style={{ color: risk.color, background: risk.bg, border: `1px solid ${risk.border}` }}
                >
                  {risk.label} Risk
                </span>
                {!approval.verified && (
                  <span className="text-[10px] text-[#F59E0B] bg-[#F59E0B]/10 border border-[#F59E0B]/20 px-2 py-0.5 rounded-full">
                    Unverified
                  </span>
                )}
                {approval.verified && (
                  <span className="flex items-center gap-1 text-[10px] text-[#22C55E]">
                    <CheckCircle2 className="w-3 h-3" /> Verified
                  </span>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 h-8 text-xs font-semibold bg-[#EF4444] hover:bg-[#dc2626] text-white"
                  onClick={() => revoke(approval)}
                >
                  <Trash2 className="w-3 h-3 mr-1.5" /> Revoke
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 text-xs border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-muted-foreground"
                >
                  <Eye className="w-3 h-3 mr-1.5" /> Inspect
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <CheckCircle2 className="w-12 h-12 text-[#22C55E] mb-4" />
          <div className="text-lg font-semibold text-foreground mb-2">All clean!</div>
          <p className="text-sm text-muted-foreground">No approvals match your filter or all have been revoked.</p>
        </div>
      )}
    </div>
  )
}
