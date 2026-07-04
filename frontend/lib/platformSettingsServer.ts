import {
  BOLY_ONLY_SETTINGS,
  parsePlatformSettings,
  type PlatformSettings,
} from '@/lib/platformSettings'

type CacheEntry = { settings: PlatformSettings; at: number }

let cache: CacheEntry | null = null
const CACHE_TTL_MS = 30_000

/** Fetch platform settings for middleware / server (cached 30s). Falls back to Boly-only. */
export async function fetchPlatformSettingsServer(): Promise<PlatformSettings> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.settings
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url?.trim() || !key?.trim()) {
    return BOLY_ONLY_SETTINGS
  }

  try {
    const res = await fetch(`${url}/rest/v1/rpc/get_platform_settings`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    })
    if (!res.ok) return BOLY_ONLY_SETTINGS
    const data = await res.json()
    const settings = parsePlatformSettings(data)
    cache = { settings, at: Date.now() }
    return settings
  } catch {
    return BOLY_ONLY_SETTINGS
  }
}

/** Call after ops updates settings to bust edge cache in this instance. */
export function invalidatePlatformSettingsCache(): void {
  cache = null
}
