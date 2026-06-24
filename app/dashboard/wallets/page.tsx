"use client"

import { Topbar } from "@/components/sentinel/topbar"
import { WalletsPage } from "@/components/sentinel/wallets-page"

export default function Page() {
  return (
    <div className="min-h-screen bg-background">
      <Topbar title="Wallets" subtitle="Manage and monitor all your connected wallets" />
      <div className="pt-14 p-6">
        <WalletsPage />
      </div>
    </div>
  )
}
