"use client"

import { Wallet, LogOut, Loader2, Menu } from "lucide-react"
import { useWallet } from "@/lib/wallet-context"
import { useMobileNav } from "@/lib/mobile-nav"

interface TopbarProps {
  title: string
  subtitle?: string
}

const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum", 8453: "Base", 42161: "Arbitrum", 10: "Optimism", 137: "Polygon", 56: "BNB Chain",
}

export function Topbar({ title, subtitle }: TopbarProps) {
  const { address, chainId, connect, disconnect, connecting, hasProvider } = useWallet()
  const { setOpen } = useMobileNav()
  const chain = chainId ? CHAIN_NAMES[chainId] ?? `Chain ${chainId}` : null

  return (
    <header className="fixed top-0 left-0 md:left-60 right-0 h-14 z-30 flex items-center justify-between px-4 md:px-6 bg-[#0A0A0A]/80 backdrop-blur-md border-b border-white/[0.06]">
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Hamburger (mobile only) */}
        <button
          onClick={() => setOpen(true)}
          className="md:hidden flex items-center justify-center w-8 h-8 -ml-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-colors shrink-0"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-sm font-semibold text-foreground truncate">{title}</h1>
          {subtitle && <p className="text-xs text-muted-foreground hidden md:block truncate">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        {address ? (
          <div className="flex items-center gap-2">
            {chain && (
              <span className="hidden sm:inline-flex items-center h-8 px-2.5 rounded-lg bg-[#4F9CF9]/10 border border-[#4F9CF9]/20 text-[10px] font-semibold text-[#4F9CF9]">
                {chain}
              </span>
            )}
            <div className="flex items-center gap-2 h-8 px-3 rounded-lg bg-[#22C55E]/10 border border-[#22C55E]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] pulse-green" />
              <span className="text-xs font-mono text-foreground">{address.slice(0, 6)}…{address.slice(-4)}</span>
            </div>
            <button
              onClick={disconnect}
              title="Disconnect"
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={connect}
            disabled={connecting}
            className="flex items-center gap-2 h-8 px-3.5 rounded-lg bg-[#4F9CF9] hover:bg-[#3a87e8] text-[#0A0A0A] text-xs font-semibold transition-colors disabled:opacity-60"
          >
            {connecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wallet className="w-3.5 h-3.5" />}
            {hasProvider ? (connecting ? "Connecting…" : "Connect Wallet") : "Install Wallet"}
          </button>
        )}
      </div>
    </header>
  )
}
