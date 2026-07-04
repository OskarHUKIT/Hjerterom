export type FinnListingCard = {
  id: string
  address: string
  city: string
  tourism_nightly_price_cents: number | null
  image_url: string | null
  type: string | null
  beds: number | null
}

export type FinnPublishedEvent = {
  id: string
  slug: string
  name: string
  description_public: string | null
  start_date: string
  end_date: string
  routing_mode: 'saksbehandler' | 'turisme'
  arrangement_tag: string | null
}

export type FinnSearchFilters = {
  city?: string
  checkIn?: string
  checkOut?: string
}

function formatPrice(cents: number | null): string | null {
  if (cents == null) return null
  return `${Math.round(cents / 100).toLocaleString('nb-NO')} kr`
}

export { formatPrice as formatFinnNightlyPrice }
