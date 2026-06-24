# SentinelAI Guardian

> **Stop Blind Signing. The AI Antivirus for Web3.**

A real-time Web3 security platform. The polished dashboard UI is now backed by a
genuine **Guardian Antivirus engine** — calldata decoding, risk scoring, threat
intelligence, phishing/typosquat detection, address-poisoning and clipboard-swap
detection, transaction simulation, and an AI Security Copilot.

Everything runs locally with **zero cloud keys**. Add an AWS Bedrock or Anthropic
key to upgrade the Copilot to a live model (see `.env.example`).

## Run

```bash
pnpm install
pnpm dev            # http://localhost:3000  (dashboard + API)
pnpm test           # 22 engine unit tests (vitest)
pnpm build          # production build

# Chrome extension (the primary product) — see extension/README.md
cd extension && pnpm install && pnpm dev
```

Open `/dashboard/simulator` and paste calldata (or click **Load drainer sample**)
to watch the engine decode and score it live. Open `/dashboard/copilot` and ask
*"is this 0x095ea7b3… safe?"* — the answer is grounded in real engine analysis.

## Architecture

```
UI (app/, components/sentinel/)
   │ fetch()  — typed client in lib/api.ts
   ▼
Next.js Route Handlers (app/api/*)
   ▼
Guardian Engine (lib/engine/*)
```

### Guardian engine modules (`lib/engine/`)

| File | Responsibility | Master-prompt module |
|------|----------------|----------------------|
| `calldata.ts` | Decode ERC-20/721/1155/Permit2 selectors, detect MAX_UINT unlimited approvals & `setApprovalForAll` | 5, 8 |
| `risk.ts` | Aggregate signals → 0–100 score + verdict | 3, 6 |
| `threat-intel.ts` | In-memory DB of drainer addresses, selectors, phishing domains + search/feed | 13, 15 |
| `domains.ts` | Phishing + typosquat detection (Levenshtein + homoglyph) | 7 |
| `address.ts` | Address-poisoning & clipboard-swap detection | 10, 11 |
| `simulate.ts` | Asset-delta / approval-scope simulation report | 4 |
| `wallet.ts` | Wallet health, exposure & risk scoring, approval scanner | 3, 12 |
| `copilot.ts` | AI explain — Bedrock/Anthropic if configured, deterministic fallback | 5, 14 |

### API routes (`app/api/`)

`POST /analyze` · `POST /simulate` · `POST /guardian-scan` · `POST /copilot` ·
`GET /wallet` · `GET /approvals` (+ `POST` revoke) · `GET /threats` (+ `?q=` search) ·
`GET /domains` · `GET /health`

### AI Copilot backends — AWS Bedrock first

`lib/engine/bedrock.ts` is the primary AI engine. `lib/engine/copilot.ts` selects
a backend at runtime:

1. **AWS Bedrock (Claude)** — used whenever `BEDROCK_MODEL_ID` + AWS credentials
   are present. This is the intended production path.
2. **Anthropic API** — when `ANTHROPIC_API_KEY` is set.
3. **Deterministic fallback** — rule-based explainer grounded in the real engine
   output, for local dev with no keys.

Every AI answer is grounded with live Guardian analysis of any calldata/domain in
the question. The active backend is surfaced in the dashboard Copilot and the
extension's Settings tab. To use AWS:

```bash
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

The AWS SDKs (`@aws-sdk/client-bedrock-runtime`, DynamoDB) are installed and kept
out of the bundle via `serverExternalPackages`, so the same engine drops into a
Lambda unchanged.

## Chrome extension (`extension/`)

The primary product — a Plasmo MV3 Web3 antivirus that intercepts transactions
before signing, scans sites in real time, and explains risk via the same backend.
See [`extension/README.md`](extension/README.md).

## Scope note

This implements the core, demoable, *real* heart of the master prompt: the
Guardian engine + API + a fully wired dashboard. The broader infra in the prompt
(Terraform, Cognito, Step Functions, the Plasmo Chrome extension) is intentionally
not stubbed — the AI backend is structured so the same engine drops into a Lambda
behind API Gateway unchanged.
