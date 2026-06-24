"use client"

import { Topbar } from "@/components/sentinel/topbar"
import { TransactionSimulator } from "@/components/sentinel/transaction-simulator"

export default function SimulatorPage() {
  return (
    <div className="min-h-screen bg-background">
      <Topbar title="Transaction Simulator" subtitle="Preview and analyze any transaction before signing" />
      <div className="pt-14 p-6">
        <TransactionSimulator />
      </div>
    </div>
  )
}
