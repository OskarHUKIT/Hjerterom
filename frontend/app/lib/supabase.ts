import { createClient } from '@supabase/supabase-js'
import type { Session, User } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

/** Uten URL/nøkkel henger ofte getSession/getUser — da blir hele appen «Laster…». */
export const isSupabaseConfigured = Boolean(supabaseUrl.trim() && supabaseKey.trim())

if (process.env.NODE_ENV === 'development' && !isSupabaseConfigured) {
  console.warn(
    '[Boly] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY — data will not load. Add them to frontend/.env.local'
  )
}

/**
 * Cookie-basert klient via @supabase/ssr — samme økt som Next middleware leser,
 * slik at server-side rutebeskyttelse og token-refresh fungerer.
 */
const client = isSupabaseConfigured
  ? createBrowserClient(supabaseUrl, supabaseKey, { isSingleton: true })
  : createClient(supabaseUrl, supabaseKey)

/** Sjekker om feilen er ugyldig/utløpt refresh token – da skal vi logge ut og sende bruker til forsiden. */
function isInvalidRefreshTokenError(err: unknown): boolean {
  const msg =
    err && typeof err === 'object' && 'message' in err
      ? String((err as { message?: string }).message)
      : ''
  return /refresh token not found|invalid refresh token|refresh_token/i.test(msg)
}

/** Ved ugyldig refresh token: sign out lokalt og redirect til forsiden (unngår AuthApiError i konsollen ved neste kall). */
async function handleInvalidRefreshToken(): Promise<void> {
  await client.auth.signOut({ scope: 'local' })
  if (typeof window !== 'undefined' && !/^\/(login)?(\?|#|$)/.test(window.location.pathname)) {
    window.location.href = '/'
  }
}

/** Uten timeout kan getSession/getUser henge — men trege refresh-kall (mobilnett) trenger ofte >20 s. */
const AUTH_OPERATION_TIMEOUT_MS = 30_000
const AUTH_TIMEOUT_MESSAGE = 'AUTH_OPERATION_TIMEOUT'

function isAuthOperationTimeout(err: unknown): boolean {
  return err instanceof Error && err.message === AUTH_TIMEOUT_MESSAGE
}

function withAuthTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      reject(new Error(AUTH_TIMEOUT_MESSAGE))
    }, ms)
    promise.then(
      (v) => {
        clearTimeout(t)
        resolve(v)
      },
      (e) => {
        clearTimeout(t)
        reject(e)
      }
    )
  })
}

if (!isSupabaseConfigured) {
  client.auth.getSession = async () =>
    ({ data: { session: null }, error: null }) as unknown as Awaited<
      ReturnType<typeof client.auth.getSession>
    >
  client.auth.getUser = async () =>
    ({ data: { user: null }, error: null }) as unknown as Awaited<
      ReturnType<typeof client.auth.getUser>
    >
  client.auth.refreshSession = async () =>
    ({
      data: { session: null, user: null },
      error: {
        message: 'Supabase not configured',
        name: 'AuthError',
        status: 0,
      } as import('@supabase/supabase-js').AuthError,
    }) as unknown as Awaited<ReturnType<typeof client.auth.refreshSession>>
  client.auth.signOut = async () =>
    ({ error: null }) as unknown as Awaited<ReturnType<typeof client.auth.signOut>>
} else {
  let lastSessionMemory: Session | null = null
  let lastUserMemory: User | null = null

  const syncSessionMemory = (s: Session | null) => {
    lastSessionMemory = s
    lastUserMemory = s?.user ?? null
  }

  client.auth.onAuthStateChange((_event, session) => {
    syncSessionMemory(session)
  })

  // Wrapper getSession – timeout + ugyldig refresh token
  const originalGetSession = client.auth.getSession.bind(client.auth)
  client.auth.getSession = async () => {
    try {
      const result = await withAuthTimeout(originalGetSession(), AUTH_OPERATION_TIMEOUT_MS)
      syncSessionMemory(result.data.session ?? null)
      return result
    } catch (e) {
      if (isAuthOperationTimeout(e)) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            '[Boly] auth.getSession timed out — returning last known session (stale-while-revalidate)'
          )
        }
        return {
          data: { session: lastSessionMemory },
          error: null,
        } as unknown as Awaited<ReturnType<typeof originalGetSession>>
      }
      if (isInvalidRefreshTokenError(e)) {
        await handleInvalidRefreshToken()
        syncSessionMemory(null)
      }
      throw e
    }
  }

  // Wrapper getUser – timeout + ugyldig refresh token
  const originalGetUser = client.auth.getUser.bind(client.auth)
  client.auth.getUser = async () => {
    try {
      const result = await withAuthTimeout(originalGetUser(), AUTH_OPERATION_TIMEOUT_MS)
      lastUserMemory = result.data.user ?? null
      return result
    } catch (e) {
      if (isAuthOperationTimeout(e)) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            '[Boly] auth.getUser timed out — returning last known user (stale-while-revalidate)'
          )
        }
        return {
          data: { user: lastUserMemory },
          error: null,
        } as unknown as Awaited<ReturnType<typeof originalGetUser>>
      }
      if (isInvalidRefreshTokenError(e)) {
        await handleInvalidRefreshToken()
        syncSessionMemory(null)
      }
      throw e
    }
  }

  // Wrapper refreshSession – timeout + ugyldig refresh token
  const originalRefreshSession = client.auth.refreshSession.bind(client.auth)
  client.auth.refreshSession = async () => {
    try {
      return await withAuthTimeout(originalRefreshSession(), AUTH_OPERATION_TIMEOUT_MS)
    } catch (e) {
      if (isAuthOperationTimeout(e)) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            '[Boly] auth.refreshSession timed out — returning last known session (stale-while-revalidate)'
          )
        }
        return {
          data: { session: lastSessionMemory, user: lastUserMemory },
          error: null,
        } as unknown as Awaited<ReturnType<typeof originalRefreshSession>>
      }
      if (isInvalidRefreshTokenError(e)) {
        await handleInvalidRefreshToken()
        syncSessionMemory(null)
      }
      throw e
    }
  }
}

export const supabase = client
