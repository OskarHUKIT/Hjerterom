import { supabaseErrorMessage } from '@/app/lib/supabaseErrorMessage'

/** Verdier i `listings.deposit_guarantee` – må samsvare med registreringsskjema. */
export const DEPOSIT_GUARANTEE_VALUES = {
  nav: 'Godtar depositumsgaranti fra Nav',
  other: 'Godtar depositumsgaranti fra andre tilbydere',
  ordinary: 'Godtar ordinært depositum',
} as const

export function hasDepositGuarantee(arr: unknown, key: keyof typeof DEPOSIT_GUARANTEE_VALUES): boolean {
  return Array.isArray(arr) && arr.includes(DEPOSIT_GUARANTEE_VALUES[key])
}

/** image_urls kan komme som jsonb-array eller serialisert JSON-streng fra API. */
export function normalizeListingImageUrls(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
  }
  if (typeof raw === 'string' && raw.trim()) {
    const t = raw.trim()
    if (t.startsWith('[')) {
      try {
        const p = JSON.parse(t)
        if (Array.isArray(p))
          return p.filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
      } catch {
        /* enkelt URL-streng */
      }
    }
    return [t]
  }
  return []
}

export function listingHasFormidlaPeriod(avail: { status?: string }[] | null | undefined): boolean {
  return !!avail?.some((p) => p.status === 'Formidla')
}

export function listingDetailsErrMessage(err: unknown): string {
  return supabaseErrorMessage(err)
}
