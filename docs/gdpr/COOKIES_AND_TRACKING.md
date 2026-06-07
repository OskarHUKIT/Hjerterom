# Cookies, local storage, and ePrivacy — Boly

**Last updated:** 2026-04-10

**Law:** Strictly necessary cookies do not require consent under typical ePrivacy practice; analytics/marketing do.

---

## 1. Cookie register (production — verify after upgrades)

| Name | Type | Purpose | Duration | Strictly necessary? | Provider |
|------|------|---------|----------|---------------------|----------|
| `sb-ayddwbmkclujefnhsaqv-auth-token` | HTTP cookie | Supabase auth session | Fixed expiry (e.g. ~1 year — **re-check in browser**) | Yes | Supabase SSR |

**Non-essential scripts:** None (per questionnaire) — **no consent banner** until analytics/ads are added.

**Local storage / IndexedDB:** Document if app stores locale or other prefs outside cookies.

---

## 2. If non-essential tools are added later

Consent **before** load; update personvern §7 and this table; version the policy.

---

## 3. Review

On each major **Next.js** / **@supabase/ssr** upgrade, re-export cookie names from DevTools (Application → Cookies).
