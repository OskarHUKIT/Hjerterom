import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SIGNICAT_DISCOVERY_URL = "https://kunnskapstrening-it.sandbox.signicat.com/auth/open/.well-known/openid-configuration"
const CLIENT_ID = "sandbox-smug-hair-945"
const CLIENT_SECRET = Deno.env.get("SIGNICAT_SECRET_LOGIN")?.trim()
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

serve(async (req) => {
  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state") // OAuth state = return_to from callback
  const returnTo = url.searchParams.get("return_to") // From initial request
  
  const redirectUri = `https://ayddwbmkclujefnhsaqv.supabase.co/functions/v1/auth-signicat`
  
  if (!CLIENT_SECRET) {
    return errorPage("SIGNICAT_SECRET_LOGIN er ikke satt i Supabase. Legg til hemmeligheten under Project Settings → Edge Functions → Secrets.", state, url)
  }

  if (!code) {
    try {
      const response = await fetch(SIGNICAT_DISCOVERY_URL)
      const discovery = await response.json()
      const authorizeUrl = new URL(discovery.authorization_endpoint)
      
      authorizeUrl.searchParams.set("client_id", CLIENT_ID)
      authorizeUrl.searchParams.set("response_type", "code")
      authorizeUrl.searchParams.set("scope", "openid profile email")
      authorizeUrl.searchParams.set("redirect_uri", redirectUri)
      if (returnTo) authorizeUrl.searchParams.set("state", returnTo)
      
      return Response.redirect(authorizeUrl.toString(), 302)
    } catch (e) {
      return new Response(JSON.stringify({ error: "Kunne ikke kontakte Signicat Discovery", details: e.message }), { status: 500 })
    }
  }

  try {
    const discoveryRes = await fetch(SIGNICAT_DISCOVERY_URL)
    const discovery = await discoveryRes.json()
    
    const tokenRes = await fetch(discovery.token_endpoint, {
      method: "POST",
      headers: { 
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic " + btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    })
    
    const tokens = await tokenRes.json()
    if (tokens.error) throw new Error(tokens.error_description || tokens.error)

    const base64Payload = tokens.id_token.split('.')[1]
    const payload = JSON.parse(atob(base64Payload))
    const bankIdName = payload.name || "BankID Bruker"
    const email = payload.email || `${payload.sub}@bankid.no`

    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
    
    // 1. Forsøk å opprette bruker. 
    // Vi pakker dette inn i en try/catch slik at vi ignorerer feilen hvis de finnes fra før.
    let userId;
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      email_confirm: true,
      user_metadata: { 
        full_name: bankIdName, 
        bankid_sub: payload.sub,
        provider: 'signicat_bankid'
      }
    })

    if (createError) {
      // Hvis brukeren finnes, henter vi dem bare i stedet for å kaste feil
      if (createError.message.includes("already been registered")) {
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers()
        const existing = listData.users.find(u => u.email === email)
        userId = existing?.id
      } else {
        throw createError
      }
    } else {
      userId = newUser.user.id
    }

    // 2. Oppdater profil med navn og rolle (uansett om brukeren er ny eller gammel)
    if (userId) {
      // Hent eksisterende rolle fra metadata hvis den finnes
      const { data: userObject } = await supabaseAdmin.auth.admin.getUserById(userId)
      const currentRole = userObject?.user?.user_metadata?.role || 'homeowner'

      await supabaseAdmin
        .from('profiles')
        .upsert({ 
          id: userId,
          full_name: bankIdName,
          email: email,
          role: currentRole,
          updated_at: new Date().toISOString()
        })
        .catch(err => console.error("Profil-oppdatering feilet:", err.message))
    }

    // 3. Generer innloggingslenke - bruk state (return_to) fra OAuth callback
    const finalRedirect = (state && decodeURIComponent(state).startsWith('http')) 
      ? decodeURIComponent(state) 
      : (url.host.includes('localhost') ? 'http://localhost:3000' : 'https://boly.vercel.app')

    const redirectWithBankId = finalRedirect + (finalRedirect.includes('?') ? '&' : '?') + 'bankid=1'
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: { redirectTo: redirectWithBankId }
    })

    if (linkError) throw linkError

    return Response.redirect(linkData.properties.action_link, 302)

  } catch (err: any) {
    const msg = err?.message || String(err)
    console.error("BankID Login Error:", msg)
    return errorPage(msg, state, url)
  }
})

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function errorPage(msg: string, state?: string | null, url?: URL): Response {
  try {
    const fallbackOrigin = url?.host?.includes('localhost') ? 'http://localhost:3000' : 'https://boly.vercel.app'
    const loginUrl = (state && decodeURIComponent(state).startsWith('http')) ? decodeURIComponent(state) + '/login' : fallbackOrigin + '/login'
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>BankID-feil</title></head><body style="font-family:system-ui;max-width:480px;margin:80px auto;padding:24px;background:#0f172a;color:#e2e8f0;">
      <h1 style="color:#ef4444;">BankID-innlogging feilet</h1>
      <p style="opacity:0.9;">${escapeHtml(msg)}</p>
      <p style="font-size:0.9rem;opacity:0.7;">Vanlige årsaker: Manglende SIGNICAT_SECRET_LOGIN, feil redirect_uri i Signicat-dashboard, eller utløpt BankID-kode.</p>
      <a href="${escapeHtml(loginUrl)}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#3b82f6;color:white;text-decoration:none;border-radius:8px;">Prøv igjen</a>
    </body></html>`
    return new Response(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } })
  } catch {
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
}
