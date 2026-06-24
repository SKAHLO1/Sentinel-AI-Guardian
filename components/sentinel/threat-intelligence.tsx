"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, Globe, Wallet, Search, Database, Clock, Loader2, ExternalLink } from "lucide-react"
import { Input } from "@/components/ui/input"
import { api, type FeedThreat, type FeedStats } from "@/lib/api"

const severityCfg: Record<string, { color: string; bg: string; border: string }> = {
  critical: { color: "#EF4444", bg: "#EF444412", border: "#EF444330" },
  high:     { color: "#F59E0B", bg: "#F59E0B12", border: "#F59E0B30" },
  medium:   { color: "#8B5CF6", bg: "#8B5CF612", border: "#8B5CF630" },
  low:      { color: "#4F9CF9", bg: "#4F9CF912", border: "#4F9CF930" },
  info:     { color: "#6B7A8D", bg: "#6B7A8D12", border: "#6B7A8D30" },
}

export function ThreatIntelligence() {
  const [threats, setThreats] = useState<FeedThreat[]>([])
  const [stats, setStats] = useState<FeedStats | null>(null)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("all")
  const [loading, setLoading] = useState(true)

  // Load the live feed, then debounce searches against the real blocklists.
  useEffect(() => {
    setLoading(true)
    const run = search.trim()
      ? api.searchThreats(search.trim()).then((r) => ({ threats: r.results, stats: r.stats }))
      : api.threats()
    const t = setTimeout(() => {
      run.then((r) => { setThreats(r.threats); setStats(r.stats) })
        .catch(() => {})
        .finally(() => setLoading(false))
    }, search ? 350 : 0)
    return () => clearTimeout(t)
  }, [search])

  const filtered = threats.filter((t) => {
    if (category === "phishing") return t.type === "Phishing Domain"
    if (category === "address") return t.type === "Scam Address"
    return true
  })

  const updated = stats?.updatedAt ? new Date(stats.updatedAt).toLocaleString() : "—"

  return (
    <div className="space-y-5">
      {/* Stats banner — real counts from the live feeds */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Phishing Domains", value: stats?.phishingDomains.toLocaleString() ?? "—", color: "#EF4444", icon: Globe },
          { label: "Scam Addresses", value: stats?.scamAddresses.toLocaleString() ?? "—", color: "#F59E0B", icon: Wallet },
          { label: "Feed Sources", value: stats?.sources.length ?? "—", color: "#4F9CF9", icon: Database },
          { label: "Last Updated", value: updated, color: "#8B5CF6", icon: Clock, small: true },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-[#111827] border border-white/[0.06] p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${s.color}15`, border: `1px solid ${s.color}30` }}>
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
            </div>
            <div className="min-w-0">
              <div className={`font-bold text-foreground ${s.small ? "text-xs" : "text-xl"}`}>{s.value}</div>
              <div className="text-[11px] text-muted-foreground">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {stats?.sources.length ? (
        <div className="text-[11px] text-muted-foreground">
          Live sources: {stats.sources.join(", ")} — public, continuously-updated blocklists.
        </div>
      ) : null}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search domains or addresses in the live feed..."
            className="pl-9 h-9 bg-[#111827] border-white/[0.08] text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          {[["all", "All"], ["phishing", "Domains"], ["address", "Addresses"]].map(([c, label]) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                category === c ? "bg-[#4F9CF9] text-[#0A0A0A]" : "bg-white/[0.04] text-muted-foreground hover:bg-white/[0.07] border border-white/[0.06]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 text-muted-foreground py-16">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading live threat feed…
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center text-sm text-muted-foreground py-16">
          {search ? `No matches for "${search}" in the live blocklists.` : "Feed is empty or unreachable."}
        </div>
      )}

      {/* Threat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((threat) => {
          const sev = severityCfg[threat.severity] ?? severityCfg.info
          const Icon = threat.type === "Phishing Domain" ? Globe : Wallet
          return (
            <div key={threat.id} className="rounded-2xl bg-[#111827] border border-white/[0.06] p-5 hover:border-white/[0.1] transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: sev.bg, border: `1px solid ${sev.border}` }}>
                    <Icon className="w-4 h-4" style={{ color: sev.color }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: sev.color }}>{threat.type}</div>
                    <div className="text-sm font-semibold text-foreground mt-0.5 font-mono truncate">{threat.title}</div>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide" style={{ color: sev.color, background: sev.bg, border: `1px solid ${sev.border}` }}>
                  {threat.severity}
                </span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Database className="w-3 h-3" /> {threat.source}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
