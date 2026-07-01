/** All-in platform take on tourism bookings (PRD §8.2 — ~10% incl. payment costs). */
export const PLATFORM_FEE_RATE = 0.1

export function platformApplicationFeeCents(amountCents: number): number {
  if (!Number.isFinite(amountCents) || amountCents <= 0) return 0
  return Math.round(amountCents * PLATFORM_FEE_RATE)
}

export function formatNokFromCents(cents: number): string {
  return `${Math.round(cents / 100).toLocaleString('nb-NO')} kr`
}
