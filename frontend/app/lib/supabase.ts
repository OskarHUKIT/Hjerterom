import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

/** Uten URL/nøkkel henger ofte getSession/getUser — da blir hele appen «Laster…». */
export const isSupabaseConfigured = Boolean(supabaseUrl.trim() && supabaseKey.trim())

if (process.env.NODE_ENV === 'development' && !isSupabaseConfigured) {
  console.warn(
    '[BoLy] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY — data will not load. Add them to frontend/.env.local'
  )
}

// BankID: sessionStorage = utlogget når nettleser/tab lukkes. E-post/passord: standard localStorage.
const isBankIdCallback =
  typeof window !== 'undefined' &&
  /[?&]bankid=1($|&|#|\s)/.test(window.location.search + '&' + (window.location.hash || ''))

const client = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: isBankIdCallback ? window.sessionStorage : undefined,
    storageKey: isBankIdCallback ? 'supabase-auth-bankid' : undefined,
  },
})

/** Sjekker om feilen er ugyldig/utløpt refresh token – da skal vi logge ut og sende bruker til forsiden. */
function isInvalidRefreshTokenError(err: unknown): boolean {
  const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message?: string }).message) : ''
  return /refresh token not found|invalid refresh token|refresh_token/i.test(msg)
}

/** Ved ugyldig refresh token: sign out lokalt og redirect til forsiden (unngår AuthApiError i konsollen ved neste kall). */
async function handleInvalidRefreshToken(): Promise<void> {
  await client.auth.signOut({ scope: 'local' })
  if (typeof window !== 'undefined' && !/^\/(login)?(\?|#|$)/.test(window.location.pathname)) {
    window.location.href = '/'
  }
}

if (!isSupabaseConfigured) {
  client.auth.getSession = async () =>
    ({ data: { session: null }, error: null }) as unknown as Awaited<ReturnType<typeof client.auth.getSession>>
  client.auth.getUser = async () =>
    ({ data: { user: null }, error: null }) as unknown as Awaited<ReturnType<typeof client.auth.getUser>>
  client.auth.refreshSession = async () =>
    ({
      data: { session: null, user: null },
      error: { message: 'Supabase not configured', name: 'AuthError', status: 0 } as import('@supabase/supabase-js').AuthError,
    }) as unknown as Awaited<ReturnType<typeof client.auth.refreshSession>>
  client.auth.signOut = async () => ({ error: null }) as unknown as Awaited<ReturnType<typeof client.auth.signOut>>
} else {
  // Wrapper getSession – fanger ugyldig refresh token og logger ut
  const originalGetSession = client.auth.getSession.bind(client.auth)
  client.auth.getSession = async () => {
    try {
      return await originalGetSession()
    } catch (e) {
      if (isInvalidRefreshTokenError(e)) {
        await handleInvalidRefreshToken()
      }
      throw e
    }
  }

  // Wrapper getUser – fanger ugyldig refresh token og logger ut (getUser trigrer ofte refresh)
  const originalGetUser = client.auth.getUser.bind(client.auth)
  client.auth.getUser = async () => {
    try {
      return await originalGetUser()
    } catch (e) {
      if (isInvalidRefreshTokenError(e)) {
        await handleInvalidRefreshToken()
      }
      throw e
    }
  }

  // Wrapper refreshSession – fanger ugyldig refresh token (f.eks. etter BankID-retur)
  const originalRefreshSession = client.auth.refreshSession.bind(client.auth)
  client.auth.refreshSession = async () => {
    try {
      return await originalRefreshSession()
    } catch (e) {
      if (isInvalidRefreshTokenError(e)) {
        await handleInvalidRefreshToken()
      }
      throw e
    }
  }
}

export const supabase = client



