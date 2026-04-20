/**
 * Geokoding for norske adresser via Kartverkets offisielle adresse-API (Geonorge).
 *
 * Kilde: https://ws.geonorge.no/adresser/v1/sok
 * Doc:   https://kartverket.no/api-og-data/adresser (CC BY 4.0)
 *
 * Hvorfor ikke Nominatim (OpenStreetMap)?
 *   Den offentlige Nominatim-instansen har 1 req/sek/IP og krever egen
 *   User-Agent – men nettleseren kan ikke sette User-Agent via fetch. Derfor
 *   blir vi raskt 429'et; 429-siden returnerer ingen CORS-header og fetch
 *   kaster en generisk TypeError som brukeren ser som «Geokoding feilet».
 *
 * Geonorge er gratis, uten autentisering, dekker alle norske adresser og har
 * svært rause grenser for offentlig bruk. Koordinatene er i EPSG:4258
 * (ETRS89) – praktisk identisk med WGS84 for kart.
 */

import { devWarn } from '@/app/lib/appLogger'

export type GeocodeHit = {
  lat: number
  lon: number
  /** Kort visningstekst, f.eks. "Lavangsnesveien 10 · 9350 · Sjovegan" */
  displayLabel: string
  /** Bare gatedelen, f.eks. "Lavangsnesveien 10" – brukes som adressefelt i skjema */
  street: string
  city: string
  postal_code: string
  raw: Record<string, unknown>
}

export type SearchAddressInput = {
  address: string
  postal_code?: string
  city?: string
}

type GeonorgeAddress = {
  adressetekst?: string
  adressenavn?: string
  nummer?: number
  bokstav?: string
  postnummer?: string
  poststed?: string
  kommunenavn?: string
  representasjonspunkt?: { lat?: number; lon?: number; epsg?: string }
}

/** Kartverket returnerer stedsnavn i UPPERCASE; brukergrensesnittet ønsker Title Case. */
function toTitleCaseNo(input: string): string {
  if (!input) return ''
  const lower = input.toLowerCase()
  return lower.replace(/([\p{L}])([\p{L}']*)/gu, (_, first, rest) => first.toUpperCase() + rest)
}

function extractHit(hit: Record<string, unknown>) {
  const a = hit as GeonorgeAddress
  const postal = String(a.postnummer || '')
    .replace(/\s/g, '')
    .slice(0, 4)
  const city = toTitleCaseNo(a.poststed || a.kommunenavn || '').trim()
  const lat = Number(a.representasjonspunkt?.lat)
  const lon = Number(a.representasjonspunkt?.lon)
  const street =
    a.adressetekst ||
    (a.adressenavn
      ? `${a.adressenavn}${a.nummer != null ? ` ${a.nummer}` : ''}${a.bokstav || ''}`
      : '')
  return { postal, city, lat, lon, street }
}

/** Konverter ett råresultat fra Geonorge til vår interne GeocodeHit-type. */
export function rawResultToGeocodeHit(hit: Record<string, unknown>): GeocodeHit {
  const { postal, city, lat, lon, street } = extractHit(hit)
  const parts = [street, postal, city].filter(Boolean)
  const displayLabel = parts.length ? parts.join(' · ') : 'Treff'
  return {
    lat,
    lon,
    displayLabel,
    street,
    city,
    postal_code: postal,
    raw: hit,
  }
}

/**
 * Bakoverkompatibelt alias: tidligere var geokodingen basert på Nominatim, og
 * kallstedene importerer fortsatt `nominatimResultToGeocodeHit`.
 */
export const nominatimResultToGeocodeHit = rawResultToGeocodeHit

/** Velg beste treff når bruker har fylt inn postnummer/kommune. */
export function pickBestHit(
  hits: Record<string, unknown>[],
  postalCode?: string,
  city?: string
): Record<string, unknown> | null {
  if (!hits.length) return null
  const pc = (postalCode || '').replace(/\s/g, '').slice(0, 4)
  const cityLower = (city || '').trim().toLowerCase()

  if (pc && /^\d{4}$/.test(pc)) {
    const byPc = hits.find((h) => {
      const p = String((h as GeonorgeAddress).postnummer || '')
        .replace(/\s/g, '')
        .slice(0, 4)
      return p === pc
    })
    if (byPc) return byPc
  }

  if (cityLower) {
    const byCity = hits.find((h) => {
      const ps = String((h as GeonorgeAddress).poststed || '').toLowerCase()
      const kn = String((h as GeonorgeAddress).kommunenavn || '').toLowerCase()
      return (
        (!!ps && (ps === cityLower || ps.includes(cityLower) || cityLower.includes(ps))) ||
        (!!kn && (kn === cityLower || kn.includes(cityLower) || cityLower.includes(kn)))
      )
    })
    if (byCity) return byCity
  }

  return hits[0]
}

export const pickBestNominatimHit = pickBestHit

/** Bygger Geonorge-søkestreng. API-et håndterer både adresser, postnr og stedsnavn. */
export function buildGeonorgeQuery(input: SearchAddressInput): string {
  const addr = (input.address || '').trim()
  if (addr.length < 2) return ''
  const pc = (input.postal_code || '').replace(/\s/g, '').slice(0, 4)
  const city = (input.city || '').trim()
  if (/^\d{4}$/.test(pc) && city) return `${addr} ${pc} ${city}`
  if (/^\d{4}$/.test(pc)) return `${addr} ${pc}`
  if (city) return `${addr} ${city}`
  return addr
}

export const buildNominatimQuery = buildGeonorgeQuery

/**
 * Henter opptil `limit` adresser i Norge fra Geonorge. Kaster aldri – ved
 * nettverksfeil eller ikke-2xx returneres tom liste og det logges som warning.
 */
export async function searchNorwegianAddress(
  input: SearchAddressInput,
  limit = 10
): Promise<Record<string, unknown>[]> {
  const query = buildGeonorgeQuery(input)
  if (!query || query.length < 3) return []

  const params = new URLSearchParams({
    sok: query,
    treffPerSide: String(limit),
    utkoordsys: '4258',
    asciiKompatibel: 'true',
  })
  const url = `https://ws.geonorge.no/adresser/v1/sok?${params.toString()}`

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) {
      devWarn('Geonorge error', response.status)
      return []
    }
    const data = (await response.json()) as { adresser?: GeonorgeAddress[] }
    const adresser = Array.isArray(data.adresser) ? data.adresser : []
    return adresser as unknown as Record<string, unknown>[]
  } catch (err) {
    devWarn('Geonorge fetch failed', err)
    return []
  }
}

/**
 * Ett steg: søk og plukk beste treff (til boligdetaljer uten valgliste).
 */
export async function geocodeAddressBestEffort(
  input: SearchAddressInput
): Promise<GeocodeHit | null> {
  let hits = await searchNorwegianAddress(input, 10)
  if (!hits.length) {
    hits = await searchNorwegianAddress(
      { address: input.address, postal_code: undefined, city: undefined },
      5
    )
  }
  const best = pickBestHit(hits, input.postal_code, input.city)
  return best ? rawResultToGeocodeHit(best) : null
}
