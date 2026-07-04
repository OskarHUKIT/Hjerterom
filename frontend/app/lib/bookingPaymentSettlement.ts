import { platformApplicationFeeCents } from './platformFee'

export type BookingPaymentProvider = 'stripe' | 'vipps'

/** Split guest payment into platform take and landlord payout (PRD §8.2). */
export function bookingPaymentSplit(amountCents: number) {
  const platformFeeCents = platformApplicationFeeCents(amountCents)
  const landlordPayoutCents = Math.max(0, amountCents - platformFeeCents)
  return { platformFeeCents, landlordPayoutCents }
}

export function bookingPaidUpdateFields(
  amountCents: number,
  provider: BookingPaymentProvider,
  existingPlatformFeeCents?: number | null
) {
  const { platformFeeCents, landlordPayoutCents } = bookingPaymentSplit(amountCents)
  return {
    status: 'paid' as const,
    payment_provider: provider,
    platform_fee_cents: existingPlatformFeeCents ?? platformFeeCents,
    landlord_payout_cents: landlordPayoutCents,
    updated_at: new Date().toISOString(),
  }
}
