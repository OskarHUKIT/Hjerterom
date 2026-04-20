/**
 * Nominatim (OpenStreetMap) geokoding for norske adresser.
 * Se https://operations.osmfoundation.org/policies/nominatim/ — bruk identifiserende User-Agent og ikke overbelast API-et.
 */

import { devWarn } from '@/app/lib/appLogger'

const USER_AGENT = 'Boly/1.0 (https://bolynorge.no; contact: support)'

export type GeocodeHit = {
  lat: number
  lon: number
  /** Kort visningstekst */
  displayLabel: string
  city: string
  postal_code: string
  raw: Record<string, unknown>
}

function extractFromNominatimAddress(addr: Record<string, unknown>) {
  const postcode = ((addr.postcode as string) || '').toString().replace(/\s/g, '').slice(0, 4)
  const rawCity =
    (addr.city as string) ||
    (addr.town as string) ||
    (addr.village as string) ||
    (addr.municipality as string) ||
    ''
  const city = (rawCity || '').trim()
  return { postcode, city }
}

export function nominatimResultToGeocodeHit(hit: Record<string, unknown>): GeocodeHit {
  const addr = (hit.address as Record<string, unknown>) || {}
  const { postcode, city } = extractFromNominatimAddress(addr)
  const parts = [
    (addr.road as string) && (addr.house_number as string)
      ? `${addr.road} ${addr.house_number}`
      : (addr.road as string) || (hit.name as string),
    postcode,
    city,
  ].filter(Boolean)
  const displayLabel = parts.length ? parts.join(' · ') : String(hit.display_name || 'Treff')
  return {
    lat: parseFloat(String(hit.lat)),
    lon: parseFloat(String(hit.lon)),
    displayLabel,
    city,
    postal_code: postcode,
    raw: hit,
  }
}

/** Velg beste treff når bruker har fylt inn postnummer/kommune (f.eks. etter manuell retting). */
export function pickBestNominatimHit(
  hits: Record<string, unknown>[],
  postalCode?: string,
  city?: string
): Record<string, unknown> | null {
  if (!hits.length) return null
  const pc = (postalCode || '').replace(/\s/g, '').slice(0, 4)
  const cityLower = (city || '').trim().toLowerCase()
  if (pc && /^\d{4}$/.test(pc)) {
    const byPc = hits.find((h) => {
      const a = (h.address as Record<string, unknown>) || {}
      const p = String(a.postcode || '')
        .replace(/\s/g, '')
        .slice(0, 4)
      return p === pc
    })
    if (byPc) return byPc
  }
  if (cityLower) {
    const byCity = hits.find((h) => {
      const a = (h.address as Record<string, unknown>) || {}
      const c = String(a.city || a.town || a.municipality || '')
        .trim()
        .toLowerCase()
      return c && (c === cityLower || c.includes(cityLower) || cityLower.includes(c))
    })
    if (byCity) return byCity
  }
  return hits[0]
}

export type SearchAddressInput = {
  address: string
  postal_code?: string
  city?: string
}

/**
 * Bygger søkestreng: postnr + kommune gir oftest entydig treff i Norge.
 */
export function buildNominatimQuery(input: SearchAddressInput): string {
  const addr = input.address?.trim() || ''
  const pc = (input.postal_code || '').replace(/\s/g, '').slice(0, 4)
  const city = (input.city || '').trim()
  if (addr.length < 2) return ''
  if (/^\d{4}$/.test(pc) && city) {
    return `${addr}, ${pc} ${city}, Norway`
  }
  if (/^\d{4}$/.test(pc)) {
    return `${addr}, ${pc}, Norway`
  }
  if (city) {
    return `${addr}, ${city}, Norway`
  }
  return `${addr}, Norway`
}

/**
 * Henter opptil `limit` treff i Norge (countrycodes=no).
 */
export async function searchNorwegianAddress(
  input: SearchAddressInput,
  limit = 10
): Promise<Record<string, unknown>[]> {
  const query = buildNominatimQuery(input)
  if (!query || query.length < 5) return []

  const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(query)}&limit=${limit}&countrycodes=no`
  const response = await fetch(url, {
    headers: {
      'Accept-Language': 'no,nb',
      'User-Agent': USER_AGENT,
    },
  })
  if (!response.ok) {
    devWarn('Nominatim error', response.status)
    return []
  }
  const data = await response.json()
  return Array.isArray(data) ? data : []
}

/**
 * Ett steg: søk og plukk beste treff (til boligdetaljer uten valgliste).
 */
export async function geocodeAddressBestEffort(
  input: SearchAddressInput
): Promise<GeocodeHit | null> {
  const hits = await searchNorwegianAddress(input, 10)
  if (!hits.length) {
    const fallback = await searchNorwegianAddress(
      { address: input.address, postal_code: undefined, city: undefined },
      5
    )
    const best = pickBestNominatimHit(fallback, input.postal_code, input.city)
    return best ? nominatimResultToGeocodeHit(best) : null
  }
  const best = pickBestNominatimHit(hits, input.postal_code, input.city)
  return best ? nominatimResultToGeocodeHit(best) : null
}
