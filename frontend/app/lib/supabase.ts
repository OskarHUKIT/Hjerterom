import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// BankID: sessionStorage = utlogget når nettleser/tab lukkes. E-post/passord: standard localStorage.
const isBankIdCallback =
  typeof window !== 'undefined' &&
  /[?&]bankid=1($|&|#|\s)/.test(window.location.search + '&' + (window.location.hash || ''))

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: isBankIdCallback ? window.sessionStorage : undefined,
    storageKey: isBankIdCallback ? 'supabase-auth-bankid' : undefined,
  },
})



