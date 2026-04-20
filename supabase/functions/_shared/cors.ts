/**
 * CORS for Edge Functions: reflect allowed browser origins only (no `*`).
 * Server-to-server calls (e.g. Supabase Database Webhooks) typically omit `Origin`;
 * those responses omit `Access-Control-Allow-Origin`, which is fine for non-browser clients.
 *
 * Allowlist = `allowedRedirectOrigins()` from safeRedirect (PUBLIC_SITE_URL,
 * PUBLIC_SITE_ORIGINS_EXTRA, default Vercel fallback) + optional
 * `EDGE_FUNCTION_ALLOWED_ORIGINS` (comma-separated URLs or origins) +
 * `NOTIFICATION_APP_BASE_URL` origin. Localhost is allowed via `isLocalOrigin`.
 */

import { edgeLog } from "./edgeLog.ts"
import { allowedRedirectOrigins, isLocalOrigin } from "./safeRedirect.ts"

function mergeExtraOriginsInto(s: Set<string>): void {
  const extra = Deno.env.get("EDGE_FUNCTION_ALLOWED_ORIGINS") || ""
  for (const part of extra.split(",")) {
    const t = part.trim()
    if (!t) continue
    try {
      s.add(new URL(t).origin)
    } catch {
      try {
        s.add(new URL(`https://${t}`).origin)
      } catch {
        /* ignore invalid entry */
      }
    }
  }
  const appBase = Deno.env.get("NOTIFICATION_APP_BASE_URL")?.trim()
  if (appBase) {
    try {
      s.add(new URL(appBase).origin)
    } catch {
      /* ignore */
    }
  }
}

export function allowedCorsOrigins(): Set<string> {
  const s = allowedRedirectOrigins()
  mergeExtraOriginsInto(s)
  return s
}

export function isCorsOriginAllowed(origin: string): boolean {
  const o = origin.trim()
  if (!o) return false
  if (isLocalOrigin(o)) return true
  return allowedCorsOrigins().has(o)
}

/** Base CORS headers; sets `Access-Control-Allow-Origin` only when `Origin` is present and allowed. */
export function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin")?.trim() || ""
  const h: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
    Vary: "Origin",
  }
  if (!origin) {
    return h
  }
  if (isCorsOriginAllowed(origin)) {
    h["Access-Control-Allow-Origin"] = origin
  } else {
    edgeLog("warn", "cors: origin not allowed", { origin })
  }
  return h
}

/** If `OPTIONS`, returns the preflight response (or 403 if Origin is not allowed). */
export function handleCorsOptions(req: Request): Response | null {
  if (req.method !== "OPTIONS") return null
  const origin = req.headers.get("Origin")?.trim() || ""
  if (origin && !isCorsOriginAllowed(origin)) {
    return new Response(JSON.stringify({ error: "Origin not allowed" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    })
  }
  return new Response("ok", { headers: buildCorsHeaders(req) })
}

/**
 * For browser-initiated POST/fetch with `Origin`: reject disallowed origins.
 * Returns null if OK or if `Origin` is absent (curl, webhooks).
 */
export function assertAllowedBrowserOrigin(req: Request): Response | null {
  const origin = req.headers.get("Origin")?.trim() || ""
  if (!origin) return null
  if (isCorsOriginAllowed(origin)) return null
  return new Response(JSON.stringify({ error: "Origin not allowed" }), {
    status: 403,
    headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
  })
}
