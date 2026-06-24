"use client"

import Link from "next/link"
import { ArrowRight, Play, Shield, TrendingUp, AlertTriangle, CheckCircle2, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-14 overflow-hidden">
      {/* Background glow blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[#4F9CF9]/5 blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full bg-[#22C55E]/4 blur-[100px]" />
        {/* Grid lines */}
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }} />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-5xl mx-auto">
        {/* Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#4F9CF9]/30 bg-[#4F9CF9]/5 text-[#4F9CF9] text-xs font-medium mb-8">
          <Zap className="w-3 h-3" />
          <span>AI-Powered Web3 Security — Now in Beta</span>
          <ArrowRight className="w-3 h-3" />
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground text-balance leading-[1.05] mb-6">
          Stop{" "}
          <span className="relative">
            <span className="text-[#4F9CF9]">Blind Signing.</span>
            <span className="absolute inset-x-0 -bottom-2 h-px bg-gradient-to-r from-transparent via-[#4F9CF9]/60 to-transparent" />
          </span>
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground text-balance max-w-2xl leading-relaxed mb-10">
          SentinelAI protects your wallet from malicious approvals, phishing contracts, and hidden transaction risks{" "}
          <span className="text-foreground font-medium">before you sign.</span>
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 mb-16">
          <Button
            size="lg"
            className="bg-[#4F9CF9] hover:bg-[#3a87e8] text-[#0A0A0A] font-semibold h-11 px-7 transition-all glow-blue"
            asChild
          >
            <Link href="/install">
              Get Extension <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-11 px-7 border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-foreground font-medium transition-all"
            asChild
          >
            <Link href="/dashboard">
              <Play className="w-3.5 h-3.5 mr-2 fill-current" /> Open Dashboard
            </Link>
          </Button>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-8 text-sm text-muted-foreground mb-16">
          {[
            { value: "2.4M+", label: "Threats Blocked" },
            { value: "$180M", label: "Assets Protected" },
            { value: "99.8%", label: "Detection Rate" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-xl font-bold text-foreground">{s.value}</div>
              <div className="text-xs mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Animated dashboard mockup */}
        <div className="relative w-full max-w-4xl rounded-2xl overflow-hidden glass gradient-border">
          {/* Mockup header bar */}
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E]/60" />
            <span className="mx-auto text-xs text-muted-foreground font-mono">sentinelai.io/dashboard</span>
          </div>

          {/* Mock dashboard content */}
          <div className="p-6 grid grid-cols-3 gap-4">
            {/* Wallet Health */}
            <div className="col-span-1 rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 flex flex-col items-center justify-center gap-3">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Wallet Health</span>
              <div className="relative flex items-center justify-center w-20 h-20">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                  <circle cx="40" cy="40" r="32" fill="none" stroke="#22C55E" strokeWidth="6"
                    strokeDasharray={`${2 * Math.PI * 32 * 0.92} ${2 * Math.PI * 32}`}
                    strokeLinecap="round" />
                </svg>
                <span className="absolute text-xl font-bold text-[#22C55E]">92</span>
              </div>
              <span className="text-xs text-[#22C55E] font-medium">Excellent</span>
            </div>

            {/* Stats mini cards */}
            <div className="col-span-2 grid grid-cols-2 gap-3">
              {[
                { label: "Protected Assets", value: "$48,231", icon: Shield, color: "#4F9CF9", change: "+2.4%" },
                { label: "Threats Blocked", value: "1,847", icon: AlertTriangle, color: "#EF4444", change: "Today: 12" },
                { label: "Active Approvals", value: "23", icon: CheckCircle2, color: "#F59E0B", change: "3 risky" },
                { label: "Risk Exposure", value: "$4,120", icon: TrendingUp, color: "#8B5CF6", change: "Low" },
              ].map((card) => (
                <div key={card.label} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <card.icon className="w-3 h-3" style={{ color: card.color }} />
                    <span className="text-[10px] text-muted-foreground">{card.label}</span>
                  </div>
                  <div className="text-base font-bold text-foreground">{card.value}</div>
                  <div className="text-[10px] mt-1" style={{ color: card.color }}>{card.change}</div>
                </div>
              ))}
            </div>

            {/* Recent threats table */}
            <div className="col-span-3 rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-foreground">Recent Threats</span>
                <span className="text-[10px] text-[#4F9CF9]">View all</span>
              </div>
              <div className="space-y-2">
                {[
                  { type: "Unlimited Approval", protocol: "Uniswap V3", sev: "High", status: "Blocked", color: "#EF4444" },
                  { type: "Phishing Contract", protocol: "Unknown", sev: "Critical", status: "Blocked", color: "#EF4444" },
                  { type: "Suspicious Transfer", protocol: "OpenSea", sev: "Medium", status: "Flagged", color: "#F59E0B" },
                ].map((t, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px] py-1.5 border-b border-white/[0.04] last:border-0">
                    <span className="text-foreground w-36 truncate">{t.type}</span>
                    <span className="text-muted-foreground w-24 truncate">{t.protocol}</span>
                    <span className="font-medium px-1.5 py-0.5 rounded text-[10px]" style={{ color: t.color, background: `${t.color}15` }}>{t.sev}</span>
                    <span className="text-[#22C55E] text-[10px] font-medium">{t.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
