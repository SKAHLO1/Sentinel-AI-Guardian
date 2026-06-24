"use client"

import { useEffect, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { ShieldAlert } from "lucide-react"
import { api, type Approval } from "@/lib/api"
import { useWallet } from "@/lib/wallet-context"
import { ConnectPrompt, ProviderPrompt } from "@/components/sentinel/empty-states"

const RISK_META = [
  { key: "critical", label: "Critical", color: "#EF4444" },
  { key: "high", label: "High", color: "#F59E0B" },
  { key: "medium", label: "Medium", color: "#8B5CF6" },
  { key: "low", label: "Low", color: "#22C55E" },
]

interface TooltipProps {
  active?: boolean
  payload?: Array<{ value: number; payload: { label: string } }>
}
function CustomTooltip({ active, payload }: TooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl bg-[#1A2332] border border-white/10 px-3 py-2 text-xs shadow-xl">
        <div className="font-semibold text-foreground">{payload[0].payload.label}</div>
        <div className="text-muted-foreground">{payload[0].value} approvals</div>
      </div>
    )
  }
  return null
}

export function RiskTimeline() {
  const { address } = useWallet()
  const [approvals, setApprovals] = useState<Approval[] | null>(null)
  const [configured, setConfigured] = useState(true)

  useEffect(() => {
    if (!address) { setApprovals(null); return }
    api.approvals(address)
      .then((r) => { setConfigured(r.configured); setApprovals(r.configured ? r.approvals : []) })
      .catch(() => setApprovals([]))
  }, [address])

  if (!address) return <ConnectPrompt label="Connect your wallet to see your approval risk breakdown." />
  if (!configured) return <ProviderPrompt />

  const data = RISK_META.map((m) => ({
    label: m.label,
    color: m.color,
    count: (approvals ?? []).filter((a) => a.risk === m.key).length,
  }))
  const total = (approvals ?? []).length

  return (
    <div className="rounded-2xl bg-[#111827] border border-white/[0.06] p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <ShieldAlert className="w-4 h-4 text-[#4F9CF9]" />
            <span className="text-sm font-semibold text-foreground">Approval Risk Breakdown</span>
          </div>
          <p className="text-xs text-muted-foreground">Live, grouped by severity</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
          <span className="text-[10px] font-semibold text-muted-foreground">{total} total</span>
        </div>
      </div>

      <div className="flex-1" style={{ minHeight: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
            <XAxis dataKey="label" tick={{ fill: "#6B7A8D", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fill: "#6B7A8D", fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-3 flex-wrap mt-4 pt-4 border-t border-white/[0.06]">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
            <span className="text-xs text-muted-foreground">{d.label} · {d.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
