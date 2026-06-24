import { Topbar } from "@/components/sentinel/topbar"
import { WalletHealthGauge } from "@/components/sentinel/wallet-health-gauge"
import { DashboardStats } from "@/components/sentinel/dashboard-stats"
import { ScanHistory } from "@/components/sentinel/scan-history"
import { RiskTimeline } from "@/components/sentinel/risk-timeline"

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <Topbar title="Dashboard" subtitle="Your security overview for today" />

      <div className="pt-14 p-6 space-y-5">
        {/* Top row: health gauge + stat cards */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <WalletHealthGauge />
          <DashboardStats />
        </div>

        {/* Bottom row: threats table + timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <ScanHistory />
          </div>
          <div className="lg:col-span-1">
            <RiskTimeline />
          </div>
        </div>
      </div>
    </div>
  )
}
