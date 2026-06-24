"use client"

import { Topbar } from "@/components/sentinel/topbar"
import { SettingsPage } from "@/components/sentinel/settings-page"

export default function Page() {
  return (
    <div className="min-h-screen bg-background">
      <Topbar title="Settings" subtitle="Configure your SentinelAI security preferences" />
      <div className="pt-14 p-6">
        <SettingsPage />
      </div>
    </div>
  )
}
