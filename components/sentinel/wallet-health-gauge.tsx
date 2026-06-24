"use client"

import { useEffect, useState } from "react"
import { TrendingUp } from "lucide-react"
import { api, type LiveWallet } from "@/lib/api"
import { useWallet } from "@/lib/wallet-context"
import { ConnectPrompt, ProviderPrompt, LoadingState } from "@/components/sentinel/empty-states"

export function WalletHealthGauge() {
  const { address } = useWallet()
  const [health, setHealth] = useState<LiveWallet | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!address) { setHealth(null); return }
    setLoading(true)
    api.wallet(address).then(setHealth).catch(() => setHealth(null)).finally(() => setLoading(false))
  }, [address])

  if (!address) return <ConnectPrompt label="Connect your wallet to see your live health score." />
  if (loading && !health) return <LoadingState />
  if (health && !health.configured) return <ProviderPrompt />

  const score = health?.healthScore ?? 0
  const color = score >= 75 ? "#22C55E" : score >= 50 ? "#F59E0B" : "#EF4444"
  const statusLabel =
    score >= 90 ? "Excellent — Protected" : score >= 75 ? "Good — Low Exposure" : score >= 50 ? "Fair — Review Approvals" : "At Risk — Act Now"
  const radius = 56
  const circumference = 2 * Math.PI * radius
  const strokeDasharray = `${circumference * (score / 100)} ${circumference}`

  return (
    <div className="rounded-2xl bg-[#111827] border border-white/[0.06] p-6 flex flex-col items-center justify-center gap-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-[#22C55E]/3 rounded-2xl pointer-events-none" />

      <div className="text-sm font-semibold text-foreground w-full">Wallet Health Score</div>

      {/* SVG Gauge */}
      <div className="relative flex items-center justify-center">
        <svg width="160" height="160" viewBox="0 0 160 160" className="-rotate-90">
          {/* Track */}
          <circle
            cx="80" cy="80" r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="10"
          />
          {/* Progress */}
          <circle
            cx="80" cy="80" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeDasharray={strokeDasharray}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 8px ${color}99)` }}
          />
          {/* Segmented ticks */}
          {[...Array(20)].map((_, i) => {
            const angle = (i / 20) * 360 - 90
            const rad = (angle * Math.PI) / 180
            const x1 = 80 + (radius - 14) * Math.cos(rad)
            const y1 = 80 + (radius - 14) * Math.sin(rad)
            const x2 = 80 + (radius - 8) * Math.cos(rad)
            const y2 = 80 + (radius - 8) * Math.sin(rad)
            return (
              <line
                key={i}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="1.5"
              />
            )
          })}
        </svg>

        {/* Center text */}
        <div className="absolute flex flex-col items-center">
          <span className="text-4xl font-bold" style={{ color, textShadow: `0 0 20px ${color}80` }}>
            {score}
          </span>
          <span className="text-xs text-muted-foreground">/100</span>
        </div>
      </div>

      {/* Status label */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: `${color}1a`, border: `1px solid ${color}33` }}>
        <TrendingUp className="w-3.5 h-3.5" style={{ color }} />
        <span className="text-xs font-semibold" style={{ color }}>{statusLabel}</span>
      </div>

      {/* Sub metrics */}
      <div className="w-full space-y-2 mt-1">
        {[
          { label: "Risk Score", value: health?.riskScore ?? 0, color: (health?.riskScore ?? 0) > 50 ? "#EF4444" : "#22C55E" },
          { label: "Exposure Score", value: health?.exposureScore ?? 0, color: (health?.exposureScore ?? 0) > 50 ? "#F59E0B" : "#22C55E" },
          { label: "Unlimited Approvals", value: health?.unlimitedApprovals ?? 0, color: (health?.unlimitedApprovals ?? 0) > 2 ? "#EF4444" : "#22C55E" },
        ].map((m) => (
          <div key={m.label} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-28 shrink-0">{m.label}</span>
            <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${m.value}%`, backgroundColor: m.color }}
              />
            </div>
            <span className="text-xs font-medium" style={{ color: m.color }}>{m.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
