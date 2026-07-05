import { normalizeListingImageUrls } from './listingDetailsUtils'

export type ListingImageEntry = {
  id: string
  url: string
  alt: string
}

export function normalizeListingImageAlts(raw: unknown, urlCount: number): string[] {
  if (!Array.isArray(raw)) return Array.from({ length: urlCount }, () => '')
  return Array.from({ length: urlCount }, (_, i) => {
    const v = raw[i]
    return typeof v === 'string' ? v : ''
  })
}

export function buildListingImageEntries(
  urlsRaw: unknown,
  altsRaw: unknown,
  fallbackAlt = ''
): ListingImageEntry[] {
  const urls = normalizeListingImageUrls(urlsRaw)
  const alts = normalizeListingImageAlts(altsRaw, urls.length)
  return urls.map((url, index) => ({
    id: `${index}-${url.slice(-24)}`,
    url,
    alt: alts[index]?.trim() || fallbackAlt,
  }))
}

export function entriesToPersistPayload(entries: ListingImageEntry[]): {
  image_urls: string[]
  image_alts: string[]
  image_url: string | null
} {
  const image_urls = entries.map((e) => e.url)
  const image_alts = entries.map((e) => e.alt.trim())
  return {
    image_urls,
    image_alts,
    image_url: image_urls[0] ?? null,
  }
}

const PUBLIC_MARKER = '/storage/v1/object/public/listings/'

/** Extract storage object path from a public listings bucket URL. */
export function listingImagePathFromPublicUrl(url: string): string | null {
  const trimmed = url.trim()
  const idx = trimmed.indexOf(PUBLIC_MARKER)
  if (idx === -1) return null
  return decodeURIComponent(trimmed.slice(idx + PUBLIC_MARKER.length))
}
