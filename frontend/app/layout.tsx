import type { Metadata, Viewport } from 'next'
import './globals.css'
import 'leaflet/dist/leaflet.css'
import Header from './components/Header'
import Footer from './components/Footer'
import PushSubscription from './components/PushSubscription'
import { Providers } from './providers'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#3b82f6',
  viewportFit: 'cover',
  userScalable: true,
  // Prevent unwanted zoom on input focus (iOS)
  interactiveWidget: 'resizes-content',
}

export const metadata: Metadata = {
  title: 'Bo.ly - Boligbanken',
  description: 'Bo.ly Housing Bank Application',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, title: 'boly' },
  icons: { apple: '/icon-512x512.png' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nb" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('boly-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);})();`,
          }}
        />
      </head>
      <body style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Providers>
          <PushSubscription />
          <Header />
          <div style={{ flex: 1 }}>
            {children}
          </div>
          <Footer />
        </Providers>
      </body>
    </html>
  )
}






