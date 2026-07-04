import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'

export type AuthedServerClient = {
  supabase: SupabaseClient
  userId: string | null
  email: string | null
}

/** Cookie-authenticated Supabase client for Next.js App Router API routes. */
export async function createAuthedServerClient(): Promise<AuthedServerClient | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null

  const cookieStore = await cookies()
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {},
    },
  })
  const { data } = await supabase.auth.getUser()
  return {
    supabase,
    userId: data.user?.id ?? null,
    email: data.user?.email ?? null,
  }
}
