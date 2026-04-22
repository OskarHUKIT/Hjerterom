import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/** Ruter som krever innlogget bruker (JWT i cookie, synk med createBrowserClient). */
const PROTECTED_PREFIXES = ['/homeowner', '/nav', '/documents', '/settings'] as const

type KommuneRole = 'kommune_ansatt' | 'kommune_admin'
const KOMMUNE_ROLES: ReadonlySet<string> = new Set<KommuneRole>(['kommune_ansatt', 'kommune_admin'])

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

function isNavPath(pathname: string): boolean {
  return pathname === '/nav' || pathname.startsWith('/nav/')
}

/**
 * Utleier trenger meldinger/varsler under `/nav/*`, mens øvrige `/nav/*`-ruter er kommune-only.
 * (Header og mobilnav lenker hit; tidligere blokkerte middleware alle ikke-kommuner → «bare laster» / virkningsløs navigasjon.)
 */
function isLandlordNavMessagesOrNotifications(pathname: string): boolean {
  if (pathname === '/nav/messages' || pathname === '/nav/notifications') return true
  if (pathname.startsWith('/nav/messages/')) return true
  if (pathname.startsWith('/nav/notifications/')) return true
  return false
}

function isHomeownerPath(pathname: string): boolean {
  return pathname === '/homeowner' || pathname.startsWith('/homeowner/')
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url?.trim() || !key?.trim()) {
    return response
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  if (!user && isProtectedPath(pathname)) {
    const loginUrl = new URL('/login', request.url)
    const returnPath = `${pathname}${request.nextUrl.search}`
    loginUrl.searchParams.set('redirect', returnPath)
    return NextResponse.redirect(loginUrl)
  }

  /** Krever bekreftet e-post for beskyttede ruter (Supabase «Confirm email» + defense in depth). */
  const emailRegisteredButUnconfirmed =
    !!user?.email && user.email_confirmed_at == null
  if (user && emailRegisteredButUnconfirmed && isProtectedPath(pathname)) {
    await supabase.auth.signOut()
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('reason', 'email_not_confirmed')
    const returnPath = `${pathname}${request.nextUrl.search}`
    if (returnPath !== '/' && !returnPath.startsWith('/login')) {
      loginUrl.searchParams.set('redirect', returnPath)
    }
    const redirectResponse = NextResponse.redirect(loginUrl)
    response.cookies.getAll().forEach((c) => {
      redirectResponse.cookies.set(c.name, c.value)
    })
    return redirectResponse
  }

  /**
   * Server-side rollegate (defense-in-depth).
   *
   * Klient-komponenter gjør egne sjekker, men uten server-gate kan upriviligerte
   * brukere fortsatt laste `/nav/*`-markup (selv om RLS blokkerer data) — en
   * «UI-flash» som bryter med GDPR art. 25 («data protection by default»).
   *
   * Vi utfører én rolle-oppslag mot `profiles` når bruker er innlogget og ruten
   * er rolle-sensitiv. Samme kall koalerer InitPlan-cache med RLS-policies og
   * ligger på ~20 ms RTT fra `arn1` til Supabase `eu-central-1`.
   */
  if (user && (isNavPath(pathname) || isHomeownerPath(pathname))) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const role = profile?.role ?? null
    const isKommune = role != null && KOMMUNE_ROLES.has(role)
    const isHomeowner = role === 'homeowner'

    if (isNavPath(pathname) && !isKommune) {
      const landlordMayUseNavInbox =
        isHomeowner && isLandlordNavMessagesOrNotifications(pathname)
      if (!landlordMayUseNavInbox) {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }

    if (isHomeownerPath(pathname) && !isHomeowner) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return response
}

export const config = {
  /**
   * Middleware kjører kun på beskyttede prefikser — ikke på offentlige ruter
   * (`/`, `/login`, `/brukervilkar`, `/personvern`, `/om-boly`, `/listings/*`).
   * Unngår unødvendig Vercel→Supabase `getUser()`-rundtur på hver navigasjon,
   * som ellers koster transatlantisk RTT når Vercel-region ikke matcher EU-Supabase.
   * Cookie-/token-refresh på klientsiden håndteres fortsatt av `@supabase/ssr` (browser client).
   */
  matcher: [
    '/homeowner/:path*',
    '/nav/:path*',
    '/documents/:path*',
    '/settings/:path*',
  ],
}
