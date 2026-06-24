"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, ExternalLink, ShieldOff, Zap } from "lucide-react"
import { api, type FeedThreat } from "@/lib/api"

interface Row {
  type: string
  protocol: string
  severity: string
  status: string
  source: string
  icon: typeof AlertTriangle
}

const ICONS: Record<string, typeof AlertTriangle> = {
  "Phishing Domain": AlertTriangle,
  "Scam Address": ShieldOff,
}

function toRow(t: FeedThreat): Row {
  const sev = t.severity.charAt(0).toUpperCase() + t.severity.slice(1)
  return {
    type: t.type,
    protocol: t.title,
    severity: sev,
    status: "Blocklisted",
    source: t.source,
    icon: ICONS[t.type] ?? AlertTriangle,
  }
}

const severityConfig: Record<string, { bg: string; text: string; border: string }> = {
  Critical: { bg: "#EF444415", text: "#EF4444", border: "#EF444430" },
  High:     { bg: "#F59E0B15", text: "#F59E0B", border: "#F59E0B30" },
  Medium:   { bg: "#8B5CF615", text: "#8B5CF6", border: "#8B5CF630" },
  Low:      { bg: "#4F9CF915", text: "#4F9CF9", border: "#4F9CF930" },
}

const statusConfig: Record<string, { text: string; color: string }> = {
  Blocked: { text: "Blocked", color: "#22C55E" },
  Flagged: { text: "Flagged", color: "#F59E0B" },
}

export function RecentThreatsTable() {
  const [threats, setThreats] = useState<Row[]>([])

  useEffect(() => {
    api.threats()
      .then(({ threats }) => setThreats(threats.map(toRow)))
      .catch(() => {})
  }, [])

  return (
    <div className="rounded-2xl bg-[#111827] border border-white/[0.06] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
          <span className="text-sm font-semibold text-foreground">Recent Threats</span>
          <span className="text-xs bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20 px-2 py-0.5 rounded-full font-medium">
            {threats.length} live
          </span>
        </div>
        <button className="flex items-center gap-1 text-xs text-[#4F9CF9] hover:text-[#6fb0ff] transition-colors">
          View all <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-12 gap-2 px-5 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest border-b border-white/[0.04]">
        <div className="col-span-4">Type</div>
        <div className="col-span-3">Protocol</div>
        <div className="col-span-2">Severity</div>
        <div className="col-span-1">Status</div>
        <div className="col-span-2">Source</div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-white/[0.04]">
        {threats.map((t, i) => {
          const sev = severityConfig[t.severity]
          return (
            <div
              key={i}
              className="grid grid-cols-12 gap-2 px-5 py-3 items-center hover:bg-white/[0.02] transition-colors cursor-pointer"
            >
              <div className="col-span-4 flex items-center gap-2">
                <t.icon className="w-3.5 h-3.5 shrink-0" style={{ color: sev.text }} />
                <span className="text-xs text-foreground truncate">{t.type}</span>
              </div>
              <div className="col-span-3">
                <span className="text-xs text-muted-foreground font-mono truncate">{t.protocol}</span>
              </div>
              <div className="col-span-2">
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                  style={{ color: sev.text, background: sev.bg, border: `1px solid ${sev.border}` }}
                >
                  {t.severity}
                </span>
              </div>
              <div className="col-span-1">
                <span className="text-[10px] font-semibold text-[#22C55E]">{t.status}</span>
              </div>
              <div className="col-span-2">
                <span className="text-[10px] text-muted-foreground truncate">{t.source}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
