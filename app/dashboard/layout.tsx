import { Sidebar } from "@/components/sentinel/sidebar"
import { WalletProvider } from "@/lib/wallet-context"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="ml-60 min-h-screen">
          {children}
        </main>
      </div>
    </WalletProvider>
  )
}
