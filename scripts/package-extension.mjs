// Builds the Chrome extension and copies the packaged .zip into public/ so it's
// downloadable from the /install page.
//
// Set extension/.env first:  PLASMO_PUBLIC_API_URL=https://<your-app>.vercel.app
// Then run:  pnpm package:extension

import { execSync } from "node:child_process"
import { copyFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"

const ext = resolve("extension")
console.log("→ Building extension…")
execSync("pnpm build", { cwd: ext, stdio: "inherit" })
console.log("→ Packaging…")
execSync("pnpm package", { cwd: ext, stdio: "inherit" })

const src = resolve(ext, "build/chrome-mv3-prod.zip")
if (!existsSync(src)) {
  console.error("✗ Expected zip not found at", src)
  process.exit(1)
}
const dest = resolve("public/sentinelai-guardian-extension.zip")
copyFileSync(src, dest)
console.log("✓ Extension zip ready for download at public/sentinelai-guardian-extension.zip")
console.log("  It will be served from /sentinelai-guardian-extension.zip (the /install page links to it).")
