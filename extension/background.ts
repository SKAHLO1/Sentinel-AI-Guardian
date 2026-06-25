// Background service worker — Web3 Antivirus background scanner (Module 10) +
// transaction-interceptor injector (Module 8).
//
// Responsibilities:
//   • Inject the MAIN-world `window.ethereum` hook into every page (via
//     chrome.scripting, which reliably targets the page's MAIN world).
//   • Message router for content scripts (cross-origin backend calls live here,
//     where host_permissions apply).
//   • Periodic scan of the active tab's domain via the Guardian engine.
//   • Badge + desktop notifications when a threat is detected.

import { guardianApi } from "~lib/api"

const SCAN_ALARM = "guardian-scan"
const MONITOR_ALARM = "guardian-approval-monitor"

// ---------------------------------------------------------------------------
// MAIN-world interceptor. This function is serialized and injected into the
// page context, so it must be fully self-contained (no outer references). It
// wraps window.ethereum.request and, for risky methods, asks the isolated
// Guardian content script (via window.postMessage) for the user's decision
// before proceeding. It NEVER auto-signs.
// ---------------------------------------------------------------------------
function inpageInterceptor() {
  const RISKY = new Set([
    "eth_sendTransaction",
    "eth_sign",
    "personal_sign",
    "eth_signTypedData",
    "eth_signTypedData_v3",
    "eth_signTypedData_v4",
  ])
  const w = window as any
  if (w.__sentinelInstalled) return
  w.__sentinelInstalled = true

  let seq = 0
  // Each pending review resolves with the user's decision and, for the
  // spending-cap feature, optionally rewritten params to submit instead.
  const pending = new Map<string, (d: { decision: string; modifiedParams?: any[] }) => void>()

  window.addEventListener("message", (event) => {
    if (event.source !== window) return
    const msg: any = event.data
    if (!msg || msg.__sentinel !== "decision") return
    const resolve = pending.get(msg.id)
    if (resolve) {
      pending.delete(msg.id)
      resolve({ decision: msg.decision, modifiedParams: msg.modifiedParams })
    }
  })

  function review(method: string, params: any[]): Promise<{ decision: string; modifiedParams?: any[] }> {
    const id = `sentinel-${Date.now()}-${seq++}`
    return new Promise((resolve) => {
      pending.set(id, resolve)
      window.postMessage({ __sentinel: "intercept", id, method, params, origin: location.origin }, "*")
      setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id)
          resolve({ decision: "approve" }) // fail open — never hard-lock the wallet
        }
      }, 60000)
    })
  }

  function rejected(): any {
    const err: any = new Error("Transaction rejected by SentinelAI Guardian")
    err.code = 4001 // EIP-1193 user-rejected
    return err
  }

  function wrap(provider: any) {
    if (!provider || provider.__sentinelWrapped) return
    const original = provider.request?.bind(provider)
    if (!original) return

    const wrapped = async (args: { method: string; params?: any[] }) => {
      if (args && args.method && RISKY.has(args.method)) {
        const { decision, modifiedParams } = await review(args.method, args.params ?? [])
        if (decision === "reject") throw rejected()
        // Spending-cap rewrite: submit the user's capped calldata instead.
        if (decision === "modify" && modifiedParams) {
          return original({ ...args, params: modifiedParams })
        }
      }
      return original(args)
    }

    // Some wallets make `request` read-only — fall back to defineProperty.
    let ok = false
    try {
      provider.request = wrapped
      ok = provider.request === wrapped
    } catch {
      ok = false
    }
    if (!ok) {
      try {
        Object.defineProperty(provider, "request", { configurable: true, writable: true, value: wrapped })
        ok = provider.request === wrapped
      } catch {
        ok = false
      }
    }
    if (!ok) return // couldn't install; leave the provider untouched

    // Legacy paths some libraries still use.
    if (typeof provider.send === "function" && !provider.__sentinelSend) {
      const send = provider.send.bind(provider)
      provider.send = async (a: any, b: any) => {
        const method = typeof a === "string" ? a : a?.method
        const params = typeof a === "string" ? b : a?.params
        if (method && RISKY.has(method)) {
          const { decision } = await review(method, params ?? [])
          if (decision === "reject") throw rejected()
        }
        return send(a, b)
      }
      provider.__sentinelSend = true
    }

    provider.__sentinelWrapped = true
  }

  function reportAccounts(accounts: any) {
    if (Array.isArray(accounts) && accounts[0]) {
      window.postMessage({ __sentinel: "accounts", address: String(accounts[0]).toLowerCase() }, "*")
    }
  }
  function captureAccounts() {
    try {
      if (!w.ethereum) return
      // eth_accounts does NOT prompt — returns the already-connected account(s).
      w.ethereum.request({ method: "eth_accounts" }).then(reportAccounts).catch(() => {})
      if (!w.__sentinelAccountsHooked && typeof w.ethereum.on === "function") {
        w.__sentinelAccountsHooked = true
        w.ethereum.on("accountsChanged", reportAccounts)
      }
    } catch {
      /* provider not ready */
    }
  }

  function reportChain(hexId: any) {
    const id = typeof hexId === "string" ? parseInt(hexId, 16) : Number(hexId)
    if (id) window.postMessage({ __sentinel: "chain", chainId: id }, "*")
  }
  function captureChain() {
    try {
      if (!w.ethereum) return
      w.ethereum.request({ method: "eth_chainId" }).then(reportChain).catch(() => {})
      if (!w.__sentinelChainHooked && typeof w.ethereum.on === "function") {
        w.__sentinelChainHooked = true
        w.ethereum.on("chainChanged", reportChain)
      }
    } catch {
      /* provider not ready */
    }
  }

  // Wrap every provider we can find: window.ethereum, its `.providers[]`
  // array (multiple wallets), and any provider announced via EIP-6963 —
  // which is how RainbowKit/wagmi dApps (Arbitrum bridge, etc.) discover wallets.
  function install() {
    try {
      const eth = w.ethereum
      if (eth) {
        wrap(eth)
        if (Array.isArray(eth.providers)) eth.providers.forEach((p: any) => wrap(p))
        captureAccounts()
        captureChain()
      }
    } catch {
      /* provider not ready */
    }
  }

  // EIP-6963: wrap providers as wallets announce them.
  window.addEventListener("eip6963:announceProvider", (event: any) => {
    try {
      wrap(event?.detail?.provider)
    } catch {
      /* ignore */
    }
  })
  // Ask any EIP-6963 wallets to (re)announce so we can wrap them now.
  try {
    window.dispatchEvent(new Event("eip6963:requestProvider"))
  } catch {
    /* ignore */
  }

  install()
  window.addEventListener("ethereum#initialized", install)
  // Re-wrap periodically: providers can be injected/replaced after load, and
  // SPA dApps may swap them on connect. Keep checking for ~30s.
  let ticks = 0
  const poll = setInterval(() => {
    install()
    try {
      window.dispatchEvent(new Event("eip6963:requestProvider"))
    } catch {
      /* ignore */
    }
    if (++ticks > 60) clearInterval(poll)
  }, 500)
}

// Runs in the page's MAIN world: ask the dApp's wallet to connect. Must be
// fully self-contained (it is serialized and injected).
function requestAccountsInPage() {
  const eth = (window as any).ethereum
  if (!eth || typeof eth.request !== "function") return { error: "no-provider" }
  return eth
    .request({ method: "eth_requestAccounts" })
    .then(async (accs: string[]) => {
      let chainId: number | undefined
      try {
        chainId = parseInt(await eth.request({ method: "eth_chainId" }), 16)
      } catch {
        /* ignore */
      }
      return { address: accs && accs[0] ? accs[0] : null, chainId }
    })
    .catch((e: any) => ({ error: (e && e.message) || "rejected" }))
}

// "Connect Wallet" from the popup → trigger the wallet prompt on the active
// dApp tab and persist the returned address.
async function connectActiveTabWallet(): Promise<{ address?: string; chainId?: number; error?: string }> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
  if (!tab?.id || !tab.url || !/^https?:/.test(tab.url)) {
    return { error: "Open a dApp website in this tab first, then click Connect." }
  }
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      func: requestAccountsInPage,
    })
    const out = res?.result as { address?: string | null; chainId?: number; error?: string } | undefined
    if (out?.address) {
      const address = out.address.toLowerCase()
      await chrome.storage.local.set({ connectedAddress: address, ...(out.chainId ? { connectedChainId: out.chainId } : {}) })
      return { address, chainId: out.chainId }
    }
    if (out?.error === "no-provider") {
      return { error: "No EVM wallet found on this page. Open a dApp with MetaMask/Rabby installed." }
    }
    return { error: out?.error ? `Wallet: ${out.error}` : "Connection was rejected." }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

async function injectInterceptor(tabId: number, url?: string) {
  if (!url || !/^https?:/.test(url)) return
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      injectImmediately: true,
      func: inpageInterceptor,
    })
  } catch {
    // Restricted page (chrome://, store, etc.) — nothing to protect.
  }
}

// --- Message router -------------------------------------------------------
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  ;(async () => {
    try {
      switch (msg?.type) {
        case "ensureInterceptor": {
          // The content script loaded — make sure the MAIN-world interceptor is
          // installed in its tab (covers tabs missed by navigation events).
          if (sender.tab?.id) await injectInterceptor(sender.tab.id, sender.tab.url)
          sendResponse({ ok: true })
          break
        }
        case "analyze": {
          // Attach the connected address + chain so the scan is saved and the
          // reputation/on-chain checks use the right network.
          const { connectedAddress, connectedChainId } = await chrome.storage.local.get([
            "connectedAddress",
            "connectedChainId",
          ])
          sendResponse(
            await guardianApi.analyze({ ...msg.payload, address: connectedAddress, chainId: connectedChainId }),
          )
          break
        }
        case "copilot":
          sendResponse(await guardianApi.copilot(msg.payload))
          break
        case "decode":
          sendResponse(await guardianApi.decode(msg.payload))
          break
        case "token":
          sendResponse(await guardianApi.token(msg.payload.address, msg.payload.chainId))
          break
        case "simulate": {
          const { connectedChainId } = await chrome.storage.local.get("connectedChainId")
          sendResponse(await guardianApi.simulate({ ...msg.payload, chainId: connectedChainId }))
          break
        }
        case "scanDomain":
          sendResponse(await guardianApi.domain(msg.payload.domain))
          break
        case "report":
          sendResponse(await guardianApi.report(msg.payload))
          break
        case "getStatus": {
          const { lastScan } = await chrome.storage.local.get("lastScan")
          sendResponse(lastScan ?? null)
          break
        }
        case "setAccount": {
          await chrome.storage.local.set({ connectedAddress: msg.address })
          sendResponse({ ok: true })
          break
        }
        case "getAccount": {
          const { connectedAddress, connectedChainId } = await chrome.storage.local.get([
            "connectedAddress",
            "connectedChainId",
          ])
          sendResponse({ address: connectedAddress ?? null, chainId: connectedChainId ?? null })
          break
        }
        case "setChain": {
          await chrome.storage.local.set({ connectedChainId: msg.chainId })
          sendResponse({ ok: true })
          break
        }
        case "connectWallet":
          sendResponse(await connectActiveTabWallet())
          break
        case "disconnectWallet":
          await chrome.storage.local.remove(["connectedAddress", "connectedChainId"])
          sendResponse({ ok: true })
          break
        case "health":
          sendResponse(await guardianApi.health())
          break
        default:
          sendResponse({ error: "unknown message type" })
      }
    } catch (err) {
      sendResponse({ error: (err as Error).message })
    }
  })()
  return true // keep the channel open for the async response
})

// --- Lifecycle ------------------------------------------------------------
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(SCAN_ALARM, { periodInMinutes: 0.25 }) // domain scan, every 15s
  chrome.alarms.create(MONITOR_ALARM, { periodInMinutes: 5 }) // approval watch, every 5m
  void injectAllOpenTabs()
  void scanActiveTab()
})
chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(MONITOR_ALARM, { periodInMinutes: 5 })
  void injectAllOpenTabs()
  void scanActiveTab()
})
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SCAN_ALARM) void scanActiveTab()
  else if (alarm.name === MONITOR_ALARM) void monitorApprovals()
})
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId).catch(() => null)
  if (tab?.url) void injectInterceptor(tabId, tab.url)
  void scanActiveTab()
})

// Inject the interceptor early on navigation, and rescan when the page settles.
chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.status === "loading") void injectInterceptor(tabId, tab.url)
  if (info.status === "complete") {
    void injectInterceptor(tabId, tab.url) // belt-and-suspenders for late providers
    void scanActiveTab()
  }
})

// Cover tabs that were already open when the extension was installed/updated.
async function injectAllOpenTabs() {
  const tabs = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] }).catch(() => [])
  for (const t of tabs) if (t.id && t.url) void injectInterceptor(t.id, t.url)
}

// --- Periodic active-tab scanner -----------------------------------------
async function scanActiveTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
    if (!tab?.url || !/^https?:/.test(tab.url)) {
      await setBadge("clear")
      return
    }
    const host = new URL(tab.url).host
    const { connectedAddress } = await chrome.storage.local.get("connectedAddress")
    const scan = await guardianApi.guardianScan({ domain: host, address: connectedAddress })
    await chrome.storage.local.set({ lastScan: { ...scan, host, at: Date.now() } })
    await setBadge(scan.status)
    if (scan.status === "blocked") {
      await notify(host, scan.findings[0]?.message ?? "Dangerous site detected")
    }
  } catch {
    await setBadge("clear")
  }
}

// Periodically watch the connected wallet's approvals and alert on NEW risky
// ones — proactive monitoring even when the user isn't actively transacting.
async function monitorApprovals() {
  try {
    const { connectedAddress, connectedChainId, knownRiskyApprovals } = await chrome.storage.local.get([
      "connectedAddress",
      "connectedChainId",
      "knownRiskyApprovals",
    ])
    if (!connectedAddress) return
    const res = await guardianApi.approvalsLive(connectedAddress, connectedChainId)
    if (!res.configured || !res.approvals) return
    const risky = res.approvals.filter((a) => a.risk === "critical" || a.risk === "high")
    const known: string[] = knownRiskyApprovals ?? []
    const knownSet = new Set(known)
    const fresh = risky.filter((a) => !knownSet.has(a.id))

    // Only alert once we have a baseline (don't fire on the very first scan).
    if (known.length > 0 && fresh.length > 0) {
      const a = fresh[0]
      await notify(
        a.id, // dedupe per new approval, not per wallet
        `${fresh.length} new risky approval${fresh.length > 1 ? "s" : ""}: ${a.tokenSymbol} → ${a.spenderLabel}`,
        "approval",
      )
    }
    await chrome.storage.local.set({ knownRiskyApprovals: risky.map((a) => a.id) })
  } catch {
    /* monitoring is best-effort */
  }
}

async function setBadge(status: "clear" | "warning" | "blocked") {
  const map = {
    clear: { text: "", color: "#22C55E" },
    warning: { text: "!", color: "#F59E0B" },
    blocked: { text: "✕", color: "#EF4444" },
  } as const
  const cfg = map[status]
  await chrome.action.setBadgeText({ text: cfg.text })
  await chrome.action.setBadgeBackgroundColor({ color: cfg.color })
}

const lastNotified: Record<string, string> = {}
async function notify(key: string, message: string, kind: "site" | "approval" = "site") {
  // Dedupe per kind so a site alert and an approval alert don't suppress each other.
  if (lastNotified[kind] === key) return
  lastNotified[kind] = key
  try {
    chrome.notifications.create(`sentinel-${Date.now()}`, {
      type: "basic",
      iconUrl: chrome.runtime.getURL("assets/icon.png"),
      title: kind === "approval" ? "🔔 SentinelAI — New Risky Approval" : "⚠ SentinelAI Guardian — Threat Detected",
      message: kind === "approval" ? message : `${key}: ${message}`,
      priority: 2,
    })
  } catch {
    /* notifications optional */
  }
}

export {}
