import type { Metadata, Viewport } from 'next'
import { DM_Sans, Fraunces } from 'next/font/google'
import './globals.css'
import SiteChrome from './components/SiteChrome'
import PushSubscription from './components/PushSubscription'
import PWAInstallPrompt from './components/PWAInstallPrompt'
import { Providers } from './providers'

const fontSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

const fontDisplay = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '600', '700'],
})

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
  title: 'Hjerterum',
  description:
    'Hjerterum – boligformidling, arrangement og turisme mellom kommune, utleiere og gjester i Nord-Norge',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, title: 'Hjerterum' },
  icons: {
    icon: [{ url: '/BolyMobilIcon.png', sizes: '1024x1024', type: 'image/png' }],
    apple: '/BolyMobilIcon.png',
  },
}

/** Raskere første kontakt med Auth/REST (TLS + DNS) – ingen endring i app-logikk. */
function supabaseOriginForHints(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  if (!raw) return null
  try {
    return new URL(raw).origin
  } catch {
    return null
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const supabaseOrigin = supabaseOriginForHints()

  return (
    <html
      lang="nb"
      suppressHydrationWarning
      className={`${fontSans.variable} ${fontDisplay.variable}`}
    >
      <head>
        {supabaseOrigin ? (
          <>
            <link rel="preconnect" href={supabaseOrigin} crossOrigin="anonymous" />
            <link rel="dns-prefetch" href={supabaseOrigin} />
          </>
        ) : null}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){document.documentElement.setAttribute('data-theme','dark');})();`,
          }}
        />
      </head>
      <body className="site-body">
        <Providers>
          <PushSubscription />
          <PWAInstallPrompt />
          <SiteChrome>{children}</SiteChrome>
        </Providers>
      </body>
    </html>
  )
}
