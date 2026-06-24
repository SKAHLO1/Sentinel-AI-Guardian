"use client"

import { useEffect, useState } from "react"
import { History, ShieldOff, AlertTriangle, CheckCircle2, Trash2, Loader2 } from "lucide-react"
import { api, type ScanEvent } from "@/lib/api"
import { useWallet } from "@/lib/wallet-context"

const verdictCfg: Record<string, { color: string; icon: typeof AlertTriangle; status: string }> = {
  danger: { color: "#EF4444", icon: ShieldOff, status: "Blocked" },
  warning: { color: "#F59E0B", icon: AlertTriangle, status: "Flagged" },
  safe: { color: "#22C55E", icon: CheckCircle2, status: "Cleared" },
}

function timeAgo(iso: string): string {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} hr ago`
  return `${Math.round(h / 24)} d ago`
}

export function ScanHistory() {
  const { address } = useWallet()
  const [events, setEvents] = useState<ScanEvent[] | null>(null)
  const [state, setState] = useState<"loading" | "ready" | "no-db">("loading")

  useEffect(() => {
    if (!address) { setEvents(null); setState("ready"); return }
    setState("loading")
    api.history(address)
      .then((r) => {
        if (!r.configured) return setState("no-db")
        setEvents(r.events); setState("ready")
      })
      .catch(() => setState("ready"))
  }, [address])

  async function clear() {
    if (!address) return
    setEvents([])
    try { await fetch(`/api/history?address=${address}`, { method: "DELETE" }) } catch { /* optimistic */ }
  }

  return (
    <div className="rounded-2xl bg-[#111827] border border-white/[0.06] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-[#4F9CF9]" />
          <span className="text-sm font-semibold text-foreground">Your Scan History</span>
          {events && events.length > 0 && (
            <span className="text-xs bg-[#4F9CF9]/10 text-[#4F9CF9] border border-[#4F9CF9]/20 px-2 py-0.5 rounded-full font-medium">
              {events.length}
            </span>
          )}
        </div>
        {events && events.length > 0 && (
          <button onClick={clear} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-[#EF4444] transition-colors">
            <Trash2 className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {state === "loading" && (
        <div className="flex items-center justify-center gap-2 text-muted-foreground py-12 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading history…
        </div>
      )}

      {state === "no-db" && (
        <div className="text-center text-xs text-muted-foreground py-12 px-6 leading-relaxed">
          History storage not configured. Set <code className="text-[#4F9CF9]">DYNAMODB_TABLE</code> on the backend
          to persist and recall your scans.
        </div>
      )}

      {state === "ready" && !address && (
        <div className="text-center text-xs text-muted-foreground py-12 px-6">
          Connect your wallet to see your saved scan history.
        </div>
      )}

      {state === "ready" && address && events?.length === 0 && (
        <div className="text-center text-xs text-muted-foreground py-12 px-6">
          No scans yet. Analyze a transaction in the Simulator — results are saved here automatically.
        </div>
      )}

      {state === "ready" && events && events.length > 0 && (
        <div className="divide-y divide-white/[0.04] max-h-[360px] overflow-auto">
          {events.map((e) => {
            const cfg = verdictCfg[e.verdict] ?? verdictCfg.safe
            const Icon = cfg.icon
            return (
              <div key={e.id} className="grid grid-cols-12 gap-2 px-5 py-3 items-center hover:bg-white/[0.02] transition-colors">
                <div className="col-span-5 flex items-center gap-2 min-w-0">
                  <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: cfg.color }} />
                  <span className="text-xs text-foreground truncate">{e.label ?? e.summary ?? e.kind}</span>
                </div>
                <div className="col-span-3 truncate">
                  <span className="text-xs text-muted-foreground font-mono truncate">{e.domain ?? e.to ?? e.kind}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] font-bold" style={{ color: cfg.color }}>{e.riskScore}/100</span>
                </div>
                <div className="col-span-2 text-right">
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">{timeAgo(e.createdAt)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
