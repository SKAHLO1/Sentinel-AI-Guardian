"use client"

import { useState } from "react"
import { AlertTriangle, XCircle, Bot, ArrowRight, CheckCircle2, ShieldOff, Info } from "lucide-react"
import { Button } from "@/components/ui/button"

export function WarningOverlay() {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) {
    return (
      <div className="bg-[#0D1117] p-8 flex flex-col items-center justify-center gap-4 text-center" style={{ minHeight: 300 }}>
        <CheckCircle2 className="w-12 h-12 text-[#22C55E]" />
        <div className="text-lg font-semibold text-foreground">Transaction Rejected</div>
        <p className="text-sm text-muted-foreground max-w-xs">Your wallet is safe. SentinelAI blocked a potentially dangerous transaction.</p>
        <Button size="sm" className="bg-[#4F9CF9] hover:bg-[#3a87e8] text-[#0A0A0A] font-semibold text-xs" onClick={() => setDismissed(false)}>
          Reset Demo
        </Button>
      </div>
    )
  }

  return (
    <div className="bg-[#0D1117] border border-[#EF4444]/25 rounded-2xl overflow-hidden">
      {/* Danger header strip */}
      <div className="flex items-center gap-3 px-5 py-4 bg-[#EF4444]/8 border-b border-[#EF4444]/20">
        <div className="relative w-9 h-9 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 flex items-center justify-center shrink-0">
          <ShieldOff className="w-4.5 h-4.5 text-[#EF4444]" style={{ width: 18, height: 18 }} />
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#EF4444] border-2 border-[#0D1117] flex items-center justify-center">
            <span className="text-white text-[7px] font-black">!</span>
          </span>
        </div>
        <div>
          <div className="text-sm font-bold text-[#EF4444] tracking-tight">High Risk Transaction Detected</div>
          <div className="text-[11px] text-[#EF4444]/70 mt-0.5">SentinelAI has intercepted this transaction</div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Risk score large display */}
        <div className="flex items-center gap-4 p-4 rounded-xl bg-[#EF4444]/5 border border-[#EF4444]/15">
          <div className="relative shrink-0">
            <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
              <circle cx="32" cy="32" r="24" fill="none" stroke="rgba(239,68,68,0.15)" strokeWidth="5" />
              <circle cx="32" cy="32" r="24" fill="none" stroke="#EF4444" strokeWidth="5"
                strokeDasharray={`${2 * Math.PI * 24 * 0.89} ${2 * Math.PI * 24}`}
                strokeLinecap="round"
                style={{ filter: "drop-shadow(0 0 6px rgba(239,68,68,0.7))" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-black text-[#EF4444]">89</span>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1">Risk Score</div>
            <div className="text-xl font-black text-[#EF4444]">89 / 100</div>
            <div className="text-xs text-[#EF4444]/80 mt-0.5 font-medium">Critical — Do Not Sign</div>
          </div>
        </div>

        {/* Warning items */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span className="text-xs font-semibold text-foreground">Detected Issues</span>
          </div>
          <div className="space-y-2">
            {[
              { severity: "critical", msg: "Unlimited approval detected — no spending cap set" },
              { severity: "critical", msg: "Contract age less than 3 days — never audited" },
              { severity: "high",     msg: "Similar contracts associated with known scams" },
            ].map((w, i) => {
              const color = w.severity === "critical" ? "#EF4444" : "#F59E0B"
              return (
                <div
                  key={i}
                  className="flex items-start gap-2.5 p-3 rounded-xl text-[11px] leading-snug"
                  style={{ background: `${color}0d`, border: `1px solid ${color}25` }}
                >
                  <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color }} />
                  <span style={{ color }}>{w.msg}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Protocol info */}
        <div className="grid grid-cols-2 gap-2.5 text-xs">
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
            <div className="text-[10px] text-muted-foreground mb-1">Contract</div>
            <div className="font-mono text-foreground text-[11px]">0xDef1...9a3e</div>
          </div>
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
            <div className="text-[10px] text-muted-foreground mb-1">Requesting</div>
            <div className="text-[#EF4444] font-semibold text-[11px]">Unlimited USDC</div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          <Button
            className="h-10 text-xs font-bold bg-[#EF4444] hover:bg-[#dc2626] text-white col-span-1 glow-red"
            onClick={() => setDismissed(true)}
          >
            <XCircle className="w-3.5 h-3.5 mr-1.5" /> Reject Transaction
          </Button>
          <Button
            variant="outline"
            className="h-10 text-xs border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-foreground col-span-1"
          >
            <Bot className="w-3.5 h-3.5 mr-1.5" /> Explain With AI
          </Button>
        </div>

        <button className="w-full text-center text-[11px] text-muted-foreground hover:text-[#EF4444] transition-colors py-1">
          Proceed Anyway (not recommended) <ArrowRight className="w-3 h-3 inline ml-1" />
        </button>
      </div>
    </div>
  )
}
