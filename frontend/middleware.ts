import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/** Ruter som krever innlogget bruker (JWT i cookie, synk med createBrowserClient). */
const PROTECTED_PREFIXES = ['/homeowner', '/nav', '/applications', '/documents'] as const

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
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

  return response
}

export const config = {
  matcher: [
    /*
     * Match alle forespørsler unntatt statiske filer og bilder.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
