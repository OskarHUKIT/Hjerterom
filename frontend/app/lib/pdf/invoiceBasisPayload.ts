import { formatDateNo, formatDateTimeNo } from '../dateFormat'
import type { InvoiceBasisPdfPayload } from './InvoiceBasisDocument'

export function buildInvoiceBasisPdfPayload(input: {
  address?: string | null
  postalCode?: string | null
  city?: string | null
  ownerName?: string | null
  agreementStart: string | null
  agreementEnd: string | null
  amountNok: number | null
  accountNumber?: string | null
  signatureConfirmedAt: string | null
}): InvoiceBasisPdfPayload {
  const addr = (input.address ?? '').trim()
  const pc = (input.postalCode ?? '').toString().trim()
  const city = (input.city ?? '').trim()
  const line2 = [pc, city].filter(Boolean).join(' ').trim()
  const listingAddressLine = [addr, line2].filter(Boolean).join('\n') || '—'

  let agreementPeriodLabel = '—'
  if (input.agreementStart && input.agreementEnd) {
    agreementPeriodLabel = `${formatDateNo(input.agreementStart)} – ${formatDateNo(input.agreementEnd)}`
  }

  let amountFormatted = '—'
  if (input.amountNok != null && Number.isFinite(input.amountNok)) {
    amountFormatted = new Intl.NumberFormat('nb-NO', {
      style: 'currency',
      currency: 'NOK',
      maximumFractionDigits: 0,
    }).format(input.amountNok)
  }

  const accountNumber = (input.accountNumber ?? '').trim() || '—'

  let stedDatoLine = ''
  let signaturLine = ''
  if (input.signatureConfirmedAt) {
    const when = formatDateTimeNo(input.signatureConfirmedAt)
    stedDatoLine = when || formatDateNo(input.signatureConfirmedAt)
    signaturLine = `Signert i Boly${when ? `, ${when}` : ''}`
  }

  return {
    listingAddressLine,
    ownerName: (input.ownerName ?? '').trim() || '—',
    agreementPeriodLabel,
    amountFormatted,
    accountNumber,
    stedDatoLine,
    signaturLine,
  }
}
