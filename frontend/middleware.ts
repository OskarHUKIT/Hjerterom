import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { fetchPlatformSettingsServer } from '@/lib/platformSettingsServer'
import { effectivePlatformFlags } from '@/lib/platformSettings'

/** Ruter som krever innlogget bruker (JWT i cookie, synk med createBrowserClient). */
const PROTECTED_PREFIXES = ['/homeowner', '/nav', '/documents', '/settings', '/ops'] as const

type KommuneRole = 'kommune_ansatt' | 'kommune_admin'
const KOMMUNE_ROLES: ReadonlySet<string> = new Set<KommuneRole>(['kommune_ansatt', 'kommune_admin'])
const EVENT_STAFF_ROLE = 'event_ansatt'

function isEventStaffPath(pathname: string): boolean {
  return pathname === '/nav/event' || pathname.startsWith('/nav/event/')
}

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

function isOpsPath(pathname: string): boolean {
  return pathname === '/ops' || pathname.startsWith('/ops/')
}

function resolveHjerterumShell(host: string): 'finn' | 'los' | 'ops' | 'app' | null {
  const h = host.split(':')[0]?.toLowerCase() ?? ''
  if (h.startsWith('finn.')) return 'finn'
  if (h.startsWith('los.')) return 'los'
  if (h.startsWith('ops.')) return 'ops'
  if (h.startsWith('app.')) return 'app'
  return null
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const shell = resolveHjerterumShell(host)
  const pathname = request.nextUrl.pathname

  const platformSettings = await fetchPlatformSettingsServer()
  const platform = effectivePlatformFlags(platformSettings)

  /** ops.hjerterum.no/ → /ops for operators */
  if (shell === 'ops' && (pathname === '/' || pathname === '')) {
    return NextResponse.redirect(new URL('/ops', request.url))
  }

  /** Block Hjerterum portals when disabled (Boly-only mode). */
  if (pathname.startsWith('/finn') && !platform.finn) {
    return NextResponse.redirect(new URL('/', request.url))
  }
  if (pathname.startsWith('/los') && !platform.los) {
    return NextResponse.redirect(new URL('/', request.url))
  }
  if (pathname.startsWith('/nav/event-inquiries') && !platform.centralEvents) {
    return NextResponse.redirect(new URL('/nav/database', request.url))
  }
  if (pathname.startsWith('/nav/los-inbox') && !platform.los) {
    return NextResponse.redirect(new URL('/nav/database', request.url))
  }
  if (isEventStaffPath(pathname) && !platform.centralEvents) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  /** Subdomain → /finn/* or /los/* rewrite (only when enabled) */
  if (shell === 'finn' && !pathname.startsWith('/finn')) {
    if (!platform.finn) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    const url = request.nextUrl.clone()
    url.pathname = pathname === '/' ? '/finn' : `/finn${pathname}`
    const rewrite = NextResponse.rewrite(url)
    rewrite.headers.set('x-hjerterum-shell', 'finn')
    return rewrite
  }

  if (shell === 'los' && !pathname.startsWith('/los')) {
    if (!platform.los) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    const url = request.nextUrl.clone()
    url.pathname = pathname === '/' ? '/los' : `/los${pathname}`
    const rewrite = NextResponse.rewrite(url)
    rewrite.headers.set('x-hjerterum-shell', 'los')
    return rewrite
  }

  let response = NextResponse.next({ request })
  if (shell) {
    response.headers.set('x-hjerterum-shell', shell)
  }

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
    const isEventStaff = role === EVENT_STAFF_ROLE
    const isHomeowner = role === 'homeowner'

    if (isEventStaff) {
      if (isHomeownerPath(pathname) || (isNavPath(pathname) && !isEventStaffPath(pathname))) {
        return NextResponse.redirect(new URL('/nav/event', request.url))
      }
    }

    if (isNavPath(pathname) && !isKommune && !isEventStaff) {
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

  if (user && isOpsPath(pathname)) {
    const { data: operatorRow } = await supabase
      .from('platform_operators')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (!operatorRow) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return response
}

export const config = {
  /**
   * Kjører på alle app-ruter (unntatt statiske assets) slik at subdomain-rewrite
   * for finn.* fungerer på `/`. Beskyttede prefikser får fortsatt auth-gates.
   */
  matcher: [
    '/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
