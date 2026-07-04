import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { isBankIdAutoAcceptServerEnabled } from '@/app/lib/bankidAutoAccept'

export async function POST(request: Request) {
  if (!isBankIdAutoAcceptServerEnabled()) {
    return NextResponse.json({ error: 'BANKID_AUTO_ACCEPT is not enabled' }, { status: 403 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!serviceKey || !url || !anonKey) {
    return NextResponse.json({ error: 'Supabase env missing' }, { status: 500 })
  }

  const cookieStore = await cookies()
  const supabaseAuth = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => {},
    },
  })

  const {
    data: { user },
  } = await supabaseAuth.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  let body: { city?: string; termsDocumentId?: string } = {}
  try {
    body = await request.json()
  } catch {
    /* optional body */
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

  const { error: agreementErr } = await admin.from('user_agreements').upsert(
    {
      user_id: user.id,
      agreement_version: '1.0',
      signed_at: new Date().toISOString(),
      is_terminated: false,
      terminated_at: null,
      terminated_by_kommune: false,
    },
    { onConflict: 'user_id, agreement_version' }
  )

  if (agreementErr) {
    return NextResponse.json({ error: agreementErr.message }, { status: 500 })
  }

  let termsDocumentId = body.termsDocumentId?.trim() || null
  if (!termsDocumentId) {
    const { data: legacyId } = await admin.rpc('get_latest_terms_document_id_for_user', {
      p_user_id: user.id,
      p_city: body.city?.trim() || null,
    })
    if (typeof legacyId === 'string') termsDocumentId = legacyId
  }

  if (termsDocumentId) {
    await admin.rpc('sync_terms_acceptance_after_sign', {
      p_user_id: user.id,
      p_terms_document_id: termsDocumentId,
    })
  }

  await admin.from('audit_logs').insert({
    user_id: user.id,
    action_type: 'SIGN_TERMS_BANKID',
    details: { mode: 'auto_accept_test', signingSessionId: 'test-bypass' },
  })

  return NextResponse.json({ ok: true, signed: true })
}
