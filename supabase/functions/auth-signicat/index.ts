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
  
  const redirectUri = `https://ayddwbmkclujefnhsaqv.supabase.co/functions/v1/auth-signicat`
  
  if (!code) {
    try {
      const response = await fetch(SIGNICAT_DISCOVERY_URL)
      const discovery = await response.json()
      const authorizeUrl = new URL(discovery.authorization_endpoint)
      
      authorizeUrl.searchParams.set("client_id", CLIENT_ID)
      authorizeUrl.searchParams.set("response_type", "code")
      authorizeUrl.searchParams.set("scope", "openid profile email")
      authorizeUrl.searchParams.set("redirect_uri", redirectUri)
      
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

    // 3. Generer innloggingslenke
    const isLocal = url.host.includes('localhost') || url.host.includes('127.0.0.1')
    const finalRedirect = isLocal ? 'http://localhost:3000' : `https://${url.host.replace('.functions', '')}`

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: { redirectTo: finalRedirect }
    })

    if (linkError) throw linkError

    return Response.redirect(linkData.properties.action_link, 302)

  } catch (err) {
    console.error("BankID Login Error:", err.message)
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 400, 
      headers: { "Content-Type": "application/json" } 
    })
  }
})
