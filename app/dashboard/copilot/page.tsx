"use client"

import { Topbar } from "@/components/sentinel/topbar"
import { AICopilot } from "@/components/sentinel/ai-copilot"

export default function CopilotPage() {
  return (
    <div className="min-h-screen bg-background">
      <Topbar title="AI Wallet Copilot" subtitle="Ask anything about your wallet security" />
      <div className="pt-14 h-[calc(100vh-0px)]">
        <AICopilot />
      </div>
    </div>
  )
}
