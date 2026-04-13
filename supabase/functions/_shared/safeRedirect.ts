/**
 * Validering av redirect-URLer for Edge Functions (BankID / Signicat callbacks).
 * Sett PUBLIC_SITE_URL (f.eks. https://app.example.no) i Supabase Secrets.
 * Valgfritt: PUBLIC_SITE_ORIGINS_EXTRA som kommaseparerte origins.
 */

const DEFAULT_PROD_FALLBACK = "https://boly.vercel.app"

export function isLocalOrigin(origin: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)
}

export function allowedRedirectOrigins(): Set<string> {
  const s = new Set<string>()
  const primary = Deno.env.get("PUBLIC_SITE_URL")?.replace(/\/$/, "").trim()
  if (primary) {
    try {
      s.add(new URL(primary).origin)
    } catch {
      /* ignore */
    }
  }
  for (const x of (Deno.env.get("PUBLIC_SITE_ORIGINS_EXTRA") || "").split(",")) {
    const t = x.trim()
    if (!t) continue
    try {
      s.add(new URL(t).origin)
    } catch {
      /* ignore */
    }
  }
  try {
    s.add(new URL(DEFAULT_PROD_FALLBACK).origin)
  } catch {
    /* ignore */
  }
  return s
}

/** Sjekk at hele href er http(s) og har tillatt origin. */
export function isAllowedAppUrl(href: string): boolean {
  try {
    const u = new URL(href)
    if (u.protocol !== "http:" && u.protocol !== "https:") return false
    if (isLocalOrigin(u.origin)) return true
    return allowedRedirectOrigins().has(u.origin)
  } catch {
    return false
  }
}

/**
 * Etter OAuth / Signicat: trygg base-URL for redirect til webapp.
 * `rawState` er typisk hele app-URL fra login (return_to / state).
 */
export function safeAppRedirectUrl(
  rawState: string | null | undefined,
  reqHostIsLocalhost: boolean,
): string {
  if (rawState) {
    let decoded = rawState
    try {
      decoded = decodeURIComponent(rawState)
    } catch {
      /* bruk som den er */
    }
    if (decoded.startsWith("http") && isAllowedAppUrl(decoded)) return decoded
  }
  if (reqHostIsLocalhost) return "http://localhost:3000"
  const primary = Deno.env.get("PUBLIC_SITE_URL")?.replace(/\/$/, "").trim()
  if (primary && isAllowedAppUrl(primary)) return primary
  return DEFAULT_PROD_FALLBACK
}

/**
 * Kun `window.location.origin` fra klient — brukes i sign-callback query.
 * Returnerer tom streng hvis ugyldig (callback faller tilbake til trygg default).
 */
export function sanitizeOriginQueryValue(raw: string | undefined | null): string {
  if (!raw?.trim()) return ""
  try {
    const u = new URL(raw.trim())
    if (u.pathname !== "/" || u.search || u.hash) {
      return ""
    }
    const o = u.origin
    if (isLocalOrigin(o) || allowedRedirectOrigins().has(o)) return o
  } catch {
    /* ignore */
  }
  return ""
}

/** Basis-URL for redirect etter signering (uten path). */
export function resolveBaseWebUrl(
  originParam: string | null,
  reqUrl: URL,
): string {
  const sanitized = originParam ? sanitizeOriginQueryValue(originParam) : ""
  if (sanitized) return sanitized
  if (reqUrl.host.includes("localhost")) return "http://localhost:3000"
  const primary = Deno.env.get("PUBLIC_SITE_URL")?.replace(/\/$/, "").trim()
  if (primary) {
    try {
      return new URL(primary).origin
    } catch {
      /* fallthrough */
    }
  }
  return DEFAULT_PROD_FALLBACK
}
