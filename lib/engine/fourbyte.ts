// 4byte directory lookup — resolves an unknown 4-byte function selector to its
// candidate human-readable signature(s) using the public, free 4byte.directory
// database. Used to give the AI decoder accurate ground truth.

const cache = new Map<string, string[]>()

export async function fourByteSignatures(selector: string): Promise<string[]> {
  const sel = selector.toLowerCase()
  if (!/^0x[0-9a-f]{8}$/.test(sel)) return []
  if (cache.has(sel)) return cache.get(sel)!
  try {
    const res = await fetch(`https://www.4byte.directory/api/v1/signatures/?hex_signature=${sel}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) {
      cache.set(sel, [])
      return []
    }
    const json = (await res.json()) as { results?: { id: number; text_signature: string }[] }
    // Earliest id first — the original/canonical registration, least likely to be a collision.
    const sigs = (json.results ?? [])
      .sort((a, b) => a.id - b.id)
      .map((r) => r.text_signature)
    cache.set(sel, sigs)
    return sigs
  } catch {
    return []
  }
}
