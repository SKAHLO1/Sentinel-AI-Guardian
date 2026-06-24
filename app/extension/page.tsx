"use client"

import { ExtensionPopup } from "@/components/sentinel/extension-popup"
import { WarningOverlay } from "@/components/sentinel/warning-overlay"
import { useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function ExtensionPage() {
  const [showWarning, setShowWarning] = useState(false)

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 gap-8">
      <Link href="/" className="absolute top-6 left-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to site
      </Link>

      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold text-foreground mb-2">Browser Extension Preview</h1>
        <p className="text-muted-foreground text-sm">380px popup UI + transaction warning overlay</p>
      </div>

      <div className="flex flex-col lg:flex-row items-start gap-8">
        {/* Extension popup (fixed width) */}
        <div className="flex flex-col items-center gap-3">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Extension Popup</span>
          <div className="rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl" style={{ width: 380 }}>
            <ExtensionPopup onSimulateRisk={() => setShowWarning(true)} />
          </div>
        </div>

        {/* Warning overlay preview */}
        <div className="flex flex-col items-center gap-3">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Warning Overlay (Triggered)</span>
          <div className="rounded-2xl overflow-hidden border border-[#EF4444]/20 shadow-2xl" style={{ width: 420 }}>
            <WarningOverlay />
          </div>
        </div>
      </div>
    </div>
  )
}
