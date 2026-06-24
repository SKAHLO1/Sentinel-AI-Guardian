"use client"

import { Globe, ShieldAlert, FileCode, Sparkles, ShieldCheck, Ban, Wallet, AlertTriangle, Fingerprint, Clipboard, Eye } from "lucide-react"

// The protection pipeline — what happens, in order, when you use a dApp.
const steps = [
  { icon: Globe, color: "#4F9CF9", title: "You browse", body: "Every site is checked against live phishing & typosquat blocklists (MetaMask + ScamSniffer) in real time." },
  { icon: ShieldAlert, color: "#F59E0B", title: "We intercept", body: "The instant a dApp asks you to sign, SentinelAI pauses the request — before your wallet ever opens." },
  { icon: FileCode, color: "#8B5CF6", title: "We decode", body: "Raw calldata is decoded to plain English — 4byte signatures + AWS Bedrock AI explain exactly what you're signing." },
  { icon: Sparkles, color: "#22C55E", title: "AI scores risk", body: "Simulation, threat intelligence, and approval analysis produce a 0–100 risk score with clear reasons." },
  { icon: ShieldCheck, color: "#4F9CF9", title: "You decide", body: "A clear verdict with Reject or Proceed. SentinelAI never auto-signs — you always make the final call." },
]

// What the engine actually catches.
const threats = [
  { icon: Eye, label: "Blind signing" },
  { icon: Wallet, label: "Wallet drainers" },
  { icon: Globe, label: "Phishing sites" },
  { icon: AlertTriangle, label: "Unlimited approvals" },
  { icon: Fingerprint, label: "Address poisoning" },
  { icon: Clipboard, label: "Clipboard swaps" },
  { icon: Ban, label: "Scam contracts" },
  { icon: ShieldAlert, label: "Malicious signatures" },
]

export function FeaturesSection() {
  return (
    <section id="features" className="relative py-28 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03] text-muted-foreground text-xs font-medium mb-5">
            How you get protected
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-balance tracking-tight text-foreground mb-4">
            Protection on every transaction
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto text-balance leading-relaxed">
            SentinelAI works automatically in the background — decoding and scoring every signature before it reaches your wallet.
          </p>
        </div>

        {/* Pipeline infographic */}
        <div className="relative mb-20">
          {/* connecting line (desktop) */}
          <div className="hidden md:block absolute top-7 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-[#4F9CF9]/30 to-transparent" />
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 md:gap-4 relative">
            {steps.map((s, i) => (
              <div key={s.title} className="flex flex-col items-center text-center">
                <div className="relative mb-4">
                  <div
                    className="flex items-center justify-center w-14 h-14 rounded-2xl border bg-[#0D1117]"
                    style={{ borderColor: `${s.color}40`, boxShadow: `0 0 24px ${s.color}22` }}
                  >
                    <s.icon className="w-6 h-6" style={{ color: s.color }} />
                  </div>
                  <span
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-[#0A0A0A]"
                    style={{ background: s.color }}
                  >
                    {i + 1}
                  </span>
                </div>
                <h3 className="font-semibold text-foreground text-sm mb-1.5">{s.title}</h3>
                <p className="text-muted-foreground text-xs leading-relaxed max-w-[200px]">{s.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* What it blocks */}
        <div className="rounded-3xl bg-[#111827] border border-white/[0.06] p-8 md:p-10">
          <div className="text-center mb-8">
            <h3 className="text-xl font-bold text-foreground mb-2">One engine, every Web3 threat</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              The same Guardian engine that powers the overlay also runs continuously in the background.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {threats.map((t) => (
              <div
                key={t.label}
                className="flex items-center gap-3 rounded-xl bg-white/[0.02] border border-white/[0.06] px-4 py-3 hover:border-[#EF4444]/30 hover:bg-[#EF4444]/[0.04] transition-all group"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/20 shrink-0">
                  <t.icon className="w-4 h-4 text-[#EF4444]" />
                </div>
                <span className="text-xs font-medium text-foreground/80 group-hover:text-foreground transition-colors">{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
