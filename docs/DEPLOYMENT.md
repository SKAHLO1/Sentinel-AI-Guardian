# Deployment Guide

Two pieces ship separately:
- **Web app + API** → Vercel
- **Chrome extension** → Chrome Web Store (it talks to the Vercel API)

Deploy the web app **first** — you need its URL to configure the extension.

---

## 1. Web app + API → Vercel

### 1a. Put the code in a Git repo
```bash
git init
git add .
git commit -m "SentinelAI Guardian"
# create an empty repo on GitHub, then:
git remote add origin https://github.com/<you>/sentinel-ai.git
git push -u origin main
```
`.env.local` is gitignored — your keys are NOT pushed. Good.

### 1b. Import into Vercel
1. Go to [vercel.com](https://vercel.com) → **Add New… → Project** → import your repo.
2. Framework preset: **Next.js** (auto-detected). Leave build/install commands default (Vercel detects pnpm).
3. **Before deploying**, open **Environment Variables** and add the same values from `.env.local`:

| Name | Value |
|------|-------|
| `BEDROCK_MODEL_ID` | `us.anthropic.claude-sonnet-4-5-20250929-v1:0` |
| `AWS_REGION` | `us-east-1` |
| `AWS_ACCESS_KEY_ID` | your key |
| `AWS_SECRET_ACCESS_KEY` | your secret |
| `ALCHEMY_API_KEY` | your key |
| `ALCHEMY_NETWORK` | `eth-mainnet` |
| `DYNAMODB_TABLE` | `SentinelAIGuardian` |

4. **Deploy.** You'll get a URL like `https://sentinel-ai-xxxx.vercel.app`.

### 1c. Verify
- Open `https://<your-app>.vercel.app/api/health` → should show `"aiBackend":"bedrock"`, `"onchain":"alchemy"`, `"database":"dynamodb"`.
- Open the site, connect your wallet, run a simulation.

> Function timeouts: the AI/Alchemy routes already set `export const maxDuration = 60`, so Bedrock/Alchemy calls won't be cut off. On the Hobby plan 60s is allowed; Pro allows more.

---

## 2. Point the extension at production

In `extension/.env` (create it):
```
PLASMO_PUBLIC_API_URL=https://<your-app>.vercel.app
```
Then build the production bundle + zip:
```bash
cd extension
pnpm build      # outputs build/chrome-mv3-prod
pnpm package    # outputs build/chrome-mv3-prod.zip  ← upload this
```
The extension already has `https://*/*` host permission, so it can call your Vercel API with no CORS setup.

---

## 2b. Distribute WITHOUT the Web Store (load unpacked) — fastest for testers

You don't need the Web Store to let people try it. Ship a downloadable zip + the
built-in `/install` page.

1. Point the extension at production (`extension/.env` → `PLASMO_PUBLIC_API_URL=https://<your-app>.vercel.app`).
2. From the repo root:
   ```bash
   pnpm package:extension
   ```
   This builds + packages the extension and copies the zip to
   `public/sentinelai-guardian-extension.zip`.
3. Commit/redeploy the web app. Now anyone can:
   - Visit `https://<your-app>.vercel.app/install`
   - Click **Download Extension**, unzip, and load it via `chrome://extensions`
     → Developer mode → **Load unpacked** → select the unzipped folder.

The `/install` page already has the full step-by-step. Share that link.

> Note: Chrome blocks installing a packed `.crx` from outside the Web Store, so
> "load unpacked" (a folder) is the correct way to side-load for testing. It works
> on Chrome, Brave, and Edge.

## 3. Chrome extension → Chrome Web Store (public, searchable)

### 3a. One-time setup
1. Register a Chrome Web Store developer account: [chrome.google.com/webstore/devconsole](https://chrome.google.com/webstore/devconsole) — **$5 one-time fee**.
2. Write a **privacy policy** and host it (a public URL). Required, because the extension reads the active site/transaction data and sends it to your API. State plainly: what's collected (domains, calldata, connected address), why (security analysis), where it goes (your backend / AWS Bedrock), and that it's not sold.

### 3b. Create the listing
1. Dev console → **Add new item** → upload `build/chrome-mv3-prod.zip`.
2. **Store listing** fields:
   - Name: SentinelAI Guardian
   - Summary + description (use the tagline: "Stop Blind Signing. The AI Antivirus for Web3.")
   - Category: Productivity (or Developer Tools)
   - Icon: 128×128 (already in the build)
   - At least **1 screenshot** (1280×800 or 640×400) — screenshot the overlay + popup.
3. **Privacy practices**: declare the data use and paste your privacy-policy URL.
4. **Permission justifications** — review is strict about these; explain each honestly:
   - `scripting` + host access — "inject the transaction interceptor into dApp pages to decode and risk-score transactions before signing."
   - `tabs` — "scan the active site's domain for phishing."
   - `clipboardRead` — "detect clipboard-swap / address-poisoning attacks."
   - `storage`, `alarms`, `notifications` — settings, periodic scans, threat alerts.
5. Submit. **Review typically takes a few days to ~2 weeks**, especially with broad host permissions.

### 3c. Tip to ease review
For the public build you can drop `http://*/*` from `host_permissions` in `extension/package.json` (it's mainly for localhost dev) and keep only `https://*/*`. Broad permissions are allowed for a security tool but must be justified.

---

## 4. Rate limiting (already built in)
Per-IP limits protect your Bedrock/Alchemy spend (`/api/decode` & `/api/copilot`
20/min, `/api/wallet` & `/api/approvals` 30/min, scan routes 120/min). They work
out of the box using in-memory counters.

For accurate limits **across Vercel's many serverless instances**, add a free
[Upstash Redis](https://upstash.com) database and set two env vars in Vercel:
```
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```
The limiter auto-detects them and switches to distributed mode; without them it
falls back to in-memory.

## 5. After launch
- Updating the API URL means rebuilding + re-distributing the extension (the URL is baked at build time) — re-run `pnpm package:extension` and redeploy.
- Rotate any AWS/Alchemy key that was ever committed or shared.
