# SentinelAI Guardian — Chrome Extension

The primary product: a real-time **Web3 antivirus** built with [Plasmo](https://docs.plasmo.com).
It intercepts wallet transactions before you sign, scans the active site, and
explains risk using the SentinelAI Guardian backend (AWS Bedrock when configured).

## How it works

```
Page (MAIN world)                 Extension (ISOLATED + worker)        Backend
─────────────────                 ─────────────────────────────        ───────
                          background.ts injects the hook ──┐
window.ethereum.request  ◀──── (chrome.scripting, MAIN) ───┘
   risky method? ────postMessage──▶ guardian.tsx (overlay)
                                      └─ chrome.runtime ─▶ background.ts ─▶ /api/analyze
                                      ◀──── AnalysisResult ──────────────────┘
   ◀── decision (approve/reject) ── user clicks Reject / Proceed / Explain
```

- **`background.ts` → `inpageInterceptor`** (Module 8) — a self-contained hook
  injected into the page's MAIN world via `chrome.scripting.executeScript` at
  navigation start. It wraps `window.ethereum` and pauses `eth_sendTransaction`,
  `eth_sign`, `personal_sign`, and `signTypedData`. Never auto-signs; fails open
  after 60s so it can't lock a wallet. (Injection from the worker is used instead
  of a `world: "MAIN"` content script because that registration is unreliable
  across Plasmo/Chrome versions.)
- **`contents/guardian.tsx`** (Module 9) — the warning overlay: risk score,
  signals, and **Reject / Proceed Anyway / Explain With AI** buttons.
- **`background.ts`** (Module 10) — message router (cross-origin backend calls)
  plus a periodic active-tab domain scan that drives the toolbar badge and
  desktop notifications.
- **`popup.tsx`** (Module 20) — Home, Wallet Health, Approvals, Threat Feed,
  Copilot, and Settings (shows the live AI backend: AWS Bedrock / Anthropic / local).

## Real wallet data (no mock)

The Wallet Health and Approvals tabs show **real on-chain data**, never invented
numbers:

1. The injected MAIN-world hook reads your **connected address** from
   `window.ethereum` (`eth_accounts`, no prompt) and forwards it to the worker.
2. The popup asks the backend for that address with `?live=1`. The backend reads
   genuine ERC-20 allowances + NFT operator approvals from **Alchemy** (the
   Alchemy key stays server-side — never in the extension).
3. If no wallet is connected, or the backend has no `ALCHEMY_API_KEY`, the tabs
   show an honest "connect a wallet" / "configure a provider" state instead of
   fabricated data.

Set `ALCHEMY_API_KEY` on the backend (see the root `.env.example`). Get a free
key at [alchemy.com](https://www.alchemy.com) → create an app on the network you
want (e.g. Ethereum Mainnet) → copy its API key.

## Develop & load

```bash
# 1. Start the backend (repo root)
cd .. && pnpm dev          # http://localhost:3000

# 2. Build the extension
cd extension
pnpm install
pnpm dev                   # writes build/chrome-mv3-dev
```

Then in Chrome → `chrome://extensions` → enable **Developer mode** →
**Load unpacked** → select `extension/build/chrome-mv3-dev`.

For a production bundle: `pnpm build` → `build/chrome-mv3-prod`.

## Config

Set the backend URL (defaults to `http://localhost:3000`) in `.env`:

```
PLASMO_PUBLIC_API_URL=https://your-api-gateway-url
```

The AI backend (AWS Bedrock vs local) is chosen server-side — see the root
`.env.example`. The popup's Settings tab shows which one is active.
