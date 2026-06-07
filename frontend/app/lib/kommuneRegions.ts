/**
 * Parser kommune_region uansett format: JSON-array, kommaseparert streng, eller array.
 * Returnerer normaliserte små bokstaver per område.
 */

/**
 * Normaliser sted/kommune — mirrors public.normalize_region_key() in Postgres.
 */
export function normalizeMunicipalityLabel(s: string): string {
  let t = s.trim().toLowerCase()
  if (!t) return ''
  t = t
    .replace(/æ/g, 'a')
    .replace(/ø/g, 'o')
    .replace(/å/g, 'a')
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
  t = t.replace(/\s+kommune\s*$/i, '').trim()
  t = t.replace(/\s+/g, ' ').trim()
  return t
}

/**
 * True hvis boligens city (f.eks. «Narvik kommune» eller «Gratangen, Troms») svarer til minst ett av brukerens områder.
 */
export function listingCityMatchesRegions(
  city: string | null | undefined,
  regionsLower: string[]
): boolean {
  if (!city?.trim() || regionsLower.length === 0) return false
  const parts = city
    .split(/[,;]/)
    .map((s) => normalizeMunicipalityLabel(s))
    .filter(Boolean)
  const candidates = parts.length > 0 ? parts : [normalizeMunicipalityLabel(city)]
  for (const norm of candidates) {
    if (!norm) continue
    for (const r of regionsLower) {
      if (norm === r) return true
      if (norm.startsWith(r + ' ')) return true
      if (norm.startsWith(r + '-')) return true
    }
  }
  return false
}

/** Slår sammen flere kilder (profil, hviteliste, RPC) til unike normaliserte områder – samme idé som `current_user_kommune_regions` i DB. */
export function mergeKommuneRegionSources(
  ...vals: (string | string[] | null | undefined)[]
): string[] {
  const set = new Set<string>()
  for (const v of vals) {
    for (const r of parseKommuneRegions(v)) {
      set.add(r)
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'nb'))
}

export function parseKommuneRegions(val: string | string[] | null | undefined): string[] {
  if (val == null) return []
  if (Array.isArray(val)) return val.map((r) => String(r).trim().toLowerCase()).filter(Boolean)
  let s = String(val).trim()
  if (!s) return []
  s = s.replace(/^["\\]+|["\\]+$/g, '').trim()
  if (s.startsWith('[')) {
    try {
      const arr = JSON.parse(s) as unknown
      return Array.isArray(arr)
        ? arr.map((r: unknown) => String(r).trim().toLowerCase()).filter(Boolean)
        : []
    } catch {
      return []
    }
  }
  const regionStr = s.replace(/\s+og\s+/gi, ',').replace(/[,;\n]+/g, ',')
  return regionStr
    .split(',')
    .map((r: string) =>
      r
        .replace(/^["'\s\\]+|["'\s\\]+$/g, '')
        .trim()
        .toLowerCase()
    )
    .filter(Boolean)
}

/** Lesbar visning: «Narvik, Gratangen, Evenes» uansett om verdien er JSON-array, kommaseparert streng eller array. */
export function formatKommuneRegionsForDisplay(val: string | string[] | null | undefined): string {
  const parts = parseKommuneRegions(val)
  if (parts.length === 0) return ''
  return parts
    .map((r) =>
      r
        .split(/[\s-]+/)
        .map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1) : ''))
        .filter(Boolean)
        .join(' ')
    )
    .join(', ')
}

/**
 * Lagrer kommune_region for terms_documents: ett område som ren streng (matcher eldre rader),
 * flere som sortert JSON-array (samme logikk som DB-RPC).
 */
export function kommuneRegionForTermsDocument(regions: string[]): string | null {
  const u = [...new Set(regions.map((r) => r.trim().toLowerCase()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'nb')
  )
  if (u.length === 0) return null
  if (u.length === 1) return u[0]
  return JSON.stringify(u)
}

/** Rader i terms_documents: én tekst kan liste flere kommuner (kommaseparert). */
export function parseTermsRegionField(region: string | null | undefined): string[] {
  if (region == null || !String(region).trim()) return []
  return parseKommuneRegions(String(region).trim())
}

/** True hvis dokumentets område overlapper minst ett av brukerens områder. Tom brukerliste → ikke regionalt dokument. */
export function termsRegionVisibleToUser(
  docRegionsLower: string[],
  userRegionsLower: string[]
): boolean {
  if (docRegionsLower.length === 0) return false
  if (userRegionsLower.length === 0) return false
  const set = new Set(userRegionsLower)
  return docRegionsLower.some((r) => set.has(r))
}

/** True hvis to normaliserte regionlister deler minst ett område (f.eks. saksbehandler ↔ saksbehandler). */
export function regionsOverlap(a: string[], b: string[]): boolean {
  if (!a.length || !b.length) return false
  const set = new Set(a)
  return b.some((r) => set.has(r))
}
