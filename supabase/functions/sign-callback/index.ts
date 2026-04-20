import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { z } from "https://esm.sh/zod@3.23.8"
import { buildCorsHeaders, handleCorsOptions } from "../_shared/cors.ts"
import { edgeLog } from "../_shared/edgeLog.ts"
import { resolveBaseWebUrl } from "../_shared/safeRedirect.ts"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

const citySchema = z.string().max(200).optional()

function parseCallbackQuery(url: URL) {
  const status = url.searchParams.get("status")
  const origin = url.searchParams.get("origin")
  const signingSessionId = url.searchParams.get("signingSessionId")
  const userIdRaw =
    url.searchParams.get("userId") ||
    url.searchParams.get("externalReference") ||
    url.searchParams.get("externalId")
  const cityRaw = url.searchParams.get("city")?.trim() || ""

  const userIdParsed = userIdRaw ? z.string().uuid().safeParse(userIdRaw) : null
  const userId = userIdParsed?.success ? userIdParsed.data : undefined

  let city = ""
  if (cityRaw) {
    const cityParsed = citySchema.safeParse(cityRaw)
    city = cityParsed.success ? cityParsed.data : ""
  }

  const statusSafe = status && status.length <= 64 ? status : status?.slice(0, 64) ?? null
  const sessionSafe =
    signingSessionId && signingSessionId.length <= 400
      ? signingSessionId
      : signingSessionId?.slice(0, 400) ?? null

  return { status: statusSafe, origin, signingSessionId: sessionSafe, userId, city }
}

serve(async (req) => {
  const preflight = handleCorsOptions(req)
  if (preflight) return preflight

  if (!SUPABASE_URL?.trim() || !SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    edgeLog("error", "sign-callback missing env", {})
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
    })
  }

  const url = new URL(req.url)
  const { status, signingSessionId, userId, city, origin } = parseCallbackQuery(url)

  edgeLog("info", "sign-callback", {
    status,
    hasUserId: !!userId,
    hasSession: !!signingSessionId,
    cityLen: city.length,
  })

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const baseWebUrl = resolveBaseWebUrl(origin, url)
  let redirectUrl = `${baseWebUrl}/homeowner/sign-terms`

  try {
    const isSuccess = status === "success" || !status

    if (isSuccess && userId) {
      const { error: updateError } = await supabaseAdmin.from("user_agreements").upsert(
        [
          {
            user_id: userId,
            agreement_version: "1.0",
            signed_at: new Date().toISOString(),
            is_terminated: false,
            terminated_at: null,
            terminated_by_kommune: false,
          },
        ],
        { onConflict: "user_id, agreement_version" },
      )

      if (updateError) {
        throw updateError
      }

      const sinceIso = new Date(Date.now() - 30 * 60 * 1000).toISOString()
      const { data: initRows } = await supabaseAdmin
        .from("audit_logs")
        .select("details")
        .eq("user_id", userId)
        .eq("action_type", "SIGN_INITIATED")
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: false })
        .limit(1)

      const rawDetails = initRows?.[0]?.details as Record<string, unknown> | null | undefined
      const fromAudit = rawDetails?.terms_document_id
      let termsDocumentId: string | null = null
      if (typeof fromAudit === "string" && z.string().uuid().safeParse(fromAudit).success) {
        termsDocumentId = fromAudit
      }
      if (!termsDocumentId) {
        const { data: legacyId } = await supabaseAdmin.rpc("get_latest_terms_document_id_for_user", {
          p_user_id: userId,
          p_city: city?.trim() || null,
        })
        if (typeof legacyId === "string" && z.string().uuid().safeParse(legacyId).success) {
          termsDocumentId = legacyId
        }
      }

      if (termsDocumentId) {
        const { error: termsSyncErr } = await supabaseAdmin.rpc("sync_terms_acceptance_after_sign", {
          p_user_id: userId,
          p_terms_document_id: termsDocumentId,
        })
        if (termsSyncErr) {
          edgeLog("warn", "sync_terms_acceptance_after_sign", { message: termsSyncErr.message })
        }
      } else {
        edgeLog("warn", "sign-callback missing terms_document_id for sync", { userId })
      }

      await supabaseAdmin.from("audit_logs").insert([
        {
          user_id: userId,
          action_type: "SIGN_TERMS_BANKID",
          details: { signingSessionId },
        },
      ])

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("full_name")
        .eq("id", userId)
        .maybeSingle()

      const { data: userObject } = await supabaseAdmin.auth.admin.getUserById(userId)
      const userName =
        profile?.full_name ||
        userObject?.user?.user_metadata?.full_name ||
        userObject?.user?.email?.split("@")[0] ||
        `Bruker ${userId.substring(0, 8)}`

      const { data: kommuneProfiles } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .in("role", ["kommune_ansatt", "kommune_admin"])

      const recipients = (kommuneProfiles || []).filter((p) => p.id !== userId)

      if (recipients.length > 0) {
        const notifications = recipients
          .filter((p) => p.id !== userId)
          .map((p) => ({
            owner_id: p.id,
            type: "TERMS_SIGNED",
            title: "Vilkårsavtale signert",
            message: `${userName} har signert vilkårsavtalen.`,
            status: "unread",
          }))
        if (notifications.length > 0) {
          await supabaseAdmin.from("notifications").insert(notifications)
        }
      }

      redirectUrl += "?signed=true" + (city ? `&city=${encodeURIComponent(city)}` : "")
    } else {
      redirectUrl += `?signed=false&error=${encodeURIComponent(status || "unknown")}`
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    edgeLog("error", "sign-callback failure", { message })
    redirectUrl += `?signed=false&error=callback_failed`
  }

  return Response.redirect(redirectUrl, 302)
})
