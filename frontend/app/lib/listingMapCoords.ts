/** Normaliser kartkoordinater — DB bruker map_lat/map_lng; eldre UI skrev latitude/longitude. */
export function getListingMapCoords(listing: {
  map_lat?: number | string | null
  map_lng?: number | string | null
  latitude?: number | string | null
  longitude?: number | string | null
}): { lat: number; lng: number } | null {
  const rawLat = listing.map_lat ?? listing.latitude
  const rawLng = listing.map_lng ?? listing.longitude
  const lat = typeof rawLat === 'number' ? rawLat : parseFloat(String(rawLat ?? ''))
  const lng = typeof rawLng === 'number' ? rawLng : parseFloat(String(rawLng ?? ''))
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng }
}

export function listingMapCoordsPayload(lat: number, lng: number) {
  return { map_lat: lat, map_lng: lng, latitude: lat, longitude: lng }
}
