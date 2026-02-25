import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CLIENT_ID = "sandbox-misty-angle-164"
const CLIENT_SECRET = Deno.env.get("SIGNICAT_SECRET_SIGN")?.trim()
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")

const PDF_URL = "https://ayddwbmkclujefnhsaqv.supabase.co/storage/v1/object/public/documents/VilkarsavtaleBoligbanken.pdf"

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let currentStep = "Initialisering"
  try {
    const body = await req.json()
    const { userId, origin } = body
    
    console.log(`DEBUG: Starter signering for ${userId}. Origin: ${origin}. Secret konfigurert: ${!!CLIENT_SECRET}`)
    
    if (!userId) throw new Error("Mangler userId i forespørselen")
    if (!CLIENT_SECRET) throw new Error("SIGNICAT_SECRET_SIGN mangler i Supabase Secrets. Sjekk at du har lagt den til i Edge Functions -> Secrets.")

    // --- RATE LIMITING ---
    currentStep = "Sjekk av dagsgrense for signering"
    const supabaseAdmin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))
    
    // 1. Hent brukerens rolle
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()
    
    const role = profile?.role || 'homeowner'
    const dailyLimit = role === 'kommune_ansatt' ? 5 : 2
    
    // 2. Sjekk antall initieringer i dag (UTC)
    const today = new Date().toISOString().split('T')[0]
    const { count } = await supabaseAdmin
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('action_type', 'SIGN_INITIATED')
      .gte('created_at', today)
    
    if (count !== null && count >= dailyLimit) {
      throw new Error(`Du har nådd grensen for antall signeringer per dag (${dailyLimit}). Vennligst prøv igjen i morgen.`)
    }

    // 3. Logg initieringen umiddelbart
    await supabaseAdmin.from('audit_logs').insert([{
      user_id: userId,
      action_type: 'SIGN_INITIATED',
      details: { role, limit: dailyLimit, count: (count || 0) + 1 }
    }])
    // --- END RATE LIMITING ---

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
    const pdfRes = await fetch(PDF_URL)
    if (!pdfRes.ok) throw new Error("Kunne ikke laste ned PDF fra Storage")
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

    // 5. Sesjon
    currentStep = "Opprettelse av signerings-økt"
    // Prøver uten array-innpakning dersom det er en enkelt sesjon, 
    // men Signicat v2 krever ofte array for POST /signing-sessions
    const sessionRes = await fetch("https://api.signicat.com/sign/signing-sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${access_token}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify([{
        title: "Vilkårsavtale Boligbanken",
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
          success: `https://ayddwbmkclujefnhsaqv.functions.supabase.co/sign-callback?userId=${encodeURIComponent(userId)}&origin=${encodeURIComponent(origin || "")}`,
          cancel: `https://ayddwbmkclujefnhsaqv.functions.supabase.co/sign-callback?status=cancel&userId=${encodeURIComponent(userId)}&origin=${encodeURIComponent(origin || "")}`,
          error: `https://ayddwbmkclujefnhsaqv.functions.supabase.co/sign-callback?status=error&userId=${encodeURIComponent(userId)}&origin=${encodeURIComponent(origin || "")}`
        }
      }])
    })

    const sessionData = await sessionRes.json()
    console.log("Full session response:", JSON.stringify(sessionData))
    
    if (!sessionRes.ok) throw new Error(`Signerings-økt feilet: ${JSON.stringify(sessionData)}`)

    // Signicat v2 kan returnere enten et objekt eller en liste
    const sessionObj = Array.isArray(sessionData) ? sessionData[0] : sessionData
    const signatureUrl = sessionObj?.signatureUrl || sessionObj?.url
    
    if (!signatureUrl) {
      throw new Error(`Fant ingen URL i svaret fra Signicat. Svar: ${JSON.stringify(sessionData)}`)
    }

    return new Response(JSON.stringify({ url: signatureUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })

  } catch (err) {
    console.error(`FEIL i steg "${currentStep}":`, err.message)
    return new Response(JSON.stringify({ 
      error: `Feil under ${currentStep}`, 
      message: err.message 
    }), { 
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
