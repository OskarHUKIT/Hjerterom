import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Server-side Supabase reachability check (for deploy troubleshooting). */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, '')
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  if (!url || !anon) {
    return NextResponse.json(
      {
        ok: false,
        error: 'missing_env',
        message:
          'NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY are not set in this deployment (Vercel → Environment Variables → redeploy).',
        hasUrl: Boolean(url),
        hasAnonKey: Boolean(anon),
      },
      { status: 503 }
    )
  }

  let projectRef: string | null = null
  try {
    const host = new URL(url).hostname
    projectRef = host.split('.')[0] ?? null
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: 'invalid_url',
        message: 'NEXT_PUBLIC_SUPABASE_URL is not a valid URL.',
        urlPreview: url.slice(0, 40),
      },
      { status: 503 }
    )
  }

  if (url.includes('placeholder.supabase.co')) {
    return NextResponse.json(
      {
        ok: false,
        error: 'placeholder_url',
        message: 'Build is using placeholder Supabase URL — set real env vars and redeploy.',
      },
      { status: 503 }
    )
  }

  try {
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: anon },
      cache: 'no-store',
    })
    const body = await res.text()
    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      projectRef,
      supabaseOrigin: new URL(url).origin,
      authHealth: body.slice(0, 200),
      hint: res.ok
        ? 'Supabase is reachable from the server. If login still fails in the browser, check ad blockers and that anon key matches the same project.'
        : 'Supabase returned an error — verify anon key and that the project is not paused in Supabase Dashboard.',
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json(
      {
        ok: false,
        error: 'network',
        projectRef,
        supabaseOrigin: new URL(url).origin,
        message,
        hint: 'Project may be paused, URL wrong, or network blocked. Open Supabase Dashboard and confirm project is Active.',
      },
      { status: 503 }
    )
  }
}
