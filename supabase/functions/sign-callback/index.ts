import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const status = url.searchParams.get("status")
  const origin = url.searchParams.get("origin")
  
  // Signicat v2 sender ofte disse som query-parametre i redirecten
  const signingSessionId = url.searchParams.get("signingSessionId")
  const userId = url.searchParams.get("userId") || url.searchParams.get("externalReference") || url.searchParams.get("externalId")
  const city = url.searchParams.get("city")?.trim() || ""

  console.log("Signering ferdig:", { status, signingSessionId, userId, origin, city })

  const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
  
  // Bruk origin vi fikk fra frontend, eller gjett basert på host
  const baseWebUrl = origin || (url.host.includes('localhost') ? 'http://localhost:3000' : `https://${url.host.replace('.functions', '')}`)
  let redirectUrl = `${baseWebUrl}/homeowner/sign-terms`

  try {
    // Hvis vi mangler status fra Signicat, men har sessionId, kan det være en direkte redirect
    // (I sandbox regner vi 'success' som standard hvis vi kommer hit uten feilmelding)
    const isSuccess = status === 'success' || !status

    if (isSuccess && userId) {
      // 1. Oppdater databasen med upsert (oppdaterer hvis finnes fra før)
      const { error: updateError } = await supabaseAdmin
        .from('user_agreements')
        .upsert([{
          user_id: userId,
          agreement_version: '1.0',
          signed_at: new Date().toISOString(),
          is_terminated: false,
          terminated_at: null // Nullstill oppsigelsesdato
        }], { onConflict: 'user_id, agreement_version' })

      if (updateError) {
        throw updateError
      }

      // 1b. Versjonerte vilkår (tekst) — kobles til user_terms_acceptances
      const { error: termsSyncErr } = await supabaseAdmin.rpc("sync_terms_acceptance_after_sign", {
        p_user_id: userId,
        p_city: city || null,
      })
      if (termsSyncErr) {
        console.error("sync_terms_acceptance_after_sign:", termsSyncErr)
      }

      // 2. Logg hendelsen
      await supabaseAdmin.from('audit_logs').insert([{
        user_id: userId,
        action_type: 'SIGN_TERMS_BANKID',
        details: { signingSessionId }
      }])

      // 3. Opprett varsel kun for kommune-ansatte (ikke for utleieren selv)
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .maybeSingle()
      
      const { data: userObject } = await supabaseAdmin.auth.admin.getUserById(userId)
      const userName = profile?.full_name || userObject?.user?.user_metadata?.full_name || userObject?.user?.email?.split('@')[0] || `Bruker ${userId.substring(0, 8)}`

      const { data: kommuneProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .in('role', ['kommune_ansatt', 'kommune_admin'])

      // Kun kommune-ansatte, ALDRI brukeren som signerte selv (utleier)
      const recipients = (kommuneProfiles || []).filter((p) => p.id !== userId)

      if (recipients.length > 0) {
        const notifications = recipients
          .filter((p) => p.id !== userId) // Ekstra sikkerhet: aldri signerer
          .map((p) => ({
            owner_id: p.id,
            type: 'TERMS_SIGNED',
            title: 'Vilkårsavtale signert',
            message: `${userName} har signert vilkårsavtalen.`,
            status: 'unread'
          }))
        if (notifications.length > 0) {
          await supabaseAdmin.from('notifications').insert(notifications)
        }
      }

      redirectUrl += "?signed=true" + (city ? `&city=${encodeURIComponent(city)}` : "")
    } else {
      redirectUrl += `?signed=false&error=${status || 'unknown'}`
    }
  } catch (err) {
    console.error("Callback-feil:", err.message)
    redirectUrl += `?signed=false&error=callback_failed`
  }

  return Response.redirect(redirectUrl, 302)
})
