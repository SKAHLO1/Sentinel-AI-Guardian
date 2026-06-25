"use client"

import { useState } from "react"
import { ShieldCheck, Flag, Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { useWallet } from "@/lib/wallet-context"

// --- Contract reputation lookup (Etherscan V2) --------------------------
function ReputationCheck() {
  const { chainId } = useWallet()
  const [addr, setAddr] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ configured: boolean; verified: boolean; name?: string } | null>(null)

  async function check() {
    const a = addr.trim()
    if (!/^0x[0-9a-fA-F]{40}$/.test(a)) { setResult(null); return }
    setLoading(true)
    try {
      setResult(await api.reputation(a, chainId ?? undefined))
    } catch {
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl bg-[#111827] border border-white/[0.06] p-5">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="w-4 h-4 text-[#4F9CF9]" />
        <span className="text-sm font-semibold text-foreground">Check a contract</span>
      </div>
      <div className="flex gap-2">
        <Input
          value={addr}
          onChange={(e) => setAddr(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && check()}
          placeholder="0x contract address…"
          className="h-9 bg-[#0D1117] border-white/[0.08] text-sm font-mono"
        />
        <Button onClick={check} disabled={loading} className="h-9 bg-[#4F9CF9] hover:bg-[#3a87e8] text-[#0A0A0A] font-semibold shrink-0">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Check"}
        </Button>
      </div>

      {result && !result.configured && (
        <p className="text-xs text-muted-foreground mt-3">Reputation not configured — set <code className="text-[#4F9CF9]">ETHERSCAN_API_KEY</code> on the backend.</p>
      )}
      {result && result.configured && (
        <div className={`mt-3 flex items-center gap-2 rounded-xl p-3 border ${result.verified ? "bg-[#22C55E]/5 border-[#22C55E]/20" : "bg-[#F59E0B]/5 border-[#F59E0B]/20"}`}>
          {result.verified ? <CheckCircle2 className="w-4 h-4 text-[#22C55E]" /> : <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />}
          <span className="text-xs" style={{ color: result.verified ? "#22C55E" : "#F59E0B" }}>
            {result.verified ? `Verified source${result.name ? ` · ${result.name}` : ""}` : "Source NOT verified — opaque code, treat with caution"}
          </span>
        </div>
      )}
    </div>
  )
}

// --- Report a threat ----------------------------------------------------
function ReportThreat() {
  const [type, setType] = useState<"domain" | "address">("domain")
  const [value, setValue] = useState("")
  const [reason, setReason] = useState("")
  const [state, setState] = useState<"idle" | "sending" | "done" | "error" | "no-db">("idle")

  async function submit() {
    if (!value.trim()) return
    setState("sending")
    try {
      const r = await api.report({ type, value: value.trim(), reason: reason.trim() || undefined })
      setState(r.recorded ? "done" : "no-db")
      if (r.recorded) { setValue(""); setReason("") }
    } catch {
      setState("error")
    }
  }

  return (
    <div className="rounded-2xl bg-[#111827] border border-white/[0.06] p-5">
      <div className="flex items-center gap-2 mb-3">
        <Flag className="w-4 h-4 text-[#EF4444]" />
        <span className="text-sm font-semibold text-foreground">Report a threat</span>
      </div>
      <div className="flex items-center gap-2 mb-2">
        {(["domain", "address"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${type === t ? "bg-[#4F9CF9] text-[#0A0A0A]" : "bg-white/[0.04] text-muted-foreground hover:bg-white/[0.07] border border-white/[0.06]"}`}
          >
            {t}
          </button>
        ))}
      </div>
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={type === "domain" ? "scam-site.xyz" : "0x scam address…"}
        className="h-9 bg-[#0D1117] border-white/[0.08] text-sm font-mono mb-2"
      />
      <Input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (optional)"
        className="h-9 bg-[#0D1117] border-white/[0.08] text-sm mb-3"
      />
      <Button onClick={submit} disabled={state === "sending" || !value.trim()} className="w-full h-9 bg-[#EF4444] hover:bg-[#dc2626] text-white font-semibold">
        {state === "sending" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit report"}
      </Button>
      {state === "done" && <p className="text-xs text-[#22C55E] mt-2 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Thanks — added to the community feed.</p>}
      {state === "no-db" && <p className="text-xs text-muted-foreground mt-2">Reporting needs a database — set <code className="text-[#4F9CF9]">DYNAMODB_TABLE</code> on the backend.</p>}
      {state === "error" && <p className="text-xs text-[#EF4444] mt-2 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Couldn't submit — try again.</p>}
    </div>
  )
}

export function SecurityTools() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <ReputationCheck />
      <ReportThreat />
    </div>
  )
}
