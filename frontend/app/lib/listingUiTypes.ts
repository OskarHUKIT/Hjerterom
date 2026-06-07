/**
 * Løse typer for listing-/nav-UI (Supabase-rader uten generert Database-typ).
 * Brukes for å erstatte `any` i store klientfiler.
 */

export type ListingAvailabilityRow = {
  id?: string
  listing_id?: string
  start_date?: string
  end_date?: string
  status?: string
  [key: string]: unknown
}

/** Listing som hentes i detaljvisning / nav-database (felt brukt i UI + generiske oppdateringer). */
export type ListingDetailsRecord = {
  id?: string
  owner_id?: string
  image_urls?: unknown
  image_url?: string | null
  address?: string
  city?: string
  postal_code?: string
  status?: string
  type?: string
  is_available?: boolean
  price_daily?: number
  bedrooms?: number
  size_sqm?: number
  max_occupants?: number
  floor_number?: string | number
  furnishing?: string
  accessibility?: string[]
  payment_method?: string | null
  pet_policy?: string
  pet_policy_detail?: string
  latitude?: number | null
  longitude?: number | null
  last_verified?: string | null
  deposit_guarantee?: unknown
  [key: string]: unknown
}

export type HandoverReportRow = {
  id: string
  approval_status?: string | null
  created_at?: string
  [key: string]: unknown
}

export type NavNoteRow = Record<string, unknown> & {
  id?: string
  note_text?: string
  created_at?: string
}

export type MediationReservationRow = Record<string, unknown> & {
  reserved_by_name?: string
}

/** Rad valgt for «be om endring» i overtakelsesrapport. */
export type HandoverChangeRequestRow = (Record<string, unknown> & { id: string }) | null

/** Nav database: én rad i tabell/kart/tidslinje. */
export type NavDatabaseListingRow = ListingDetailsRecord & { id: string }
