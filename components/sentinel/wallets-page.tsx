"use client"

import { useEffect, useState } from "react"
import { Wallet, Shield, TrendingUp, AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react"
import { api, type LiveWallet } from "@/lib/api"
import { useWallet } from "@/lib/wallet-context"
import { ConnectPrompt, ProviderPrompt, LoadingState } from "@/components/sentinel/empty-states"

const scoreColor = (score: number) => (score >= 80 ? "#22C55E" : score >= 60 ? "#F59E0B" : "#EF4444")

export function WalletsPage() {
  const { address } = useWallet()
  const [health, setHealth] = useState<LiveWallet | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!address) { setHealth(null); return }
    setLoading(true)
    api.wallet(address).then(setHealth).catch(() => setHealth(null)).finally(() => setLoading(false))
  }, [address])

  if (!address) return <ConnectPrompt label="Connect a wallet to monitor it in real time." />
  if (loading && !health) return <LoadingState />
  if (health && !health.configured) return <ProviderPrompt />

  const score = health?.healthScore ?? 0
  const color = scoreColor(score)
  const risky = health?.riskyApprovals ?? 0

  return (
    <div className="space-y-5">
      {/* Summary row — real metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Health Score", value: `${score}/100`, color, icon: TrendingUp },
          { label: "Total Approvals", value: String(health?.totalApprovals ?? 0), color: "#4F9CF9", icon: Shield },
          { label: "Risky Approvals", value: String(risky), color: "#EF4444", icon: AlertTriangle },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-[#111827] border border-white/[0.06] p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${s.color}15`, border: `1px solid ${s.color}30` }}>
              <s.icon className="w-5 h-5" style={{ color: s.color }} />
            </div>
            <div>
              <div className="text-xl font-bold text-foreground">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-foreground">Connected Wallet</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Live data via Alchemy</p>
      </div>

      {/* The one real connected wallet */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-white/[0.06] bg-[#111827] p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#4F9CF9]/10 border border-[#4F9CF9]/20 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-[#4F9CF9]" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">My Wallet</div>
                <div className="text-xs text-muted-foreground font-mono">{address.slice(0, 6)}…{address.slice(-4)}</div>
              </div>
            </div>
            <a
              href={`https://etherscan.io/address/${address}`}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-[#4F9CF9] hover:bg-[#4F9CF9]/10 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/[0.06]">
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Tokens Held</div>
              <div className="text-lg font-bold text-foreground">{health?.tokenCount ?? 0}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground mb-0.5">Grade</div>
              <div className="text-sm font-medium" style={{ color }}>{health?.grade ?? "—"}</div>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Health Score</span>
              <span className="text-sm font-bold" style={{ color }}>{score}/100</span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: color }} />
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" />
              <span className="text-muted-foreground">{health?.totalApprovals ?? 0} approvals</span>
            </div>
            {risky > 0 && (
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-[#EF4444]" />
                <span className="text-[#EF4444] font-medium">{risky} risky</span>
              </div>
            )}
            <span className="ml-auto flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] pulse-green" />
              <span className="text-[11px] font-semibold text-[#22C55E]">Protected</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
