/**
 * URL-er som Next.js Image kan optimalisere (matcher remotePatterns i next.config.js).
 * Blob/data-URLer og andre hoster faller tilbake til vanlig <img>.
 */

function supabaseProjectHostname(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!raw?.trim()) return null
  try {
    return new URL(raw.trim()).hostname
  } catch {
    return null
  }
}

export function listingImageSupportsNextOptimization(src: string): boolean {
  const s = (src || '').trim()
  if (!s.startsWith('http')) return false
  if (s.startsWith('blob:') || s.startsWith('data:')) return false
  try {
    const u = new URL(s)
    if (!u.pathname.includes('/storage/v1/object/public/')) return false

    const projectHost = supabaseProjectHostname()
    if (projectHost && u.hostname === projectHost) return true

    if (u.protocol === 'https:' && u.hostname.endsWith('.supabase.co')) return true
    if (u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1')) {
      return true
    }
  } catch {
    return false
  }
  return false
}
