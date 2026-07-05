export type FinnListingDetail = {
  id: string
  address: string
  city: string
  description: string | null
  tourism_nightly_price_cents: number | null
  tourism_instant_book: boolean
  cancellation_policy: string | null
  image_url: string | null
  image_urls: unknown
  image_alts?: unknown
  type: string | null
  beds: number | null
  map_lat: number | null
  map_lng: number | null
}

export type FinnListingEventContext = {
  id: string
  slug: string
  name: string
  routing_mode: 'saksbehandler' | 'turisme'
}
