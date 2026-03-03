'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { useRouter } from 'next/navigation'

// Fix for ikoner i Next.js
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})

interface MapViewProps {
  listings: any[]
}

export default function MapView({ listings }: MapViewProps) {
  const router = useRouter()
  const mapRef = useRef<L.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    // 1. Initialiser kartet
    const narvik: [number, number] = [68.4385, 17.4272]
    const map = L.map(containerRef.current).setView(narvik, 13)
    mapRef.current = map

    // 2. Legg til kartlag (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map)

    // 3. Legg til markører for alle boliger
    listings.forEach(l => {
      const lat = parseFloat(l.latitude)
      const lon = parseFloat(l.longitude)
      
      if (!isNaN(lat) && !isNaN(lon)) {
        const marker = L.marker([lat, lon], { icon }).addTo(map)
        
        // Lag popup-innhold manuelt for full kontroll
        const popupContent = document.createElement('div')
        popupContent.style.minWidth = '150px'
        popupContent.style.color = '#000'
        popupContent.innerHTML = `
          <h4 style="margin: 0 0 5px 0; font-family: inherit;">${l.address}</h4>
          <p style="margin: 0 0 10px 0; font-size: 0.85rem;">${l.price_daily},- / døgn</p>
          <button id="view-listing-${l.id}" style="
            width: 100%; padding: 8px; background: #3b82f6; color: white; 
            border: none; borderRadius: 4px; cursor: pointer; font-weight: bold;
          ">Se detaljer</button>
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

    // 4. CLEANUP - Dette er den viktigste delen!
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [listings, router])

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
