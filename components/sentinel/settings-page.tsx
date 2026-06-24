"use client"

import { useState } from "react"
import {
  Shield, Bell, Eye, Globe, Bot, Zap,
  ChevronRight, Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface ToggleProps {
  checked: boolean
  onChange: (v: boolean) => void
}

function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
        checked ? "bg-[#4F9CF9]" : "bg-white/[0.12]"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  )
}

const sections = [
  {
    id: "protection",
    icon: Shield,
    color: "#4F9CF9",
    title: "Protection Settings",
    settings: [
      { key: "auto_block", label: "Auto-block critical transactions", description: "Automatically reject transactions with a risk score above 80", defaultOn: true },
      { key: "unlimited_alert", label: "Alert on unlimited approvals", description: "Warn when any transaction requests an unlimited token approval", defaultOn: true },
      { key: "new_contract", label: "Flag new contracts", description: "Show warnings for contracts deployed less than 30 days ago", defaultOn: true },
      { key: "drainer_check", label: "Drainer bytecode matching", description: "Cross-reference contract bytecode against known drainer patterns", defaultOn: true },
    ],
  },
  {
    id: "notifications",
    icon: Bell,
    color: "#F59E0B",
    title: "Notifications",
    settings: [
      { key: "threat_alerts", label: "Real-time threat alerts", description: "Get notified when new threats matching your wallets are detected", defaultOn: true },
      { key: "approval_digest", label: "Weekly approval digest", description: "Receive a weekly summary of your approval risk profile", defaultOn: false },
      { key: "health_change", label: "Health score changes", description: "Notify when your wallet health score drops by more than 5 points", defaultOn: true },
      { key: "browser_notifs", label: "Browser notifications", description: "Allow desktop notifications from the extension", defaultOn: false },
    ],
  },
  {
    id: "privacy",
    icon: Eye,
    color: "#8B5CF6",
    title: "Privacy & Data",
    settings: [
      { key: "anon_analytics", label: "Anonymous usage analytics", description: "Help improve SentinelAI with anonymized product analytics", defaultOn: true },
      { key: "wallet_index", label: "Index wallet for threat matching", description: "Allow your wallet address to be used for proactive threat matching", defaultOn: true },
      { key: "share_intel", label: "Share threat intelligence", description: "Contribute blocked threats to community threat database", defaultOn: false },
    ],
  },
  {
    id: "ai",
    icon: Bot,
    color: "#22C55E",
    title: "AI Copilot",
    settings: [
      { key: "ai_context", label: "Include wallet context", description: "Allow AI Copilot to access your full transaction and approval history for better answers", defaultOn: true },
      { key: "ai_suggestions", label: "Proactive AI suggestions", description: "Allow the AI to surface insights without being asked", defaultOn: false },
    ],
  },
]

export function SettingsPage() {
  const [toggles, setToggles] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    sections.forEach(s => s.settings.forEach(setting => { init[setting.key] = setting.defaultOn }))
    return init
  })
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-3xl space-y-5">
      {/* Plan card */}
      <div className="rounded-2xl bg-[#111827] border border-[#4F9CF9]/25 p-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#4F9CF9]/12 border border-[#4F9CF9]/25 flex items-center justify-center">
            <Zap className="w-5 h-5 text-[#4F9CF9]" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">Pro Plan</div>
            <div className="text-xs text-muted-foreground mt-0.5">Renews July 22, 2026 · $12/month</div>
          </div>
        </div>
        <Button size="sm" variant="outline" className="h-8 text-xs border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-foreground">
          Manage Plan <ChevronRight className="w-3 h-3 ml-1" />
        </Button>
      </div>

      {/* Settings sections */}
      {sections.map((section) => (
        <div key={section.id} className="rounded-2xl bg-[#111827] border border-white/[0.06] overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/[0.06]">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${section.color}12`, border: `1px solid ${section.color}25` }}
            >
              <section.icon className="w-3.5 h-3.5" style={{ color: section.color }} />
            </div>
            <span className="text-sm font-semibold text-foreground">{section.title}</span>
          </div>

          <div className="divide-y divide-white/[0.04]">
            {section.settings.map((setting) => (
              <div key={setting.key} className="flex items-center justify-between px-5 py-4">
                <div className="flex-1 pr-8">
                  <div className="text-sm font-medium text-foreground">{setting.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{setting.description}</div>
                </div>
                <Toggle
                  checked={toggles[setting.key]}
                  onChange={(v) => setToggles(prev => ({ ...prev, [setting.key]: v }))}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Account */}
      <div className="rounded-2xl bg-[#111827] border border-white/[0.06] overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/[0.06]">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#6B7A8D]/12 border border-[#6B7A8D]/25">
            <Globe className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <span className="text-sm font-semibold text-foreground">Account</span>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm font-medium text-foreground">Email</div>
              <div className="text-xs text-muted-foreground mt-0.5">defiuser@example.com</div>
            </div>
            <Button size="sm" variant="outline" className="h-7 text-xs border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-muted-foreground">
              Change
            </Button>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-white/[0.04]">
            <div>
              <div className="text-sm font-medium text-foreground">API Key</div>
              <div className="text-xs text-muted-foreground mt-0.5 font-mono">sk-...••••••••••••1a2b</div>
            </div>
            <Button size="sm" variant="outline" className="h-7 text-xs border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-muted-foreground">
              Regenerate
            </Button>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-white/[0.04]">
            <div>
              <div className="text-sm font-medium text-[#EF4444]">Delete Account</div>
              <div className="text-xs text-muted-foreground mt-0.5">Permanently delete your account and all data</div>
            </div>
            <Button size="sm" variant="outline" className="h-7 text-xs border-[#EF4444]/30 bg-[#EF4444]/5 hover:bg-[#EF4444]/10 text-[#EF4444]">
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          className={`h-10 px-6 font-semibold text-sm transition-all ${
            saved
              ? "bg-[#22C55E] hover:bg-[#16a34a] text-white"
              : "bg-[#4F9CF9] hover:bg-[#3a87e8] text-[#0A0A0A]"
          }`}
        >
          {saved ? (
            <><Check className="w-4 h-4 mr-2" /> Saved!</>
          ) : (
            "Save Settings"
          )}
        </Button>
      </div>
    </div>
  )
}
