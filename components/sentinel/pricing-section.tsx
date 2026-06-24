"use client"

import Link from "next/link"
import { CheckCircle2, ArrowRight, Sparkles, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"

const included = [
  "Real-time transaction interception & AI decoding",
  "Wallet health score & live approval scanner",
  "Phishing / typosquat site protection",
  "AI Security Copilot (AWS Bedrock)",
  "Live threat-intelligence feed",
  "Scan history & detected-threat log",
]

const comingSoon = [
  "Team dashboards & shared audit logs",
  "Unlimited AI Copilot & priority models",
  "Custom risk policies & allowlists",
  "Multi-wallet & multi-chain monitoring",
  "Webhook / API access for integrations",
  "SLA & compliance reporting",
]

export function PricingSection() {
  return (
    <section id="pricing" className="relative py-28 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#22C55E]/20 bg-[#22C55E]/[0.06] text-[#22C55E] text-xs font-medium mb-5">
            <Sparkles className="w-3.5 h-3.5" /> Free while in beta
          </div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-balance text-foreground mb-4">
            Everything is free right now
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            SentinelAI Guardian is free during beta. Paid plans with team and pro features are coming soon.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Free / current */}
          <div className="relative rounded-2xl bg-[#111827] border border-[#22C55E]/30 p-7 flex flex-col glow-blue">
            <div className="absolute -top-3 left-7">
              <span className="px-3 py-1 rounded-full bg-[#22C55E] text-[#0A0A0A] text-[11px] font-bold tracking-wide">
                Available now
              </span>
            </div>
            <div className="mb-5">
              <div className="text-sm font-semibold text-muted-foreground mb-1">Beta</div>
              <div className="flex items-end gap-1 mb-2">
                <span className="text-4xl font-bold text-foreground">Free</span>
                <span className="text-muted-foreground text-sm mb-1">/ no card required</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The full Guardian engine, protecting your wallet on every dApp.
              </p>
            </div>
            <ul className="space-y-3 mb-7 flex-1">
              {included.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-foreground/85">
                  <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Button className="w-full h-11 font-semibold bg-[#4F9CF9] hover:bg-[#3a87e8] text-[#0A0A0A]" asChild>
              <Link href="/install">
                Get the Extension — Free <ArrowRight className="w-4 h-4 ml-1.5" />
              </Link>
            </Button>
          </div>

          {/* Coming soon / premium */}
          <div className="relative rounded-2xl bg-[#0D1117] border border-white/[0.06] p-7 flex flex-col">
            <div className="absolute -top-3 left-7">
              <span className="px-3 py-1 rounded-full bg-white/10 text-muted-foreground text-[11px] font-bold tracking-wide border border-white/10">
                Coming soon
              </span>
            </div>
            <div className="mb-5">
              <div className="text-sm font-semibold text-muted-foreground mb-1">Pro &amp; Teams</div>
              <div className="flex items-end gap-1 mb-2">
                <span className="text-4xl font-bold text-muted-foreground/70">Soon</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Advanced controls for power users, DAOs, and funds. Not available yet.
              </p>
            </div>
            <ul className="space-y-3 mb-7 flex-1">
              {comingSoon.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground/70">
                  <Lock className="w-4 h-4 text-muted-foreground/50 shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Button variant="outline" disabled className="w-full h-11 font-medium border-white/10 bg-white/[0.02] text-muted-foreground cursor-not-allowed">
              Paid plans coming soon
            </Button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Want early access to Pro features or have a team use case?{" "}
          <Link href="/dashboard" className="text-[#4F9CF9] hover:text-[#6fb0ff]">Open the dashboard</Link> and reach out.
        </p>
      </div>
    </section>
  )
}
