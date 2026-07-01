/**
 * Løse typer for listing-/nav-UI (Supabase-rader uten generert Database-typ).
 * Brukes for å erstatte `any` i store klientfiler.
 */

export type ListingAvailabilityRow = {
  id?: string
  listing_id?: string
  start_date: string
  end_date: string
  status?: string
} & Record<string, any>

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
  price_daily?: number | string
  bedrooms?: number | string
  size_sqm?: number | string
  max_occupants?: number | string
  floor_number?: string | number
  furnishing?: string
  accessibility?: string[]
  payment_method?: string | null
  pet_policy?: string
  pet_policy_detail?: string
  latitude?: number | null
  longitude?: number | null
  map_lat?: number | null
  map_lng?: number | null
  last_verified?: string | null
  deposit_guarantee?: unknown
  house_rules_pdf_path?: string | null
} & Record<string, any>

export type HandoverReportRow = {
  id: string
  approval_status?: string | null
  created_at?: string
} & Record<string, any>

export type NavNoteRow = {
  id?: string
  note_text?: string
  created_at?: string
} & Record<string, any>

export type MediationReservationRow = {
  reserved_by?: string
  reserved_by_name?: string
  expires_at?: string
  internal_note?: string
  status?: string
} & Record<string, any>

/** Rad valgt for «be om endring» i overtakelsesrapport. */
export type HandoverChangeRequestRow = (Record<string, unknown> & { id: string }) | null

/** Nav database: én rad i tabell/kart/tidslinje. */
export type NavDatabaseListingRow = ListingDetailsRecord & { id: string }
