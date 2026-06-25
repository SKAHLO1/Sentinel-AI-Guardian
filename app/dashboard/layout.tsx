import { Sidebar } from "@/components/sentinel/sidebar"
import { WalletProvider } from "@/lib/wallet-context"
import { MobileNavProvider } from "@/lib/mobile-nav"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <MobileNavProvider>
        <div className="min-h-screen bg-background">
          <Sidebar />
          <main className="md:ml-60 min-h-screen">
            {children}
          </main>
        </div>
      </MobileNavProvider>
    </WalletProvider>
  )
}
