// DynamoDB persistence (Module 13 — Threat Intelligence storage).
//
// Single-table design keyed by wallet address so a user's scan history and
// detected threats can be recalled. The DynamoDB client is loaded lazily and
// the whole layer is optional — when DYNAMODB_TABLE isn't set, every call is a
// safe no-op so the app still runs locally.
//
//   pk = WALLET#<address>
//   sk = <ISO timestamp>#<id>   (sorts newest-last; we query Descending)

import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb"

export interface ScanEvent {
  id: string
  entity: "scan" | "threat"
  kind: "transaction" | "domain" | "guardian"
  riskScore: number
  verdict: "safe" | "warning" | "danger"
  label?: string
  domain?: string
  to?: string
  summary?: string
  signals?: { severity: string; message: string }[]
  createdAt: string
}

/** Build a storable event from a Guardian analysis result. */
export function toScanEvent(
  kind: ScanEvent["kind"],
  data: {
    riskScore: number
    verdict: "safe" | "warning" | "danger"
    label?: string
    domain?: string
    to?: string
    summary?: string
    signals?: { severity: string; message: string }[]
  },
): ScanEvent {
  return {
    id: Math.random().toString(36).slice(2, 10),
    // A "threat" is anything not clearly safe; everything is also a "scan".
    entity: data.verdict === "safe" ? "scan" : "threat",
    kind,
    riskScore: data.riskScore,
    verdict: data.verdict,
    label: data.label,
    domain: data.domain,
    to: data.to,
    summary: data.summary,
    signals: data.signals?.slice(0, 5),
    createdAt: new Date().toISOString(),
  }
}

function hasAwsCreds(): boolean {
  return Boolean(
    process.env.AWS_ACCESS_KEY_ID || process.env.AWS_PROFILE || process.env.AWS_ROLE_ARN,
  )
}

export function isDbConfigured(): boolean {
  return Boolean(process.env.DYNAMODB_TABLE && hasAwsCreds())
}

function tableName(): string {
  return process.env.DYNAMODB_TABLE as string
}

let docClient: DynamoDBDocumentClient | null = null
async function getDoc(): Promise<DynamoDBDocumentClient> {
  if (docClient) return docClient
  const { DynamoDBClient } = await import("@aws-sdk/client-dynamodb")
  const { DynamoDBDocumentClient } = await import("@aws-sdk/lib-dynamodb")
  const base = new DynamoDBClient({
    region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1",
  })
  docClient = DynamoDBDocumentClient.from(base, {
    marshallOptions: { removeUndefinedValues: true },
  })
  return docClient
}

function pk(address: string): string {
  return `WALLET#${address.toLowerCase()}`
}

/** Persist a scan/threat event for a wallet. No-op when DB isn't configured. */
export async function putScanEvent(address: string, event: ScanEvent): Promise<void> {
  if (!isDbConfigured() || !address) return
  const { PutCommand } = await import("@aws-sdk/lib-dynamodb")
  const doc = await getDoc()
  // 90-day TTL so the table self-prunes.
  const ttl = Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60
  await doc.send(
    new PutCommand({
      TableName: tableName(),
      Item: {
        pk: pk(address),
        sk: `${event.createdAt}#${event.id}`,
        ...event,
        ttl,
      },
    }),
  )
}

/** Recall a wallet's recent scan history, newest first. */
export async function queryScanEvents(
  address: string,
  opts: { entity?: "scan" | "threat"; limit?: number } = {},
): Promise<ScanEvent[]> {
  if (!isDbConfigured() || !address) return []
  const { QueryCommand } = await import("@aws-sdk/lib-dynamodb")
  const doc = await getDoc()
  const res = await doc.send(
    new QueryCommand({
      TableName: tableName(),
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: { ":pk": pk(address) },
      ScanIndexForward: false, // newest first
      Limit: opts.limit ?? 25,
      ...(opts.entity
        ? { FilterExpression: "entity = :e", ExpressionAttributeValues: { ":pk": pk(address), ":e": opts.entity } }
        : {}),
    }),
  )
  return (res.Items ?? []) as ScanEvent[]
}

export interface UserSettings {
  toggles?: Record<string, boolean>
  profile?: { email?: string; name?: string }
}

/** Load a wallet's settings (stored in its own partition, separate from history). */
export async function getSettings(address: string): Promise<UserSettings | null> {
  if (!isDbConfigured() || !address) return null
  const { GetCommand } = await import("@aws-sdk/lib-dynamodb")
  const doc = await getDoc()
  const res = await doc.send(
    new GetCommand({ TableName: tableName(), Key: { pk: `SETTINGS#${address.toLowerCase()}`, sk: "v1" } }),
  )
  return (res.Item?.settings as UserSettings) ?? null
}

/** Persist a wallet's settings. */
export async function putSettings(address: string, settings: UserSettings): Promise<void> {
  if (!isDbConfigured() || !address) return
  const { PutCommand } = await import("@aws-sdk/lib-dynamodb")
  const doc = await getDoc()
  await doc.send(
    new PutCommand({
      TableName: tableName(),
      Item: { pk: `SETTINGS#${address.toLowerCase()}`, sk: "v1", settings, updatedAt: new Date().toISOString() },
    }),
  )
}

export interface ThreatReport {
  type: "domain" | "address"
  value: string
  reason?: string
  count: number
  lastReportedAt: string
}

/** Record a user threat report, aggregating repeats by (type,value). */
export async function putReport(r: { type: "domain" | "address"; value: string; reason?: string }): Promise<void> {
  if (!isDbConfigured()) return
  const { UpdateCommand } = await import("@aws-sdk/lib-dynamodb")
  const doc = await getDoc()
  const value = r.value.trim().toLowerCase()
  await doc.send(
    new UpdateCommand({
      TableName: tableName(),
      Key: { pk: "REPORT", sk: `${r.type}#${value}` },
      UpdateExpression: "SET #t = :t, #v = :v, #r = :reason, #l = :now ADD #c :one",
      ExpressionAttributeNames: { "#t": "type", "#v": "value", "#r": "reason", "#l": "lastReportedAt", "#c": "count" },
      ExpressionAttributeValues: { ":t": r.type, ":v": value, ":reason": r.reason ?? "", ":now": new Date().toISOString(), ":one": 1 },
    }),
  )
}

/** Recent community threat reports, newest first. */
export async function getReports(limit = 50): Promise<ThreatReport[]> {
  if (!isDbConfigured()) return []
  const { QueryCommand } = await import("@aws-sdk/lib-dynamodb")
  const doc = await getDoc()
  const res = await doc.send(
    new QueryCommand({
      TableName: tableName(),
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: { ":pk": "REPORT" },
      Limit: limit,
    }),
  )
  return ((res.Items ?? []) as any[])
    .map((i) => ({ type: i.type, value: i.value, reason: i.reason, count: i.count ?? 1, lastReportedAt: i.lastReportedAt }))
    .sort((a, b) => (b.lastReportedAt || "").localeCompare(a.lastReportedAt || ""))
}

/** Delete a wallet's stored history (used by the "clear" action). */
export async function clearScanEvents(address: string): Promise<number> {
  if (!isDbConfigured() || !address) return 0
  const { QueryCommand, BatchWriteCommand } = await import("@aws-sdk/lib-dynamodb")
  const doc = await getDoc()
  const res = await doc.send(
    new QueryCommand({
      TableName: tableName(),
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: { ":pk": pk(address) },
      ProjectionExpression: "pk, sk",
    }),
  )
  const items = res.Items ?? []
  for (let i = 0; i < items.length; i += 25) {
    const chunk = items.slice(i, i + 25)
    await doc.send(
      new BatchWriteCommand({
        RequestItems: { [tableName()]: chunk.map((it) => ({ DeleteRequest: { Key: { pk: it.pk, sk: it.sk } } })) },
      }),
    )
  }
  return items.length
}
