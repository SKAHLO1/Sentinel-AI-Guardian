"use client"

import { useState } from "react"
import {
  Shield, Globe, AlertTriangle, CheckCircle2, Wallet,
  ExternalLink, Bot, Zap, LayoutDashboard, ShieldCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface ExtensionPopupProps {
  onSimulateRisk?: () => void
}

export function ExtensionPopup({ onSimulateRisk }: ExtensionPopupProps) {
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzed, setAnalyzed] = useState(false)

  const handleAnalyze = () => {
    setAnalyzing(true)
    setTimeout(() => { setAnalyzing(false); setAnalyzed(true) }, 1600)
  }

  return (
    <div className="bg-[#0D1117] w-full select-none" style={{ width: 380 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="relative w-6 h-6 rounded-md bg-[#4F9CF9]/10 border border-[#4F9CF9]/30 flex items-center justify-center">
            <Shield className="w-3 h-3 text-[#4F9CF9]" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#22C55E] border border-[#0D1117]" />
          </div>
          <span className="text-xs font-semibold text-foreground">SentinelAI</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/20">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] pulse-green" />
          <span className="text-[10px] font-semibold text-[#22C55E]">Active</span>
        </div>
      </div>

      {/* Current site */}
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
          <div className="w-7 h-7 rounded-lg bg-[#22C55E]/12 border border-[#22C55E]/20 flex items-center justify-center">
            <Globe className="w-3.5 h-3.5 text-[#22C55E]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-foreground truncate">app.uniswap.org</div>
            <div className="text-[10px] text-muted-foreground">Uniswap Interface</div>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-semibold text-[#22C55E] bg-[#22C55E]/10 px-2 py-0.5 rounded-full border border-[#22C55E]/20">
            <CheckCircle2 className="w-2.5 h-2.5" /> Safe
          </div>
        </div>
      </div>

      {/* Safety Score */}
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2.5">Site Safety Score</div>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex-1 h-2.5 rounded-full bg-white/[0.05] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: "94%", background: "linear-gradient(90deg, #22C55E, #4F9CF9)" }}
            />
          </div>
          <span className="text-sm font-bold text-[#22C55E] w-8 text-right">94</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-[#22C55E]" /> SSL Valid</span>
          <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-[#22C55E]" /> Domain Age 3yr+</span>
          <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-[#22C55E]" /> Known Safe</span>
        </div>
      </div>

      {/* Wallet status */}
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2.5">Connected Wallet</div>
        <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
          <div className="w-7 h-7 rounded-full bg-[#4F9CF9]/15 border border-[#4F9CF9]/25 flex items-center justify-center">
            <Wallet className="w-3.5 h-3.5 text-[#4F9CF9]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-mono text-foreground">0x3f4a...8b2c</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-muted-foreground">Health:</span>
              <span className="text-[10px] font-bold text-[#22C55E]">92/100</span>
              <span className="text-[10px] text-muted-foreground">· MetaMask</span>
            </div>
          </div>
          <Shield className="w-3.5 h-3.5 text-[#22C55E]" />
        </div>
      </div>

      {/* Warnings section */}
      {analyzed && (
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Pending Warnings</div>
          <div className="space-y-2">
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-[#F59E0B]/8 border border-[#F59E0B]/20">
              <AlertTriangle className="w-3 h-3 text-[#F59E0B] shrink-0 mt-0.5" />
              <span className="text-[11px] text-[#F59E0B] leading-tight">Unlimited USDC approval detected in pending transaction</span>
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="px-4 py-3 space-y-2">
        <Button
          className="w-full h-9 text-xs font-semibold bg-[#4F9CF9] hover:bg-[#3a87e8] text-[#0A0A0A] transition-all"
          onClick={handleAnalyze}
          disabled={analyzing}
        >
          {analyzing ? (
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full border-2 border-[#0A0A0A]/30 border-t-[#0A0A0A] animate-spin" />
              Analyzing Transaction...
            </span>
          ) : (
            <><Zap className="w-3.5 h-3.5 mr-2" /> Analyze Transaction</>
          )}
        </Button>

        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-[11px] border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-muted-foreground hover:text-foreground"
            asChild
          >
            <a href="/dashboard" target="_blank" rel="noreferrer">
              <LayoutDashboard className="w-3 h-3 mr-1" /> Dashboard
            </a>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-[11px] border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-muted-foreground hover:text-foreground"
            asChild
          >
            <a href="/dashboard/approvals" target="_blank" rel="noreferrer">
              <ShieldCheck className="w-3 h-3 mr-1" /> Revoke
            </a>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-[11px] border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-muted-foreground hover:text-foreground"
            asChild
          >
            <a href="/dashboard/copilot" target="_blank" rel="noreferrer">
              <Bot className="w-3 h-3 mr-1" /> AI Explain
            </a>
          </Button>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-white/[0.06] flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">v2.4.1 · Pro</span>
        <a href="/dashboard" className="flex items-center gap-1 text-[10px] text-[#4F9CF9] hover:underline">
          Full Dashboard <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </div>
    </div>
  )
}
