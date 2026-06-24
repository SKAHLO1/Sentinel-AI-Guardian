// AWS Bedrock client — the primary AI engine for SentinelAI Guardian (Module 5).
//
// All AI explanation/copilot calls go through AWS Bedrock (Claude) when AWS is
// configured. The deterministic engine remains only as a safety net for local
// development without credentials; in any AWS deployment Bedrock is the path.

import type { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime"

export interface BedrockConfig {
  region: string
  modelId: string
}

let cachedClient: BedrockRuntimeClient | null = null

/** True when AWS Bedrock is configured via environment. */
export function isBedrockConfigured(): boolean {
  return Boolean(
    process.env.BEDROCK_MODEL_ID &&
      (process.env.AWS_ACCESS_KEY_ID || process.env.AWS_PROFILE || process.env.AWS_ROLE_ARN),
  )
}

// Cross-region inference-profile prefix for a given AWS region. Newer Claude
// models (3.5 v2, 3.7, 4.x) can only be invoked on-demand via an inference
// profile, whose id is the model id prefixed with the geo (us. / eu. / apac.).
function profilePrefix(region: string): string {
  if (region.startsWith("eu-")) return "eu."
  if (region.startsWith("ap-")) return "apac."
  return "us."
}

export function bedrockConfig(): BedrockConfig {
  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1"
  let modelId = process.env.BEDROCK_MODEL_ID || "anthropic.claude-3-5-sonnet-20241022-v2:0"

  // If a bare `anthropic.claude-…` id was provided, auto-prefix the region's
  // inference profile so on-demand invocation works without manual fiddling.
  if (/^anthropic\.claude/i.test(modelId)) {
    modelId = profilePrefix(region) + modelId
  }

  return { region, modelId }
}

/** Lazily construct (and cache) the Bedrock runtime client. */
async function getClient(): Promise<BedrockRuntimeClient> {
  if (cachedClient) return cachedClient
  const { BedrockRuntimeClient } = await import("@aws-sdk/client-bedrock-runtime")
  cachedClient = new BedrockRuntimeClient({ region: bedrockConfig().region })
  return cachedClient
}

export interface BedrockMessage {
  role: "user" | "assistant"
  content: string
}

/**
 * Invoke Claude on Bedrock with the Anthropic Messages schema.
 * Throws on any failure so callers can fall back deterministically.
 */
export async function invokeBedrock(opts: {
  system: string
  messages: BedrockMessage[]
  maxTokens?: number
  temperature?: number
}): Promise<string> {
  const { InvokeModelCommand } = await import("@aws-sdk/client-bedrock-runtime")
  const client = await getClient()
  const { modelId } = bedrockConfig()

  const body = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: opts.maxTokens ?? 800,
    temperature: opts.temperature ?? 0.2,
    system: opts.system,
    messages: opts.messages.map((m) => ({ role: m.role, content: m.content })),
  }

  const command = new InvokeModelCommand({
    modelId,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(body),
  })

  const response = await client.send(command)
  const decoded = JSON.parse(new TextDecoder().decode(response.body)) as {
    content?: { type: string; text: string }[]
  }
  const text = (decoded.content ?? [])
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("")
  if (!text) throw new Error("Bedrock returned an empty response")
  return text
}
