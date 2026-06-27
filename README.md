# SentinelAI Guardian

> **Stop Blind Signing. The AI Antivirus for Web3.**

SentinelAI Guardian is a real‑time Web3 security platform that protects users
**before** they sign. It decodes and risk‑scores every transaction and signature,
flags phishing sites, scans wallet approvals, and explains the danger in plain
English — powered by a genuine on‑chain analysis engine and AWS Bedrock (Claude).

It ships as three connected pieces:

| Piece | What it is | Where |
|-------|------------|-------|
| **Chrome extension** | An MV3 antivirus that intercepts wallet transactions/signatures on any dApp, decodes them, and shows a warning overlay before your wallet opens. | [`extension/`](extension/) |
| **Web dashboard** | A Next.js command center — wallet health, approvals, transaction simulator, threat feed, AI Copilot, settings. | [`app/`](app/), [`components/`](components/) |
| **Backend engine + API** | The "Guardian engine" (TypeScript) behind Next.js route handlers — shared by both the dashboard and the extension. | [`lib/engine/`](lib/engine/), [`app/api/`](app/api/) |

A core design principle: **everything degrades gracefully.** With zero cloud keys
the app still runs end‑to‑end (deterministic decoding + rule‑based AI fallback).
Add keys to unlock the real‑data features — each one shows an honest
"not configured" state instead of inventing data.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [The Guardian engine](#the-guardian-engine-libengine)
- [API routes](#api-routes-appapi)
- [Configuration (environment variables)](#configuration-environment-variables)
- [Running locally](#running-locally)
- [Multi‑chain support](#multi-chain-support)
- [AI backends](#ai-backends)
- [Chrome extension](#chrome-extension)
- [Testing](#testing)
- [Deployment](#deployment)

---

## Features

### Transaction & signature protection
- **Transaction interceptor (extension)** — wraps the page's `window.ethereum`
  provider (and EIP‑6963‑announced providers used by RainbowKit/wagmi) and
  **pauses** `eth_sendTransaction`, `eth_sign`, `personal_sign`, and
  `signTypedData` before the wallet opens. Never auto‑signs; fails open after 60s.
- **Calldata decoding** — three layers: a static selector table (ERC‑20/721/1155,
  Permit2), the public **4byte directory** for unknown selectors, and **AWS
  Bedrock (Claude)** for a full plain‑English decode of the parameters.
- **Off‑chain signature decoding** — decodes EIP‑712 typed data: **ERC‑2612
  Permit**, **Uniswap Permit2**, and **Seaport** orders (e.g. "this signature lets
  X spend unlimited USDC", or "you're listing an NFT for ~0").
- **Risk scoring engine** — aggregates all signals (unlimited approvals, flagged
  addresses, phishing origin, unverified contract, signature scope…) into a
  0–100 score + verdict (safe / caution / danger) with human‑readable reasons.
- **Spending‑cap rewrite** — for an unlimited approval, the overlay can rewrite
  the calldata to an exact amount and submit the safer transaction instead.
- **Warning overlay (Module 9)** — shows the decoded action, risk score, signals,
  real asset‑change simulation, and **Reject / Proceed / Explain with AI** buttons.

### On‑chain intelligence
- **Real wallet health & approval scanner** — reads genuine ERC‑20 allowances and
  NFT operator approvals from **Alchemy** (by scanning `Approval` /
  `ApprovalForAll` logs per held contract and reading current allowances), and
  scores the wallet's exposure.
- **Real transaction simulation** — Alchemy `simulateAssetChanges` produces actual
  asset deltas ("you will lose X, gain Y"); falls back to a heuristic report.
- **Contract reputation** — Etherscan V2 unified API checks whether a contract's
  source is verified, feeding the risk score.
- **Multi‑chain** — Ethereum, Base, Arbitrum, Optimism, Polygon, BNB Chain
  (decoding/interception are chain‑agnostic; on‑chain reads are chain‑aware).

### Threat intelligence
- **Live phishing/typosquat detection** — exact‑match against live public
  blocklists (**MetaMask eth‑phishing‑detect** + **ScamSniffer**, ~400k domains)
  plus Levenshtein/homoglyph typosquat heuristics against known‑good dApps.
- **Address‑poisoning & clipboard‑swap detection** — flags look‑alike addresses
  and clipboard hijacking.
- **Crowdsourced reporting** — users report scam domains/addresses; reports are
  stored in DynamoDB and folded back into the feed and blocklists.
- **Threat feed** — a searchable, continuously‑updated feed combining the public
  blocklists and community reports.

### AI, monitoring & persistence
- **AI Security Copilot** — a chat assistant grounded in live Guardian analysis of
  any calldata/domain in the question (AWS Bedrock → Anthropic → deterministic).
- **Background wallet monitoring** — the extension periodically re‑scans the
  connected wallet's approvals and fires a desktop notification on **new risky
  approvals**, even when you're not transacting.
- **Scan history & detected‑threat log** — every analysis is persisted to
  DynamoDB keyed by wallet, and recalled on the dashboard.
- **Cross‑device settings** — dashboard settings (toggles, profile) persist to
  DynamoDB keyed by the connected wallet, with a localStorage cache.
- **Rate limiting** — per‑IP limits on the paid routes (in‑memory by default,
  distributed via Upstash Redis when configured).

### UX
- **Wallet connect** — EIP‑1193 connect on the website; the extension connects via
  the active dApp tab.
- **Fully responsive** — mobile drawer navigation, `dvh`‑based layouts, responsive
  grids throughout.

---

## Tech stack

- **Framework:** Next.js 16 (App Router, Route Handlers) · React 19 · TypeScript
- **Styling:** Tailwind CSS v4 · shadcn‑style UI primitives · lucide‑react · framer‑motion · recharts
- **Extension:** Plasmo (Manifest V3)
- **AI:** AWS Bedrock (Claude) — `@aws-sdk/client-bedrock-runtime`; optional Anthropic API
- **On‑chain:** Alchemy JSON‑RPC + enhanced/NFT/simulation APIs
- **Reputation:** Etherscan V2 (unified multichain)
- **Persistence:** Amazon DynamoDB — `@aws-sdk/lib-dynamodb`
- **Rate limiting:** in‑memory or Upstash Redis (REST)
- **Threat feeds:** MetaMask eth‑phishing‑detect + ScamSniffer (public)
- **Testing:** Vitest (26 unit tests)
- **Deploy targets:** Vercel (web + API) · Chrome Web Store / load‑unpacked (extension)

---

## Architecture

```
 ┌──────────────────────┐        ┌───────────────────────────┐
 │   Chrome extension   │        │      Web dashboard        │
 │  (Plasmo MV3)        │        │  (Next.js app/, components)│
 │  interceptor+overlay │        │                           │
 └──────────┬───────────┘        └─────────────┬─────────────┘
            │  fetch()  (extension/lib/api.ts)  │ fetch() (lib/api.ts)
            └───────────────┬───────────────────┘
                            ▼
            ┌───────────────────────────────────┐
            │  Next.js Route Handlers (app/api) │
            │  + rate limiting (lib/rate-limit) │
            └───────────────┬───────────────────┘
                            ▼
            ┌───────────────────────────────────┐
            │      Guardian engine (lib/engine) │
            └───┬───────────┬───────────┬───────┘
                ▼           ▼           ▼
          AWS Bedrock   Alchemy /    DynamoDB /
          (Claude)      Etherscan    public feeds
```

---

## Project structure

```
sentinel-ai/
├── app/
│   ├── layout.tsx                 # Root layout (fonts, metadata, favicon)
│   ├── page.tsx                   # Landing page
│   ├── install/                   # /install — load-unpacked download + steps
│   ├── api/                       # 15 route handlers (see below)
│   └── dashboard/
│       ├── layout.tsx             # WalletProvider + MobileNavProvider + Sidebar
│       ├── page.tsx               # Overview (health gauge, stats, history, risk)
│       ├── wallets/               # Connected wallet detail
│       ├── simulator/             # Transaction simulator (+ AI decode, live sim)
│       ├── approvals/             # Approval manager (revoke)
│       ├── threats/               # Threat feed + security tools (reputation/report)
│       ├── copilot/               # AI Copilot chat
│       └── settings/              # Settings (toggles, profile, cross-device sync)
│
├── components/sentinel/           # All product UI (landing + dashboard)
│   ├── sidebar.tsx, topbar.tsx    # Dashboard chrome (mobile drawer + chain badge)
│   ├── wallet-health-gauge.tsx, dashboard-stats.tsx, scan-history.tsx, risk-timeline.tsx
│   ├── transaction-simulator.tsx, approval-manager.tsx, wallets-page.tsx
│   ├── threat-intelligence.tsx, security-tools.tsx, ai-copilot.tsx, settings-page.tsx
│   ├── empty-states.tsx           # Connect / configure-provider prompts
│   └── hero/features/pricing/footer/landing-nav  # Landing sections
│
├── lib/
│   ├── api.ts                     # Typed client for the dashboard
│   ├── wallet-context.tsx         # EIP-1193 wallet connect (address + chainId)
│   ├── mobile-nav.tsx             # Mobile drawer open/close context
│   ├── rate-limit.ts              # Per-IP limiter (memory or Upstash)
│   ├── utils.ts                   # cn() helper
│   └── engine/                    # ← the Guardian engine (see below)
│
├── extension/                     # Plasmo MV3 extension (own package)
│   ├── background.ts              # Service worker: interceptor injection,
│   │                              #   message router, scanner, wallet monitor
│   ├── contents/guardian.tsx      # Isolated content script + warning overlay
│   ├── popup.tsx                  # Popup: Home/Wallet/Approvals/Threats/Copilot/Settings
│   ├── lib/{api,types}.ts         # Backend client + shared types
│   └── README.md                  # Extension-specific docs
│
├── tests/engine.test.ts           # 26 Vitest unit tests for the engine
├── scripts/package-extension.mjs  # Builds + zips the extension into public/
├── docs/DEPLOYMENT.md             # Vercel + Chrome Web Store / load-unpacked guide
└── .env.example                   # All env vars (every feature optional)
```

---

## The Guardian engine (`lib/engine/`)

Pure, dependency‑light TypeScript that runs in any runtime (Node, edge, service
worker). Shared by the dashboard and the extension via the API.

| Module | Responsibility |
|--------|----------------|
| `calldata.ts` | Decode ERC‑20/721/1155/Permit2 selectors; detect MAX_UINT unlimited approvals & `setApprovalForAll`. |
| `fourbyte.ts` | Resolve unknown 4‑byte selectors via the public 4byte directory. |
| `signature.ts` | Decode EIP‑712 typed data: Permit, Permit2, Seaport. |
| `risk.ts` | Aggregate all signals → 0–100 risk score + verdict + recommendation. |
| `simulate.ts` | Heuristic asset‑delta / approval‑scope report (upgraded to live sim in the route). |
| `onchain.ts` | Alchemy: multi‑chain wallet health, approval scanner, token metadata, `simulateAssetChanges`. |
| `reputation.ts` | Etherscan V2 contract‑verification lookup (multichain). |
| `wallet.ts` | Wallet‑health scoring heuristic over a set of approvals. |
| `domains.ts` | Phishing / typosquat detection (live blocklists + Levenshtein + homoglyph). |
| `threat-feed.ts` | Fetch + cache live blocklists (MetaMask, ScamSniffer) + community reports. |
| `threat-intel.ts` | Seed/static threat data + known‑good dApp domains. |
| `address.ts` | Address‑poisoning & clipboard‑swap detection. |
| `bedrock.ts` | AWS Bedrock (Claude) client — the primary AI engine. |
| `copilot.ts` | AI explain + AI calldata decode (Bedrock → Anthropic → deterministic). |
| `db.ts` | DynamoDB: scan history, threat reports, user settings. |
| `types.ts` | Shared types. · `index.ts` — barrel export. |

---

## API routes (`app/api/`)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/analyze` | POST | Risk‑analyze a transaction/signature; persists to history; enriches with contract reputation. |
| `/api/decode` | POST | AI calldata decode (4byte + Bedrock). |
| `/api/simulate` | POST/GET | Simulation report (real asset changes via Alchemy when a full tx is provided). |
| `/api/guardian-scan` | POST | Aggregate background scan (domain + clipboard + poisoning). |
| `/api/copilot` | POST | AI Security Copilot answer. |
| `/api/wallet` | GET | Real wallet health for `?address=&chainId=`. |
| `/api/approvals` | GET/POST | Live approvals (GET) and revoke‑calldata builder (POST). |
| `/api/token` | GET | Token symbol/name/decimals (for the spending‑cap rewrite). |
| `/api/reputation` | GET | Contract verification status (Etherscan V2). |
| `/api/domains` | GET/POST | Phishing/typosquat verdict for a domain. |
| `/api/threats` | GET | Live threat feed (`?q=` search). |
| `/api/report` | POST | Submit a crowdsourced scam domain/address. |
| `/api/history` | GET/DELETE | Recall / clear a wallet's saved scan history. |
| `/api/settings` | GET/PUT | Cross‑device settings keyed by wallet. |
| `/api/health` | GET | Service + engine status (which backends are configured). |

Paid routes (`decode`, `copilot`, `wallet`, `approvals`, `analyze`,
`guardian-scan`, `report`, `settings`) are rate‑limited per IP.

---

## Configuration (environment variables)

Put these in **`.env.local`** (gitignored). **Every variable is optional** — each
unlocks a feature and degrades to an honest "not configured" state if absent.
See [`.env.example`](.env.example) for the annotated list.

| Variable(s) | Powers | Get it from |
|-------------|--------|-------------|
| `BEDROCK_MODEL_ID`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | AI decode + Copilot (AWS Bedrock) | AWS console → Bedrock + IAM |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL_ID` | AI fallback if not using Bedrock | console.anthropic.com |
| `ALCHEMY_API_KEY`, `ALCHEMY_NETWORK` | Wallet health, approvals, real simulation | alchemy.com (free tier) |
| `DYNAMODB_TABLE` (reuses AWS creds) | Scan history, reports, settings sync | AWS console → DynamoDB |
| `ETHERSCAN_API_KEY` | Contract reputation (all chains) | etherscan.io/myapikey (free) |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Distributed rate limiting | upstash.com (free tier) |
| `PLASMO_PUBLIC_API_URL` *(in `extension/.env`)* | Points the extension at your backend | your Vercel URL |

> **Bedrock model IDs:** newer Claude models require an inference profile — use the
> `us.`/`eu.`/`apac.` prefix (e.g. `us.anthropic.claude-sonnet-4-5-20250929-v1:0`).
> The backend auto‑prepends the right prefix if you provide a bare `anthropic.claude-…` id.

`/api/health` reports exactly which backends are live, e.g.:
```json
{ "aiBackend": "bedrock", "onchain": "alchemy", "database": "dynamodb" }
```

---

## Running locally

```bash
# 1. Web dashboard + API
pnpm install
pnpm dev                # http://localhost:3000
pnpm test               # 26 engine unit tests (vitest)
pnpm build              # production build

# 2. Chrome extension (talks to the backend above)
cd extension
pnpm install
pnpm dev                # writes build/chrome-mv3-dev
# → chrome://extensions → Developer mode → Load unpacked → extension/build/chrome-mv3-dev
```

Quick things to try:
- **Simulator** (`/dashboard/simulator`) — paste calldata or click **Load drainer
  sample**; hit **AI Decode** for a Bedrock plain‑English breakdown.
- **Copilot** (`/dashboard/copilot`) — ask *"is this 0x095ea7b3… safe?"*
- **Threat Intelligence** (`/dashboard/threats`) — check a contract's reputation
  or report a scam.
- **Extension** — open a dApp, connect your wallet, and start a token approval —
  the overlay appears before your wallet does.

---

## Multi‑chain support

Decoding, signature analysis, risk scoring, phishing detection and transaction
interception are **chain‑agnostic** and work on any EVM chain. On‑chain reads
(wallet health, approvals, simulation, reputation) are **chain‑aware**: the
extension captures `eth_chainId`/`chainChanged`, the website tracks the connected
chain, and both pass `chainId` to the API. Supported: **Ethereum (1), Base (8453),
Arbitrum (42161), Optimism (10), Polygon (137), BNB Chain (56)**. The connected
chain is shown as a badge in both the popup and the dashboard topbar.

---

## AI backends

`lib/engine/bedrock.ts` is the primary AI engine. `lib/engine/copilot.ts` selects
a backend at runtime, in order:

1. **AWS Bedrock (Claude)** — when `BEDROCK_MODEL_ID` + AWS credentials are present.
2. **Anthropic API** — when `ANTHROPIC_API_KEY` is set.
3. **Deterministic fallback** — a rule‑based explainer grounded in the real engine
   output, so the app is fully usable with no AI keys.

The AWS SDKs are kept out of the bundle via `serverExternalPackages`, so the engine
drops into a Lambda unchanged. AI routes set `maxDuration = 60` for Vercel.

---

## Chrome extension

The extension (`extension/`, a separate Plasmo package) is the primary product.
The background service worker injects a MAIN‑world interceptor that wraps
`window.ethereum` and EIP‑6963 providers; the isolated content script renders the
warning overlay and talks to the backend; the popup gives Home / Wallet Health /
Approvals / Threat Feed / Copilot / Settings. It calls the **same backend API** as
the dashboard. Full details and load/build steps: [`extension/README.md`](extension/README.md).

---

## Testing

```bash
pnpm test        # 26 unit tests covering the engine
```

Covers the calldata decoder, risk scoring/calibration, domain/typosquat detection,
address‑poisoning & clipboard‑swap, simulation determinism, wallet‑health scoring,
signature decoding (Permit2/Seaport), and the deterministic copilot fallback.

---

## Deployment

Full guide in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md):

- **Web + API → Vercel** — import the repo, set the env vars in project settings,
  deploy. (`maxDuration` is set on the slow AI/Alchemy routes.)
- **Extension → users** — either the **Chrome Web Store**, or **load‑unpacked**:
  set `PLASMO_PUBLIC_API_URL`, run `pnpm package:extension` (zips into `public/`),
  and share the built‑in **`/install`** page so anyone can download + side‑load it.
```
