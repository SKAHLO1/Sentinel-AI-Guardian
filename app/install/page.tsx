import Link from "next/link"
import { Download, Globe, Wallet, ShieldCheck } from "lucide-react"
import { LandingNav } from "@/components/sentinel/landing-nav"

export const metadata = {
  title: "Install SentinelAI Guardian",
  description: "Download and load the SentinelAI Guardian Chrome extension in under a minute.",
}

const ZIP = "/sentinelai-guardian-extension.zip"

const steps = [
  { n: 1, title: "Download & unzip", body: "Click the button above to download the extension, then unzip the file to a folder you'll keep (don't delete it — Chrome loads from this folder)." },
  { n: 2, title: "Open the extensions page", body: "Go to chrome://extensions in Chrome, Brave, or Edge (paste it into the address bar)." },
  { n: 3, title: "Enable Developer mode", body: "Toggle \"Developer mode\" on — it's the switch in the top-right corner." },
  { n: 4, title: "Load unpacked", body: "Click \"Load unpacked\" and select the unzipped folder. SentinelAI Guardian appears in your toolbar." },
  { n: 5, title: "Pin & connect", body: "Pin the shield icon, open any dApp, click Connect Wallet in the popup, and you're protected — risky transactions are decoded and scored before you sign." },
]

export default function InstallPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav />
      <main className="max-w-2xl mx-auto px-6 pt-28 pb-20">
        <div className="text-center mb-10">
          <img src="/icon.png" alt="SentinelAI Guardian" className="w-16 h-16 rounded-2xl mx-auto mb-5" />
          <h1 className="text-3xl font-bold tracking-tight">Install SentinelAI Guardian</h1>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            The AI antivirus for Web3. No Chrome Web Store needed — load it in under a minute.
          </p>
          <a
            href={ZIP}
            download
            className="inline-flex items-center gap-2 mt-7 h-11 px-6 rounded-xl bg-[#4F9CF9] hover:bg-[#3a87e8] text-[#0A0A0A] font-semibold transition-colors"
          >
            <Download className="w-4 h-4" /> Download Extension (.zip)
          </a>
          <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> Chrome / Brave / Edge</span>
            <span className="inline-flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> No account required</span>
          </div>
        </div>

        <div className="rounded-2xl bg-[#111827] border border-white/[0.06] divide-y divide-white/[0.06]">
          {steps.map((s) => (
            <div key={s.n} className="flex gap-4 p-5">
              <div className="shrink-0 w-7 h-7 rounded-full bg-[#4F9CF9]/10 border border-[#4F9CF9]/30 flex items-center justify-center text-[#4F9CF9] text-sm font-bold">
                {s.n}
              </div>
              <div>
                <div className="font-semibold text-sm">{s.title}</div>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-xl bg-[#F59E0B]/5 border border-[#F59E0B]/20 p-4 text-xs text-muted-foreground leading-relaxed">
          <strong className="text-[#F59E0B]">Heads up:</strong> "Load unpacked" is the standard way to test an
          extension before it's on the Web Store. Keep the unzipped folder where it is — if you move or delete it,
          the extension stops working. Chrome may show a "developer mode extensions" reminder on startup; that's
          expected.
        </div>

        <div className="text-center mt-8">
          <Link href="/dashboard" className="text-sm text-[#4F9CF9] hover:text-[#6fb0ff] inline-flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5" /> Or open the web dashboard
          </Link>
        </div>
      </main>
    </div>
  )
}
