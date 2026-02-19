import type { Metadata, Viewport } from 'next'
import './globals.css'
import 'leaflet/dist/leaflet.css'
import Header from './components/Header'
import Footer from './components/Footer'
import PushSubscription from './components/PushSubscription'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#3b82f6',
}

export const metadata: Metadata = {
  title: 'Bo.ly - Boligbanken',
  description: 'Bo.ly Housing Bank Application',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, title: 'Boligbanken' },
  icons: { apple: '/logo.png' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="no">
      <body style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <PushSubscription />
        <Header />
        <div style={{ flex: 1 }}>
          {children}
        </div>
        <Footer />
      </body>
    </html>
  )
}






