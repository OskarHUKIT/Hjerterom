'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { useRouter } from 'next/navigation'
import { useLanguage } from '../../context/LanguageContext'

/** Standard pin (blå/grønn) for tilgjengelige boliger – uten skygge for ryddig utseende. */
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})

/** Samme pin som tilgjengelig, men grå (for formidlede boliger). */
const formidletIcon = L.divIcon({
  className: 'leaflet-div-icon map-marker-pin',
  html: `<img src="https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png" alt="" style="width:25px;height:41px;filter:grayscale(1) brightness(0.55) contrast(1.15);display:block;" />`,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})

/** Samme anker som standardmarkør, rødtonet filter for utilgjengelige boliger. */
const utilgjengeligIcon = L.divIcon({
  className: 'leaflet-div-icon map-marker-pin',
  html: `<img src="https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png" alt="" style="width:25px;height:41px;display:block;filter:hue-rotate(-18deg) saturate(2.2) brightness(0.92);" />`,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})

function getStatusForToday(
  listingId: string,
  availMap: Record<string, any[]>
): 'Formidla' | 'Utilgjengelig' | 'Tilgjengelig' | null {
  const today = new Date().toISOString().slice(0, 10)
  const periods = (availMap[listingId] || []).filter(
    (p: any) => p.start_date <= today && p.end_date >= today
  )
  if (periods.length === 0) return null
  if (periods.some((p: any) => p.status === 'Formidla')) return 'Formidla'
  if (periods.some((p: any) => p.status === 'Utilgjengelig')) return 'Utilgjengelig'
  return 'Tilgjengelig'
}

interface MapViewProps {
  listings: any[]
  availability?: Record<string, any[]>
  /** Når satt: vis kun denne boligen (én markør) og zoom inn — f.eks. fra detaljside. */
  focusListingId?: string | null
}

export default function MapView({
  listings,
  availability = {},
  focusListingId = null,
}: MapViewProps) {
  const router = useRouter()
  const { t } = useLanguage()
  const mapRef = useRef<L.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const narvik: [number, number] = [68.4385, 17.4272]
    const map = L.map(containerRef.current).setView(narvik, 13)
    mapRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)

    const boundsPoints: L.LatLngTuple[] = []
    const focusId = focusListingId?.trim() || ''
    const sourceList =
      focusId.length > 0 ? listings.filter((l) => String(l.id) === focusId) : listings
    const markersById: Record<string, L.Marker> = {}
    sourceList.forEach((l) => {
      const lat = parseFloat(l.latitude)
      const lon = parseFloat(l.longitude)

      if (!isNaN(lat) && !isNaN(lon)) {
        boundsPoints.push([lat, lon])
        const statusToday = getStatusForToday(l.id, availability)
        const markerIcon =
          statusToday === 'Formidla'
            ? formidletIcon
            : statusToday === 'Utilgjengelig'
              ? utilgjengeligIcon
              : icon
        const marker = L.marker([lat, lon], { icon: markerIcon }).addTo(map)

        // DOM-API (textContent) — unngår XSS dersom adresse/pris noen gang skulle være upålitelig
        const popupContent = document.createElement('div')
        popupContent.style.minWidth = '150px'
        popupContent.style.color = '#0f172a'

        const title = document.createElement('h4')
        title.style.margin = '0 0 5px 0'
        title.style.fontFamily = 'inherit'
        title.style.color = '#0f172a'
        title.style.fontWeight = '700'
        title.textContent = l.address != null ? String(l.address) : ''

        const priceLine = document.createElement('p')
        priceLine.style.margin = '0 0 10px 0'
        priceLine.style.fontSize = '0.85rem'
        priceLine.style.color = '#334155'
        priceLine.textContent = `${l.price_daily},- / døgn`

        const btn = document.createElement('button')
        btn.id = `view-listing-${l.id}`
        btn.type = 'button'
        btn.style.width = '100%'
        btn.style.padding = '8px'
        btn.style.background = '#3b82f6'
        btn.style.color = 'white'
        btn.style.border = 'none'
        btn.style.borderRadius = '4px'
        btn.style.cursor = 'pointer'
        btn.style.fontWeight = 'bold'
        btn.textContent = t('seeDetails')

        popupContent.appendChild(title)
        popupContent.appendChild(priceLine)
        popupContent.appendChild(btn)

        marker.bindPopup(popupContent)
        markersById[String(l.id)] = marker

        // Håndter klikk på knappen i popupen
        marker.on('popupopen', () => {
          document.getElementById(`view-listing-${l.id}`)?.addEventListener('click', () => {
            router.push(`/listings/${l.id}`)
          })
        })
      }
    })

    if (focusId && markersById[focusId]) {
      markersById[focusId].openPopup()
    }

    if (boundsPoints.length === 1) {
      map.setView(boundsPoints[0], 14)
    } else if (boundsPoints.length > 1) {
      map.fitBounds(boundsPoints, { padding: [48, 48], maxZoom: 15 })
    } else {
      map.setView(narvik, 13)
    }

    // 4. CLEANUP - Dette er den viktigste delen!
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [listings, availability, router, t, focusListingId])

  return (
    <div
      ref={containerRef}
      className="map-view-container"
      style={{
        height: 'min(600px, 70vh)',
        width: '100%',
        minHeight: '300px',
        borderRadius: '16px',
        border: '1px solid var(--border-subtle)',
        background: '#f8fafc', // Vises mens kartet laster
        overflow: 'hidden',
        zIndex: 1,
      }}
    />
  )
}
