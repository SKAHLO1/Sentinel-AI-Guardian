"use client"

import { Wallet, ServerCog, Loader2 } from "lucide-react"
import { useWallet } from "@/lib/wallet-context"

/** Shown when no wallet is connected — offers a connect action. */
export function ConnectPrompt({ label = "Connect your wallet to see real on-chain data." }: { label?: string }) {
  const { connect, connecting, hasProvider } = useWallet()
  return (
    <div className="flex flex-col items-center justify-center text-center gap-3 py-14 px-6 rounded-2xl bg-[#111827] border border-white/[0.06]">
      <div className="w-11 h-11 rounded-xl bg-[#4F9CF9]/10 border border-[#4F9CF9]/25 flex items-center justify-center">
        <Wallet className="w-5 h-5 text-[#4F9CF9]" />
      </div>
      <p className="text-sm text-muted-foreground max-w-xs">{label}</p>
      <button
        onClick={connect}
        disabled={connecting}
        className="flex items-center gap-2 h-9 px-4 rounded-lg bg-[#4F9CF9] hover:bg-[#3a87e8] text-[#0A0A0A] text-xs font-semibold transition-colors disabled:opacity-60"
      >
        {connecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wallet className="w-3.5 h-3.5" />}
        {hasProvider ? "Connect Wallet" : "Install a Wallet"}
      </button>
    </div>
  )
}

/** Shown when the backend has no ALCHEMY_API_KEY configured. */
export function ProviderPrompt() {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-3 py-14 px-6 rounded-2xl bg-[#111827] border border-[#F59E0B]/20">
      <div className="w-11 h-11 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/25 flex items-center justify-center">
        <ServerCog className="w-5 h-5 text-[#F59E0B]" />
      </div>
      <p className="text-sm text-muted-foreground max-w-xs">
        On-chain data source not configured. Set <code className="text-[#4F9CF9]">ALCHEMY_API_KEY</code> on the
        backend to scan real approvals & balances.
      </p>
    </div>
  )
}

export function LoadingState({ label = "Loading on-chain data…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 text-muted-foreground py-14">
      <Loader2 className="w-5 h-5 animate-spin" /> {label}
    </div>
  )
}
