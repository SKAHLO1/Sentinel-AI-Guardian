"use client"

import { Star } from "lucide-react"

const testimonials = [
  {
    name: "Alex Rivera",
    handle: "@alexdefi",
    avatar: "AR",
    role: "DeFi Trader",
    text: "SentinelAI caught a malicious Uniswap clone approval that would have drained my entire USDC balance. The AI explanation made it crystal clear why it was dangerous.",
    stars: 5,
  },
  {
    name: "Priya Nair",
    handle: "@priya_web3",
    avatar: "PN",
    role: "NFT Collector",
    text: "The approval scanner showed me 47 unlimited approvals I had no idea about from old dApps. One-click revoke saved me hours and probably saved my wallet.",
    stars: 5,
  },
  {
    name: "Marcus Chen",
    handle: "@0xmarcus",
    avatar: "MC",
    role: "Smart Contract Dev",
    text: "I use the Transaction Simulator before every major interaction. It's like having a security audit on-demand. The risk score meter is incredibly accurate.",
    stars: 5,
  },
  {
    name: "Sofia Martinez",
    handle: "@sofiadao",
    avatar: "SM",
    role: "DAO Contributor",
    text: "The Threat Intelligence feed alerted me about a fake Aave deployment 3 hours before it was listed on any other security site. Real-time is not an exaggeration.",
    stars: 5,
  },
  {
    name: "James Wu",
    handle: "@jamesonchain",
    avatar: "JW",
    role: "Yield Farmer",
    text: "Went from anxious every time I sign a transaction to completely confident. The AI Copilot explains contract interactions in plain English — no more guessing.",
    stars: 5,
  },
  {
    name: "Elena Kovacs",
    handle: "@elenavc",
    avatar: "EK",
    role: "Crypto Fund Manager",
    text: "We mandate SentinelAI for every wallet in our fund. The wallet health score gives our compliance team a single number to track. Absolutely essential tool.",
    stars: 5,
  },
]

export function TestimonialsSection() {
  return (
    <section className="relative py-28 px-6 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#4F9CF9]/3 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-1 mb-5">
            {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-[#F59E0B] text-[#F59E0B]" />)}
            <span className="text-sm text-muted-foreground ml-2">4.9/5 from 2,400+ users</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-balance text-foreground mb-4">
            Trusted by serious DeFi users
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Over $180M in assets protected. Here&apos;s what our users say.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="rounded-2xl bg-[#111827] border border-white/[0.06] p-5 hover:border-white/[0.1] transition-colors"
            >
              <div className="flex items-center gap-1 mb-4">
                {[...Array(t.stars)].map((_, i) => <Star key={i} className="w-3 h-3 fill-[#F59E0B] text-[#F59E0B]" />)}
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed mb-5">&ldquo;{t.text}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#4F9CF9]/15 border border-[#4F9CF9]/20 flex items-center justify-center text-[#4F9CF9] text-xs font-bold">
                  {t.avatar}
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.handle} · {t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
