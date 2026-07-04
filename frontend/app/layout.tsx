import type { Metadata, Viewport } from 'next'
import { DM_Sans, Fraunces, Geist } from 'next/font/google'
import './globals.css'
import './styles/hjerterum-v2.css'
import SiteChrome from './components/SiteChrome'
import SkipLink from './components/design-system/SkipLink'
import PushSubscription from './components/PushSubscription'
import PWAInstallPrompt from './components/PWAInstallPrompt'
import { Providers } from './providers'
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

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
  themeColor: '#4a5fd4',
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
      className={cn(fontSans.variable, fontDisplay.variable, "font-sans", geist.variable)}
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
            __html: `(function(){try{var t=localStorage.getItem('boly-theme-guest');var k=Object.keys(localStorage);for(var i=0;i<k.length;i++){if(k[i].indexOf('boly-theme:')===0){var u=localStorage.getItem(k[i]);if(u==='light'||u==='dark'){t=u;break;}}}var legacy=localStorage.getItem('boly-theme');if(legacy==='light'||legacy==='dark')t=legacy;if(t!=='light'&&t!=='dark')t='dark';document.documentElement.setAttribute('data-theme',t);document.documentElement.style.colorScheme=t;}catch(e){document.documentElement.setAttribute('data-theme','dark');document.documentElement.style.colorScheme='dark';}})();`,
          }}
        />
      </head>
      <body className="site-body">
        <Providers>
          <SkipLink />
          <PushSubscription />
          <PWAInstallPrompt />
          <SiteChrome>{children}</SiteChrome>
        </Providers>
      </body>
    </html>
  )
}
