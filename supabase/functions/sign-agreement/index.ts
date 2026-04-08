import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/** Must match the API client in Signicat Dashboard → Settings → API clients (same client as SIGNICAT_SECRET_SIGN). */
const CLIENT_ID =
  Deno.env.get("SIGNICAT_CLIENT_ID_SIGN")?.trim() || "sandbox-misty-angle-164"
const CLIENT_SECRET = Deno.env.get("SIGNICAT_SECRET_SIGN")?.trim()
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "")

function fallbackPdfUrl(): string {
  const fromEnv = Deno.env.get("TERMS_FALLBACK_PDF_URL")?.trim()
  if (fromEnv) return fromEnv
  const base = SUPABASE_URL?.replace(/\/$/, "")
  if (!base) {
    throw new Error("SUPABASE_URL mangler — kan ikke hente standard vilkår-PDF fra Storage.")
  }
  return `${base}/storage/v1/object/public/documents/VilkarsavtaleBoligbanken.pdf`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let currentStep = "Initialisering"
  try {
    const raw = await req.text()
    let body: { userId?: string; origin?: string; city?: string }
    try {
      body = raw ? JSON.parse(raw) : {}
    } catch {
      console.error('Body parse failed. Raw (first 200):', raw.slice(0, 200))
      throw new Error('Ugyldig forespørsel: kunne ikke parse JSON.')
    }
    const { userId, origin, city } = body
    const cityParam = city?.trim() ? `&city=${encodeURIComponent(city.trim())}` : ''

    console.log(`DEBUG: Starter signering for ${userId}. Origin: ${origin}. City: ${city ?? '(none)'}. Secret konfigurert: ${!!CLIENT_SECRET}`)
    
    if (!userId) throw new Error("Mangler userId i forespørselen")
    if (!CLIENT_SECRET) throw new Error("SIGNICAT_SECRET_SIGN mangler i Supabase Secrets. Sjekk at du har lagt den til i Edge Functions -> Secrets.")
    if (!SUPABASE_URL) throw new Error("SUPABASE_URL mangler")

    // Logg initieringen (rate limit deaktivert for nå)
    currentStep = "Logging"
    const supabaseAdmin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
    await supabaseAdmin.from('audit_logs').insert([{
      user_id: userId,
      action_type: 'SIGN_INITIATED',
      details: { note: 'Rate limit deaktivert' }
    }])

    currentStep = "Hent gjeldende vilkår-dokument"
    const { data: docId, error: rpcErr } = await supabaseAdmin.rpc('get_latest_terms_document_id_for_user', {
      p_user_id: userId,
      p_city: city?.trim() || null,
    })
    if (rpcErr) console.warn('get_latest_terms_document_id_for_user:', rpcErr.message)

    let pdfUrl = fallbackPdfUrl()
    let signTitle = "Vilkårsavtale Boligbank"

    if (docId && typeof docId === 'string') {
      const { data: row } = await supabaseAdmin
        .from('terms_documents')
        .select('title, pdf_bucket, pdf_storage_path')
        .eq('id', docId)
        .maybeSingle()

      if (row?.pdf_storage_path?.trim()) {
        const bucket = (row.pdf_bucket || 'documents').trim()
        const path = row.pdf_storage_path.trim()
        pdfUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path.split('/').map(encodeURIComponent).join('/')}`
        if (row.title?.trim()) signTitle = row.title.trim()
      }
    }

    // 1. Token
    currentStep = "Henting av Access Token"
    const tokenRes = await fetch("https://api.signicat.com/auth/open/connect/token", {
      method: "POST",
      headers: { 
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic " + btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)
      },
      body: new URLSearchParams({ grant_type: "client_credentials", scope: "signicat-api" })
    })
    
    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      throw new Error(`Signicat Token-feil: ${tokenRes.status} - ${err}`)
    }
    const { access_token } = await tokenRes.json()

    // 2. PDF
    currentStep = "Henting av PDF fra Storage"
    const pdfRes = await fetch(pdfUrl)
    if (!pdfRes.ok) throw new Error(`Kunne ikke laste ned PDF fra Storage (${pdfRes.status})`)
    const pdfBuffer = await pdfRes.arrayBuffer()

    // 3. Dokument
    currentStep = "Opplasting av dokument til Signicat"
    const uploadRes = await fetch("https://api.signicat.com/sign/documents", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${access_token}`,
        "Content-Type": "application/pdf"
      },
      body: pdfBuffer
    })
    const docData = await uploadRes.json()
    if (!uploadRes.ok) throw new Error(`Dokumentopplasting feilet: ${JSON.stringify(docData)}`)
    const documentId = docData.id || docData.documentId

    // 4. Samling
    currentStep = "Opprettelse av dokument-samling"
    const collRes = await fetch("https://api.signicat.com/sign/document-collections", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        documents: [{ documentId }]
      })
    })
    const collData = await collRes.json()
    if (!collRes.ok) throw new Error(`Samling-opprettelse feilet: ${JSON.stringify(collData)}`)
    const collectionId = collData.id || collData.documentCollectionId

    const functionsHost = `${SUPABASE_URL}/functions/v1`

    // 5. Sesjon
    currentStep = "Opprettelse av signerings-økt"
    const sessionRes = await fetch("https://api.signicat.com/sign/signing-sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${access_token}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify([{
        title: signTitle.slice(0, 200),
        externalReference: userId,
        documents: [{
          documentId,
          documentCollectionId: collectionId,
          action: "SIGN"
        }],
        signingSetup: [{
          identityProviders: [{ idpName: "nbid" }],
          signingFlow: "AUTHENTICATION_BASED"
        }],
        redirectSettings: {
          success: `${functionsHost}/sign-callback?userId=${encodeURIComponent(userId)}&origin=${encodeURIComponent(origin || "")}${cityParam}`,
          cancel: `${functionsHost}/sign-callback?status=cancel&userId=${encodeURIComponent(userId)}&origin=${encodeURIComponent(origin || "")}${cityParam}`,
          error: `${functionsHost}/sign-callback?status=error&userId=${encodeURIComponent(userId)}&origin=${encodeURIComponent(origin || "")}${cityParam}`
        }
      }])
    })

    const sessionData = await sessionRes.json()
    console.log("Full session response:", JSON.stringify(sessionData))
    
    if (!sessionRes.ok) throw new Error(`Signerings-økt feilet: ${JSON.stringify(sessionData)}`)

    const sessionObj = Array.isArray(sessionData) ? sessionData[0] : sessionData
    const signatureUrl = sessionObj?.signatureUrl || sessionObj?.url
    
    if (!signatureUrl) {
      throw new Error(`Fant ingen URL i svaret fra Signicat. Svar: ${JSON.stringify(sessionData)}`)
    }

    return new Response(JSON.stringify({ url: signatureUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`FEIL i steg "${currentStep}":`, message)
    return new Response(JSON.stringify({ 
      error: `Feil under ${currentStep}`, 
      message 
    }), { 
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
