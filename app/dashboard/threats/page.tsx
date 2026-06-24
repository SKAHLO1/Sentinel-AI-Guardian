"use client"

import { Topbar } from "@/components/sentinel/topbar"
import { ThreatIntelligence } from "@/components/sentinel/threat-intelligence"

export default function ThreatsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Topbar title="Threat Intelligence Feed" subtitle="Live feed of phishing domains, drainers and scam wallets" />
      <div className="pt-14 p-6">
        <ThreatIntelligence />
      </div>
    </div>
  )
}
