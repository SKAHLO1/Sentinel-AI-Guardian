import { NextResponse } from "next/server"
import { aiBackend } from "@/lib/engine/copilot"
import { isOnchainConfigured } from "@/lib/engine/onchain"
import { isDbConfigured } from "@/lib/engine/db"

// GET /api/health — service + engine health (Module 21).
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "sentinelai-guardian",
    aiBackend: aiBackend(),
    onchain: isOnchainConfigured() ? "alchemy" : "not-configured",
    database: isDbConfigured() ? "dynamodb" : "not-configured",
    engines: ["calldata", "risk", "threat-intel", "threat-feed", "domains", "address", "simulate", "wallet", "onchain", "copilot", "db"],
    time: new Date().toISOString(),
  })
}
