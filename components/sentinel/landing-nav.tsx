"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

export function LandingNav() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 h-14 flex items-center justify-between px-6 md:px-12 glass-strong border-b border-white/[0.06]">
      <Link href="/" className="flex items-center gap-2.5">
        <img src="/icon.png" alt="SentinelAI Guardian" className="w-7 h-7 rounded-lg" />
        <span className="font-semibold text-sm tracking-tight text-foreground">
          SentinelAI <span className="text-[#4F9CF9]">Guardian</span>
        </span>
      </Link>

      <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
        <Link href="#features" className="hover:text-foreground transition-colors">Features</Link>
        <Link href="#pricing" className="hover:text-foreground transition-colors">Pricing</Link>
        <Link href="/dashboard/threats" className="hover:text-foreground transition-colors">Threat Feed</Link>
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
      </div>

      <div className="flex items-center gap-2.5">
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-xs h-8 hidden sm:inline-flex" asChild>
          <Link href="/dashboard">Sign In</Link>
        </Button>
        <Button size="sm" className="bg-[#4F9CF9] hover:bg-[#3a87e8] text-[#0A0A0A] font-semibold text-xs h-8 px-4 transition-all" asChild>
          <Link href="/install">Get Extension</Link>
        </Button>
      </div>
    </nav>
  )
}
