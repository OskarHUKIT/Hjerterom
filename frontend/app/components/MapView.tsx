'use client'

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

/** Pin-form som standardmarkøren, i rødt for utilgjengelige boliger. */
const utilgjengeligIcon = L.divIcon({
  className: 'leaflet-div-icon map-marker-pin',
  html: `<div class="map-pin map-pin-red" style="
    width:26px;height:38px;background:#ef4444;border:2px solid #b91c1c;
    border-radius:50% 50% 50% 0;transform:rotate(-45deg);
    box-shadow:0 2px 6px rgba(0,0,0,0.25);
  "></div>`,
  iconSize: [26, 38],
  iconAnchor: [13, 38],
  popupAnchor: [1, -34],
})

function getStatusForToday(listingId: string, availMap: Record<string, any[]>): 'Formidla' | 'Utilgjengelig' | 'Tilgjengelig' | null {
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
}

export default function MapView({ listings, availability = {} }: MapViewProps) {
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
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map)

    const boundsPoints: L.LatLngTuple[] = []
    listings.forEach(l => {
      const lat = parseFloat(l.latitude)
      const lon = parseFloat(l.longitude)
      
      if (!isNaN(lat) && !isNaN(lon)) {
        boundsPoints.push([lat, lon])
        const statusToday = getStatusForToday(l.id, availability)
        const markerIcon = statusToday === 'Formidla' ? formidletIcon : statusToday === 'Utilgjengelig' ? utilgjengeligIcon : icon
        const marker = L.marker([lat, lon], { icon: markerIcon }).addTo(map)
        
        // Lag popup-innhold manuelt for full kontroll (mørk tekst for god kontrast på hvit bakgrunn)
        const popupContent = document.createElement('div')
        popupContent.style.minWidth = '150px'
        popupContent.style.color = '#0f172a'
        popupContent.innerHTML = `
          <h4 style="margin: 0 0 5px 0; font-family: inherit; color: #0f172a; font-weight: 700;">${l.address}</h4>
          <p style="margin: 0 0 10px 0; font-size: 0.85rem; color: #334155;">${l.price_daily},- / døgn</p>
          <button id="view-listing-${l.id}" style="
            width: 100%; padding: 8px; background: #3b82f6; color: white;
            border: none; border-radius: 4px; cursor: pointer; font-weight: bold;
          ">${t('seeDetails')}</button>
        `
        
        marker.bindPopup(popupContent)

        // Håndter klikk på knappen i popupen
        marker.on('popupopen', () => {
          document.getElementById(`view-listing-${l.id}`)?.addEventListener('click', () => {
            router.push(`/listings/${l.id}`)
          })
        })
      }
    })

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
  }, [listings, availability, router, t])

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
        zIndex: 1
      }} 
    />
  )
}
