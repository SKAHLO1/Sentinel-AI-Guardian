"use client"

import { useEffect, useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  FileCode,
  Zap,
  Loader2,
  Play,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { api, type SimulationReport } from "@/lib/api"
import { useWallet } from "@/lib/wallet-context"

const SAMPLE_CALLDATA =
  "0x095ea7b3000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25effffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"

const severityStyle: Record<string, { color: string; bg: string; border: string }> = {
  critical: { color: "#EF4444", bg: "#EF444410", border: "#EF444430" },
  high: { color: "#F59E0B", bg: "#F59E0B10", border: "#F59E0B30" },
  medium: { color: "#8B5CF6", bg: "#8B5CF610", border: "#8B5CF630" },
  low: { color: "#4F9CF9", bg: "#4F9CF910", border: "#4F9CF930" },
  info: { color: "#6B7A8D", bg: "#6B7A8D10", border: "#6B7A8D30" },
}

const verdictMeta: Record<string, { label: string; color: string }> = {
  danger: { label: "HIGH RISK", color: "#EF4444" },
  warning: { label: "CAUTION", color: "#F59E0B" },
  safe: { label: "LOOKS SAFE", color: "#22C55E" },
}

export function TransactionSimulator() {
  const { address, chainId } = useWallet()
  const [calldata, setCalldata] = useState(SAMPLE_CALLDATA)
  const [toAddr, setToAddr] = useState("")
  const [report, setReport] = useState<SimulationReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [aiDecode, setAiDecode] = useState<string | null>(null)
  const [decoding, setDecoding] = useState(false)

  async function decodeWithAI() {
    const data = calldata.trim()
    if (!data) return
    setDecoding(true)
    setAiDecode(null)
    try {
      const res = await api.decode({ data })
      setAiDecode(res.decode)
    } catch (e) {
      setAiDecode("Couldn't reach the AI decoder.")
    } finally {
      setDecoding(false)
    }
  }

  async function run(data?: string) {
    setLoading(true)
    setError(null)
    try {
      // With a contract address + connected wallet we get a REAL on-chain
      // asset-change simulation; otherwise the heuristic report.
      const res = data
        ? await api.simulate({
            data,
            to: toAddr.trim() || undefined,
            from: address ?? undefined,
            address: address ?? undefined,
            chainId: chainId ?? undefined,
          })
        : await api.simulateSample()
      setReport(res)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    run(SAMPLE_CALLDATA)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const meta = report ? verdictMeta[report.risk.verdict] : verdictMeta.warning
  const score = report?.risk.riskScore ?? 0

  return (
    <div className="space-y-5">
      {/* Calldata input — drives the real engine */}
      <div className="rounded-2xl bg-[#111827] border border-white/[0.06] p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileCode className="w-4 h-4 text-[#4F9CF9]" />
          <span className="text-sm font-semibold text-foreground">Simulate Transaction</span>
          <span className="text-[10px] text-muted-foreground ml-auto">
            Paste raw calldata or a hex tx to analyze
          </span>
        </div>
        <textarea
          value={calldata}
          onChange={(e) => setCalldata(e.target.value)}
          spellCheck={false}
          rows={3}
          placeholder="0x095ea7b3…"
          className="w-full bg-black/30 border border-white/[0.06] rounded-xl p-3 font-mono text-[11px] text-[#4F9CF9] break-all resize-none focus:outline-none focus:border-[#4F9CF9]/40"
        />
        <input
          value={toAddr}
          onChange={(e) => setToAddr(e.target.value)}
          spellCheck={false}
          placeholder="Contract address (optional — enables real asset-change simulation)"
          className="w-full mt-2 bg-black/30 border border-white/[0.06] rounded-xl px-3 py-2 font-mono text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#4F9CF9]/40"
        />
        <div className="flex items-center gap-2 mt-3">
          <Button
            onClick={() => run(calldata.trim())}
            disabled={loading || !calldata.trim()}
            className="h-9 bg-[#4F9CF9] hover:bg-[#3a87e8] text-[#0A0A0A] font-semibold"
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
            Simulate
          </Button>
          <Button
            onClick={decodeWithAI}
            disabled={decoding || !calldata.trim()}
            variant="outline"
            className="h-9 border-[#4F9CF9]/30 bg-[#4F9CF9]/5 hover:bg-[#4F9CF9]/10 text-[#4F9CF9] font-medium"
          >
            {decoding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileCode className="w-4 h-4 mr-2" />}
            AI Decode
          </Button>
          <button
            onClick={() => { setCalldata(SAMPLE_CALLDATA); run(SAMPLE_CALLDATA) }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Load drainer sample
          </button>
          {error && <span className="text-xs text-[#EF4444] ml-auto">{error}</span>}
        </div>

        {aiDecode && (
          <div className="mt-3 rounded-xl bg-[#4F9CF9]/5 border border-[#4F9CF9]/20 p-3">
            <div className="text-[10px] font-semibold text-[#4F9CF9] uppercase tracking-widest mb-1.5">AI Calldata Decode</div>
            <div className="text-xs text-foreground/85 leading-relaxed whitespace-pre-wrap">{aiDecode}</div>
          </div>
        )}
      </div>

      {report && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left — decoded transaction */}
          <div className="rounded-2xl bg-[#111827] border border-white/[0.06] overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-white/[0.06]">
              <FileCode className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">Decoded Transaction</span>
              <span className="ml-auto text-[10px] text-[#22C55E] bg-[#22C55E]/10 border border-[#22C55E]/20 px-2 py-0.5 rounded-full font-medium">
                Simulated
              </span>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-3">
                {[
                  { label: "Function", value: report.functionName, tag: report.signature ? "decoded" : null },
                  { label: "Signature", value: report.signature ?? "unknown", tag: null },
                  { label: "To", value: short(report.to), tag: "Contract" },
                  { label: "Value", value: `${report.value} ETH`, tag: null },
                  { label: "Gas Estimate", value: `~$${report.gasEstimateUsd} (${report.gasUnits.toLocaleString()} gas)`, tag: null },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                    <span className="text-xs text-muted-foreground w-24 shrink-0">{row.label}</span>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-foreground font-mono truncate">{row.value}</span>
                      {row.tag && <span className="text-[10px] bg-white/[0.05] text-muted-foreground px-1.5 py-0.5 rounded">{row.tag}</span>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Asset changes */}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Asset Changes</span>
                {report.live ? (
                  <span className="text-[9px] font-bold text-[#22C55E] bg-[#22C55E]/10 border border-[#22C55E]/25 px-1.5 py-0.5 rounded-full">● LIVE SIMULATION</span>
                ) : (
                  <span className="text-[9px] font-medium text-muted-foreground bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 rounded-full">Estimated</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {report.assetChanges.map((a, i) => (
                  <div
                    key={i}
                    className={`rounded-xl p-3 border ${a.direction === "out" ? "bg-[#EF4444]/5 border-[#EF4444]/15" : "bg-[#22C55E]/5 border-[#22C55E]/15"}`}
                  >
                    <div className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wide">
                      {a.direction === "out" ? "Assets Out" : "Assets In"}
                    </div>
                    <div className={`text-sm font-bold ${a.direction === "out" ? "text-[#EF4444]" : "text-[#22C55E]"}`}>
                      {a.amount} {a.asset}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{a.note}</div>
                  </div>
                ))}
              </div>

              {/* Contract info */}
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 space-y-2">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Contract Information</div>
                {report.contractInfo.map((c) => (
                  <div key={c.label} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{c.label}</span>
                    <span className={c.risk ? "text-[#EF4444] font-semibold" : "text-foreground"}>{c.value}</span>
                  </div>
                ))}
              </div>

              {/* Approval scope */}
              {report.approvalScope.isApproval && (
                <div className={`rounded-xl p-3 ${report.approvalScope.unlimited ? "bg-[#EF4444]/5 border border-[#EF4444]/20" : "bg-[#F59E0B]/5 border border-[#F59E0B]/20"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className={`w-3.5 h-3.5 ${report.approvalScope.unlimited ? "text-[#EF4444]" : "text-[#F59E0B]"}`} />
                    <span className={`text-[10px] font-semibold uppercase tracking-wide ${report.approvalScope.unlimited ? "text-[#EF4444]" : "text-[#F59E0B]"}`}>Approval Scope</span>
                  </div>
                  <p className="text-xs text-foreground/80 leading-relaxed">{report.approvalScope.description}</p>
                </div>
              )}

              {/* Raw calldata */}
              <div>
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Raw Calldata</div>
                <div className="rounded-xl bg-black/30 border border-white/[0.05] p-3 font-mono text-[11px] text-[#4F9CF9] break-all max-h-24 overflow-auto">
                  {calldata}
                </div>
              </div>
            </div>
          </div>

          {/* Right — AI risk assessment */}
          <div className="space-y-4">
            <div className="rounded-2xl bg-[#111827] p-5" style={{ border: `1px solid ${meta.color}40` }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" style={{ color: meta.color }} />
                  <span className="text-sm font-semibold text-foreground">AI Risk Assessment</span>
                </div>
                <span className="text-[10px] px-2 py-1 rounded-full font-bold" style={{ background: `${meta.color}1a`, color: meta.color, border: `1px solid ${meta.color}40` }}>
                  {meta.label}
                </span>
              </div>

              <div className="relative mb-3">
                <div className="flex items-end justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Risk Score</span>
                  <span className="text-3xl font-bold" style={{ color: meta.color }}>
                    {score}<span className="text-base text-muted-foreground">/100</span>
                  </span>
                </div>
                <div className="relative h-3 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all"
                    style={{ width: `${score}%`, background: `linear-gradient(90deg, #F59E0B, ${meta.color})`, boxShadow: `0 0 12px ${meta.color}80` }}
                  />
                  <div className="absolute top-0 bottom-0 w-px bg-[#22C55E]/50" style={{ left: "33%" }} />
                  <div className="absolute top-0 bottom-0 w-px bg-[#F59E0B]/50" style={{ left: "66%" }} />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>Safe</span><span>Warning</span><span>Danger</span>
                </div>
              </div>

              <p className="text-sm text-foreground/80 leading-relaxed rounded-xl p-3" style={{ background: `${meta.color}0d`, border: `1px solid ${meta.color}1a` }}>
                {report.risk.summary} <strong style={{ color: meta.color }}>{report.risk.recommendation}</strong>
              </p>
            </div>

            {/* Signals */}
            <div className="rounded-2xl bg-[#111827] border border-white/[0.06] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
                <span className="text-sm font-semibold text-foreground">Warnings</span>
                <span className="ml-auto text-xs bg-white/[0.05] text-muted-foreground px-2 py-0.5 rounded-full font-medium">
                  {report.risk.signals.length} issues
                </span>
              </div>
              <div className="p-4 space-y-2.5">
                {report.risk.signals.length === 0 && (
                  <div className="flex items-center gap-2 text-xs text-[#22C55E] p-3">
                    <CheckCircle2 className="w-4 h-4" /> No risk signals detected in this transaction.
                  </div>
                )}
                {report.risk.signals.map((s, i) => {
                  const cfg = severityStyle[s.severity] ?? severityStyle.info
                  return (
                    <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl text-sm" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: cfg.color }} />
                      <span style={{ color: cfg.color }} className="text-xs leading-relaxed">{s.message}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Button className="bg-[#EF4444] hover:bg-[#dc2626] text-white font-semibold h-11">
                <XCircle className="w-4 h-4 mr-2" /> Reject Transaction
              </Button>
              <Button variant="outline" className="h-11 border-[#22C55E]/30 bg-[#22C55E]/5 hover:bg-[#22C55E]/10 text-[#22C55E] font-medium">
                <CheckCircle2 className="w-4 h-4 mr-2" /> Proceed Anyway
              </Button>
            </div>
          </div>
        </div>
      )}

      {loading && !report && (
        <div className="flex items-center justify-center gap-2 text-muted-foreground py-20">
          <Loader2 className="w-5 h-5 animate-spin" /> Running Guardian simulation…
        </div>
      )}
    </div>
  )
}

function short(a: string): string {
  if (!a || a.length < 12) return a
  return `${a.slice(0, 8)}…${a.slice(-4)}`
}
