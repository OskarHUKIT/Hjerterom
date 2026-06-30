/**
 * In-memory sliding-window rate limiter for Route Handlers (per IP).
 * For production at scale, use Redis / Vercel KV instead.
 */

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number }

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now()
  const existing = buckets.get(key)
  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true }
  }
  if (existing.count >= limit) {
    return { ok: false, retryAfterSec: Math.ceil((existing.resetAt - now) / 1000) }
  }
  existing.count += 1
  return { ok: true }
}

export function clientIpFromRequest(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown'
  return req.headers.get('x-real-ip') ?? 'unknown'
}
