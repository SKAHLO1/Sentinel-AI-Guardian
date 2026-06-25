"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Wallet,
  FlaskConical,
  ShieldCheck,
  Rss,
  Bot,
  Settings,
  ChevronRight,
  Home,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useMobileNav } from "@/lib/mobile-nav"
import { useWallet } from "@/lib/wallet-context"

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Wallet, label: "Wallets", href: "/dashboard/wallets" },
  { icon: FlaskConical, label: "Transaction Simulator", href: "/dashboard/simulator" },
  { icon: ShieldCheck, label: "Approvals", href: "/dashboard/approvals" },
  { icon: Rss, label: "Threat Intelligence", href: "/dashboard/threats" },
  { icon: Bot, label: "AI Copilot", href: "/dashboard/copilot" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
]

export function Sidebar() {
  const pathname = usePathname()
  const { open, setOpen } = useMobileNav()
  const { address } = useWallet()
  const close = () => setOpen(false)

  return (
    <>
      {/* Mobile backdrop */}
      {open && <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={close} aria-hidden />}

      <aside
        className={cn(
          "fixed left-0 top-0 h-full w-60 z-50 flex flex-col bg-[#0D1117] border-r border-white/[0.06] transition-transform duration-200",
          "md:translate-x-0 md:pointer-events-auto",
          open ? "translate-x-0" : "-translate-x-full pointer-events-none",
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/[0.06]">
          <div className="relative">
            <img src="/icon.png" alt="SentinelAI Guardian" className="w-8 h-8 rounded-lg" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#22C55E] border border-[#0D1117]" />
          </div>
          <span className="font-semibold text-[15px] tracking-tight text-foreground">
            SentinelAI <span className="text-[#4F9CF9]">Guardian</span>
          </span>
          {/* Close button (mobile only) */}
          <button onClick={close} className="ml-auto md:hidden text-muted-foreground hover:text-foreground" aria-label="Close menu">
            <X className="w-4 h-4" />
          </button>
        </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ icon: Icon, label, href }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname?.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              onClick={close}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group relative",
                active
                  ? "bg-[#4F9CF9]/10 text-[#4F9CF9] font-medium"
                  : "text-[#6B7A8D] hover:text-foreground hover:bg-white/[0.04]"
              )}
            >
              <Icon className={cn("w-4 h-4 shrink-0", active ? "text-[#4F9CF9]" : "text-[#6B7A8D] group-hover:text-foreground")} />
              <span className="truncate">{label}</span>
              {active && <ChevronRight className="w-3 h-3 ml-auto text-[#4F9CF9]/60" />}
            </Link>
          )
        })}
      </nav>

        {/* Back to home */}
        <div className="px-3 pt-3 border-t border-white/[0.06]">
          <Link
            href="/"
            onClick={close}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#6B7A8D] hover:text-foreground hover:bg-white/[0.04] transition-all group"
          >
            <Home className="w-4 h-4 shrink-0 text-[#6B7A8D] group-hover:text-foreground" />
            <span className="truncate">Back to Home</span>
          </Link>
        </div>

        {/* Bottom wallet pill — real connection state */}
        <div className="px-3 py-4">
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <span className={cn("w-2 h-2 rounded-full", address ? "bg-[#22C55E] pulse-green" : "bg-[#6B7A8D]")} />
            <span className="text-xs text-[#6B7A8D] font-mono truncate">
              {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Not connected"}
            </span>
            {address && (
              <span className="ml-auto text-[10px] font-medium text-[#22C55E] bg-[#22C55E]/10 px-1.5 py-0.5 rounded-full">Protected</span>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
