'use client'

import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import Link from 'next/link'
import 'leaflet/dist/leaflet.css'
import { formatFinnNightlyPrice } from '@/features/tourism/types/finn'
import { useLanguage } from '@/context/LanguageContext'

type Pin = {
  id: string
  address: string
  city: string
  map_lat: number
  map_lng: number
  tourism_nightly_price_cents: number | null
}

export default function FinnTourismMapInner({ pins }: { pins: Pin[] }) {
  const { t } = useLanguage()
  const centerLat = pins.reduce((s, p) => s + p.map_lat, 0) / pins.length
  const centerLng = pins.reduce((s, p) => s + p.map_lng, 0) / pins.length

  return (
    <MapContainer
      center={[centerLat, centerLng]}
      zoom={6}
      style={{ height: 320, width: '100%' }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {pins.map((p) => (
        <CircleMarker
          key={p.id}
          center={[p.map_lat, p.map_lng]}
          radius={8}
          pathOptions={{ color: '#0ea5e9', fillColor: '#38bdf8', fillOpacity: 0.85 }}
        >
          <Popup>
            <strong>{p.address}</strong>
            <br />
            {p.city}
            {p.tourism_nightly_price_cents ? (
              <>
                <br />
                {formatFinnNightlyPrice(p.tourism_nightly_price_cents)}
              </>
            ) : null}
            <br />
            <Link href={`/finn/listing/${p.id}`}>{t('finnMapViewListing')}</Link>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}
