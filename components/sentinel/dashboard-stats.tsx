"use client"

import { useEffect, useState } from "react"
import { Shield, AlertTriangle, CheckCircle2, TrendingUp, Zap, Coins } from "lucide-react"
import { api, type LiveWallet } from "@/lib/api"
import { useWallet } from "@/lib/wallet-context"

export function DashboardStats() {
  const { address } = useWallet()
  const [w, setW] = useState<LiveWallet | null>(null)

  useEffect(() => {
    if (!address) { setW(null); return }
    api.wallet(address).then(setW).catch(() => setW(null))
  }, [address])

  const note = !address ? "Connect wallet" : w && !w.configured ? "Configure Alchemy" : null
  const v = (n?: number) => (note || n === undefined ? "—" : String(n))

  const stats = [
    { label: "Total Approvals", value: v(w?.totalApprovals), sub: note ?? "Active on-chain", icon: CheckCircle2, color: "#4F9CF9", warn: false },
    { label: "Unlimited Approvals", value: v(w?.unlimitedApprovals), sub: note ?? "No spending cap", icon: AlertTriangle, color: "#F59E0B", warn: (w?.unlimitedApprovals ?? 0) > 0 },
    { label: "Risky Approvals", value: v(w?.riskyApprovals), sub: note ?? "High / critical", icon: Zap, color: "#EF4444", warn: (w?.riskyApprovals ?? 0) > 0 },
    { label: "Tokens Held", value: v(w?.tokenCount), sub: note ?? "With a balance", icon: Coins, color: "#8B5CF6", warn: false },
    { label: "Exposure Score", value: note ? "—" : `${w?.exposureScore ?? 0}/100`, sub: note ?? "Attack surface", icon: TrendingUp, color: "#F59E0B", warn: false },
    { label: "Risk Score", value: note ? "—" : `${w?.riskScore ?? 0}/100`, sub: note ?? "Overall risk", icon: Shield, color: "#22C55E", warn: false },
  ]

  return (
    <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-2xl bg-[#111827] border border-white/[0.06] p-4 hover:border-white/[0.1] transition-colors group relative overflow-hidden"
        >
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-2xl"
            style={{ background: `radial-gradient(circle at top left, ${stat.color}08, transparent 60%)` }}
          />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground">{stat.label}</span>
              <div
                className="flex items-center justify-center w-7 h-7 rounded-lg"
                style={{ backgroundColor: `${stat.color}12`, border: `1px solid ${stat.color}25` }}
              >
                <stat.icon className="w-3.5 h-3.5" style={{ color: stat.color }} />
              </div>
            </div>
            <div className="text-2xl font-bold text-foreground mb-1">{stat.value}</div>
            <div className="text-xs font-medium" style={{ color: stat.warn ? "#F59E0B" : "#6B7A8D" }}>
              {stat.sub}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
