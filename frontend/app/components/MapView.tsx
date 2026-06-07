'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { useRouter } from 'next/navigation'
import { useLanguage } from '../../context/LanguageContext'
import { listingAvailabilityStatusToday } from '../lib/listingAvailabilityStatusToday'

/** Kartnål-farger samsvarer med status for dagens dato (lokal tid). */
function makePinDivIcon(fill: string, stroke: string): L.DivIcon {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="41" viewBox="0 0 28 41" aria-hidden="true"><path fill="${fill}" stroke="${stroke}" stroke-width="1" d="M14 41S1 24.5 1 12.5C1 6 6.5 1 14 1s13 5 13 11.5C27 24.5 14 41 14 41z"/><circle fill="white" cx="14" cy="13" r="5"/></svg>`
  const uri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  return L.divIcon({
    className: 'leaflet-div-icon map-marker-pin',
    html: `<img src="${uri}" alt="" width="28" height="41" style="display:block;" />`,
    iconSize: [28, 41],
    iconAnchor: [14, 41],
    popupAnchor: [0, -34],
  })
}

const pinTilgjengelig = makePinDivIcon('#14b8a6', '#0f766e')
const pinFormidlet = makePinDivIcon('#0ea5e9', '#0369a1')
const pinUtilgjengelig = makePinDivIcon('#ef4444', '#b91c1c')

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
        const statusToday = listingAvailabilityStatusToday(l.id, availability)
        const markerIcon =
          statusToday === 'Formidla'
            ? pinFormidlet
            : statusToday === 'Utilgjengelig'
              ? pinUtilgjengelig
              : pinTilgjengelig
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
