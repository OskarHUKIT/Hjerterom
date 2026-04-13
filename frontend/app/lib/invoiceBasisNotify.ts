import type { SupabaseClient } from '@supabase/supabase-js'

/** Ekstra varsel til utleier når bolig med betaling «konto» formidles. */
export async function notifyLandlordInvoiceBasisIfKonto(
  supabase: SupabaseClient,
  opts: { ownerId: string; listingId: string; address: string; paymentMethod?: string | null }
): Promise<void> {
  if (opts.paymentMethod !== 'konto' || !opts.ownerId) return
  await supabase.from('notifications').insert([
    {
      owner_id: opts.ownerId,
      type: 'FAKTURAGRUNNLAG_REQUEST',
      title: 'Fyll ut fakturagrunnlag',
      message: `Du valgte utbetaling til konto for boligen i ${opts.address}. Fyll ut fakturagrunnlaget i Boly slik at kommunen kan behandle utbetalingen. Bruk knappen under for å åpne skjemaet.`,
      listing_id: opts.listingId,
    },
  ])
}
