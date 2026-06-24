"use client"

import Link from "next/link"

const links = {
  Product: ["Features", "Pricing", "Changelog", "Roadmap"],
  Security: ["Threat Feed", "Transaction Simulator", "Approval Manager", "AI Copilot"],
  Company: ["About", "Blog", "Careers", "Press Kit"],
  Legal: ["Privacy Policy", "Terms of Service", "Cookie Policy", "Security"],
}

export function FooterSection() {
  return (
    <footer className="relative border-t border-white/[0.06] py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <img src="/icon.png" alt="SentinelAI Guardian" className="w-7 h-7 rounded-lg" />
              <span className="font-semibold text-sm text-foreground">SentinelAI Guardian</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              The AI-powered security layer for Web3. Protecting wallets from malicious approvals and phishing attacks.
            </p>
            <div className="flex items-center gap-2 mt-5">
              <span className="w-2 h-2 rounded-full bg-[#22C55E] pulse-green" />
              <span className="text-xs text-muted-foreground">All systems operational</span>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([group, items]) => (
            <div key={group} className="col-span-1">
              <div className="text-xs font-semibold text-foreground uppercase tracking-widest mb-4">{group}</div>
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item}>
                    <Link
                      href="/dashboard"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/[0.06] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; 2025 SentinelAI, Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
            <span className="text-xs text-muted-foreground">2,400+ wallets protected today</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
