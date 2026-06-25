"use client"

import { useEffect, useRef, useState } from "react"
import {
  Shield, Bell, Eye, Globe, Bot, Zap,
  Check, Pencil, X, Copy, RefreshCw, Wallet, Cloud,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useWallet } from "@/lib/wallet-context"
import { api } from "@/lib/api"

const STORAGE_KEY = "sentinel:settings"

interface ToggleProps {
  checked: boolean
  onChange: (v: boolean) => void
}

function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
        checked ? "bg-[#4F9CF9]" : "bg-white/[0.12]"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  )
}

const sections = [
  {
    id: "protection", icon: Shield, color: "#4F9CF9", title: "Protection Settings",
    settings: [
      { key: "auto_block", label: "Auto-block critical transactions", description: "Automatically reject transactions with a risk score above 80", defaultOn: true },
      { key: "unlimited_alert", label: "Alert on unlimited approvals", description: "Warn when any transaction requests an unlimited token approval", defaultOn: true },
      { key: "new_contract", label: "Flag new contracts", description: "Show warnings for contracts deployed less than 30 days ago", defaultOn: true },
      { key: "drainer_check", label: "Drainer bytecode matching", description: "Cross-reference contract bytecode against known drainer patterns", defaultOn: true },
    ],
  },
  {
    id: "notifications", icon: Bell, color: "#F59E0B", title: "Notifications",
    settings: [
      { key: "threat_alerts", label: "Real-time threat alerts", description: "Get notified when new threats matching your wallets are detected", defaultOn: true },
      { key: "approval_digest", label: "Weekly approval digest", description: "Receive a weekly summary of your approval risk profile", defaultOn: false },
      { key: "health_change", label: "Health score changes", description: "Notify when your wallet health score drops by more than 5 points", defaultOn: true },
      { key: "browser_notifs", label: "Browser notifications", description: "Allow desktop notifications from the extension", defaultOn: false },
    ],
  },
  {
    id: "privacy", icon: Eye, color: "#8B5CF6", title: "Privacy & Data",
    settings: [
      { key: "anon_analytics", label: "Anonymous usage analytics", description: "Help improve SentinelAI with anonymized product analytics", defaultOn: true },
      { key: "wallet_index", label: "Index wallet for threat matching", description: "Allow your wallet address to be used for proactive threat matching", defaultOn: true },
      { key: "share_intel", label: "Share threat intelligence", description: "Contribute blocked threats to community threat database", defaultOn: false },
    ],
  },
  {
    id: "ai", icon: Bot, color: "#22C55E", title: "AI Copilot",
    settings: [
      { key: "ai_context", label: "Include wallet context", description: "Allow AI Copilot to access your full transaction and approval history for better answers", defaultOn: true },
      { key: "ai_suggestions", label: "Proactive AI suggestions", description: "Allow the AI to surface insights without being asked", defaultOn: false },
    ],
  },
]

const defaultToggles = (): Record<string, boolean> => {
  const init: Record<string, boolean> = {}
  sections.forEach((s) => s.settings.forEach((setting) => { init[setting.key] = setting.defaultOn }))
  return init
}

interface Profile {
  email: string
  name: string
  apiKey: string
}

function genApiKey(): string {
  const bytes = new Uint8Array(16)
  if (typeof crypto !== "undefined") crypto.getRandomValues(bytes)
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256)
  return "sk-sentinel-" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
}

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())

export function SettingsPage() {
  const { address } = useWallet()
  const [toggles, setToggles] = useState<Record<string, boolean>>(defaultToggles)
  const [profile, setProfile] = useState<Profile>({ email: "", name: "", apiKey: "" })
  const [loaded, setLoaded] = useState(false)
  const [saved, setSaved] = useState(false)
  // Cross-device sync status: "off" (no wallet/db), "synced", or "saving".
  const [sync, setSync] = useState<"off" | "synced" | "saving">("off")
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const serverLoadedFor = useRef<string | null>(null)

  // Inline-edit state
  const [editing, setEditing] = useState<null | "email" | "name">(null)
  const [draft, setDraft] = useState("")
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Load persisted settings.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const s = JSON.parse(raw)
        if (s.toggles) setToggles((t) => ({ ...t, ...s.toggles }))
        if (s.profile) setProfile((p) => ({ ...p, ...s.profile }))
      }
    } catch {
      /* ignore corrupt storage */
    }
    setProfile((p) => (p.apiKey ? p : { ...p, apiKey: genApiKey() }))
    setLoaded(true)
  }, [])

  // When a wallet connects, pull its cross-device settings from the server and
  // merge them in (server wins for profile + toggles; the API key stays local).
  useEffect(() => {
    if (!loaded || !address || serverLoadedFor.current === address) return
    serverLoadedFor.current = address
    api.getSettings(address)
      .then((r) => {
        if (!r.configured) { setSync("off"); return }
        if (r.settings) {
          if (r.settings.toggles) setToggles((t) => ({ ...t, ...r.settings!.toggles }))
          if (r.settings.profile) setProfile((p) => ({ ...p, ...r.settings!.profile }))
        }
        setSync("synced")
      })
      .catch(() => setSync("off"))
  }, [address, loaded])

  // Reset sync state when the wallet disconnects.
  useEffect(() => {
    if (!address) { setSync("off"); serverLoadedFor.current = null }
  }, [address])

  // Auto-persist any change: always to localStorage, and (debounced) to the
  // server when a wallet is connected and the DB is configured.
  useEffect(() => {
    if (!loaded) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ toggles, profile }))
    } catch {
      /* storage may be unavailable */
    }
    if (!address || sync === "off") return
    setSync("saving")
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      api.saveSettings(address, { toggles, profile: { email: profile.email, name: profile.name } })
        .then((r) => setSync(r.saved ? "synced" : "off"))
        .catch(() => setSync("synced"))
    }, 800)
  }, [toggles, profile, loaded, address])

  function startEdit(field: "email" | "name") {
    setEditing(field)
    setDraft(profile[field])
    setFieldError(null)
  }
  function commitEdit() {
    if (!editing) return
    const value = draft.trim()
    if (editing === "email" && value && !isEmail(value)) {
      setFieldError("Enter a valid email address")
      return
    }
    setProfile((p) => ({ ...p, [editing]: value }))
    setEditing(null)
    setFieldError(null)
  }

  function regenerateKey() {
    setProfile((p) => ({ ...p, apiKey: genApiKey() }))
    setCopied(false)
  }
  async function copyKey() {
    try {
      await navigator.clipboard.writeText(profile.apiKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked */
    }
  }

  function deleteAccount() {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
    setToggles(defaultToggles())
    setProfile({ email: "", name: "", apiKey: genApiKey() })
    setConfirmDelete(false)
  }

  function handleSave() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ toggles, profile }))
    } catch {
      /* ignore */
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-3xl space-y-5">
      {/* Plan card */}
      <div className="rounded-2xl bg-[#111827] border border-[#4F9CF9]/25 p-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#4F9CF9]/12 border border-[#4F9CF9]/25 flex items-center justify-center">
            <Zap className="w-5 h-5 text-[#4F9CF9]" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">Beta — Free</div>
            <div className="text-xs text-muted-foreground mt-0.5">Full Guardian engine · paid plans coming soon</div>
          </div>
        </div>
      </div>

      {/* Account — fully editable, persisted locally */}
      <div className="rounded-2xl bg-[#111827] border border-white/[0.06] overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/[0.06]">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#6B7A8D]/12 border border-[#6B7A8D]/25">
            <Globe className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <span className="text-sm font-semibold text-foreground">Account</span>
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            {sync === "off" ? (
              "Saved to this browser"
            ) : (
              <>
                <Cloud className="w-3 h-3" style={{ color: sync === "saving" ? "#F59E0B" : "#22C55E" }} />
                {sync === "saving" ? "Syncing…" : "Synced to wallet"}
              </>
            )}
          </span>
        </div>
        <div className="p-5 space-y-1">
          {/* Connected wallet (identity) */}
          <div className="flex items-center justify-between py-2.5">
            <div className="flex items-center gap-2.5">
              <Wallet className="w-4 h-4 text-[#4F9CF9]" />
              <div>
                <div className="text-sm font-medium text-foreground">Connected wallet</div>
                <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                  {address ? `${address.slice(0, 8)}…${address.slice(-6)}` : "Not connected"}
                </div>
              </div>
            </div>
          </div>

          {/* Display name */}
          <AccountRow
            label="Display name"
            editing={editing === "name"}
            value={profile.name}
            placeholder="Not set"
            draft={draft}
            setDraft={setDraft}
            onEdit={() => startEdit("name")}
            onCommit={commitEdit}
            onCancel={() => { setEditing(null); setFieldError(null) }}
          />

          {/* Email */}
          <AccountRow
            label="Email"
            editing={editing === "email"}
            value={profile.email}
            placeholder="Not set"
            draft={draft}
            setDraft={setDraft}
            error={editing === "email" ? fieldError : null}
            inputType="email"
            onEdit={() => startEdit("email")}
            onCommit={commitEdit}
            onCancel={() => { setEditing(null); setFieldError(null) }}
          />

          {/* API key */}
          <div className="flex items-center justify-between py-2.5 border-t border-white/[0.04]">
            <div className="min-w-0 pr-4">
              <div className="text-sm font-medium text-foreground">API Key</div>
              <div className="text-xs text-muted-foreground mt-0.5 font-mono truncate">
                {profile.apiKey.slice(0, 14)}…{profile.apiKey.slice(-4)}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={copyKey} className="h-7 text-xs border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-muted-foreground">
                {copied ? <><Check className="w-3 h-3 mr-1 text-[#22C55E]" /> Copied</> : <><Copy className="w-3 h-3 mr-1" /> Copy</>}
              </Button>
              <Button size="sm" variant="outline" onClick={regenerateKey} className="h-7 text-xs border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-muted-foreground">
                <RefreshCw className="w-3 h-3 mr-1" /> Regenerate
              </Button>
            </div>
          </div>

          {/* Delete */}
          <div className="flex items-center justify-between py-2.5 border-t border-white/[0.04]">
            <div>
              <div className="text-sm font-medium text-[#EF4444]">Reset local data</div>
              <div className="text-xs text-muted-foreground mt-0.5">Clear your saved settings, profile, and API key from this browser</div>
            </div>
            {confirmDelete ? (
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" onClick={deleteAccount} className="h-7 text-xs bg-[#EF4444] hover:bg-[#dc2626] text-white">Confirm</Button>
                <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)} className="h-7 text-xs border-white/10 bg-white/[0.03] text-muted-foreground">Cancel</Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setConfirmDelete(true)} className="h-7 text-xs border-[#EF4444]/30 bg-[#EF4444]/5 hover:bg-[#EF4444]/10 text-[#EF4444] shrink-0">
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Settings sections */}
      {sections.map((section) => (
        <div key={section.id} className="rounded-2xl bg-[#111827] border border-white/[0.06] overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/[0.06]">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${section.color}12`, border: `1px solid ${section.color}25` }}>
              <section.icon className="w-3.5 h-3.5" style={{ color: section.color }} />
            </div>
            <span className="text-sm font-semibold text-foreground">{section.title}</span>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {section.settings.map((setting) => (
              <div key={setting.key} className="flex items-center justify-between px-5 py-4">
                <div className="flex-1 pr-8">
                  <div className="text-sm font-medium text-foreground">{setting.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{setting.description}</div>
                </div>
                <Toggle checked={!!toggles[setting.key]} onChange={(v) => setToggles((prev) => ({ ...prev, [setting.key]: v }))} />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Save button */}
      <div className="flex items-center justify-end gap-3">
        <span className="text-xs text-muted-foreground">Changes save automatically</span>
        <Button
          onClick={handleSave}
          className={`h-10 px-6 font-semibold text-sm transition-all ${saved ? "bg-[#22C55E] hover:bg-[#16a34a] text-white" : "bg-[#4F9CF9] hover:bg-[#3a87e8] text-[#0A0A0A]"}`}
        >
          {saved ? <><Check className="w-4 h-4 mr-2" /> Saved!</> : "Save Settings"}
        </Button>
      </div>
    </div>
  )
}

// Editable account row (display name / email).
function AccountRow({
  label, value, placeholder, editing, draft, setDraft, onEdit, onCommit, onCancel, error, inputType = "text",
}: {
  label: string
  value: string
  placeholder: string
  editing: boolean
  draft: string
  setDraft: (v: string) => void
  onEdit: () => void
  onCommit: () => void
  onCancel: () => void
  error?: string | null
  inputType?: string
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-t border-white/[0.04]">
      <div className="min-w-0 pr-4 flex-1">
        <div className="text-sm font-medium text-foreground">{label}</div>
        {editing ? (
          <div className="mt-1.5">
            <div className="flex items-center gap-2">
              <Input
                autoFocus
                type={inputType}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") onCommit(); if (e.key === "Escape") onCancel() }}
                placeholder={placeholder}
                className="h-8 bg-[#0D1117] border-white/[0.08] text-sm max-w-xs"
              />
              <Button size="sm" onClick={onCommit} className="h-8 px-3 text-xs bg-[#4F9CF9] hover:bg-[#3a87e8] text-[#0A0A0A]">Save</Button>
              <Button size="sm" variant="outline" onClick={onCancel} className="h-8 w-8 p-0 border-white/10 bg-white/[0.03] text-muted-foreground"><X className="w-3.5 h-3.5" /></Button>
            </div>
            {error && <div className="text-[11px] text-[#EF4444] mt-1">{error}</div>}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground mt-0.5">{value || placeholder}</div>
        )}
      </div>
      {!editing && (
        <Button size="sm" variant="outline" onClick={onEdit} className="h-7 text-xs border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-muted-foreground shrink-0">
          <Pencil className="w-3 h-3 mr-1" /> {value ? "Change" : "Set"}
        </Button>
      )}
    </div>
  )
}
