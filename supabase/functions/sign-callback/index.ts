import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { z } from "https://esm.sh/zod@3.23.8"
import { buildCorsHeaders, handleCorsOptions } from "../_shared/cors.ts"
import { edgeLog } from "../_shared/edgeLog.ts"
import { recordPlatformEvent, resolveKommuneIdFromCity } from "../_shared/recordPlatformEvent.ts"
import { resolveBaseWebUrl } from "../_shared/safeRedirect.ts"
import {
  fetchSigningSession,
  isSigningSessionCompleted,
} from "../_shared/signicatSignApi.ts"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

const citySchema = z.string().max(200).optional()

function parseCallbackQuery(url: URL) {
  const status = url.searchParams.get("status")
  const origin = url.searchParams.get("origin")
  const signingSessionId =
    url.searchParams.get("signingSessionId") ||
    url.searchParams.get("sessionId") ||
    url.searchParams.get("signingSession")
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

async function resolveSigningSessionId(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  fromQuery: string | null,
): Promise<string | null> {
  if (fromQuery?.trim()) return fromQuery.trim()

  const sinceIso = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
  const { data: rows } = await supabaseAdmin
    .from("audit_logs")
    .select("details")
    .eq("user_id", userId)
    .eq("action_type", "SIGN_INITIATED")
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(1)

  const raw = rows?.[0]?.details as Record<string, unknown> | null | undefined
  const fromAudit = raw?.signing_session_id
  if (typeof fromAudit === "string" && fromAudit.trim()) return fromAudit.trim()
  return null
}

async function wasSigningSessionAlreadyProcessed(
  supabaseAdmin: ReturnType<typeof createClient>,
  signingSessionId: string,
): Promise<boolean> {
  const { count } = await supabaseAdmin
    .from("audit_logs")
    .select("*", { count: "exact", head: true })
    .eq("action_type", "SIGN_TERMS_BANKID")
    .filter("details->>signingSessionId", "eq", signingSessionId)
  return (count ?? 0) > 0
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
  const { status, signingSessionId: sessionFromQuery, userId, city, origin } = parseCallbackQuery(url)

  edgeLog("info", "sign-callback", {
    status,
    hasUserId: !!userId,
    hasSession: !!sessionFromQuery,
    cityLen: city.length,
  })

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const baseWebUrl = resolveBaseWebUrl(origin, url)
  let redirectUrl = `${baseWebUrl}/homeowner/sign-terms`

  const isExplicitFailure = status === "cancel" || status === "error"

  try {
    if (isExplicitFailure || !userId) {
      const kommuneId = userId ? await resolveKommuneIdFromCity(supabaseAdmin, city) : null
      await recordPlatformEvent(supabaseAdmin, {
        severity: status === "error" ? "error" : "warn",
        source: "edge:sign-callback",
        code: status === "cancel" ? "SIGN_CANCELLED" : "SIGN_CALLBACK_FAILED",
        message: `Sign callback status: ${status || "missing_user"}`,
        userId: userId ?? null,
        kommuneId,
        metadata: { status: status || "unknown" },
      })
      redirectUrl += `?signed=false&error=${encodeURIComponent(status || "unknown")}`
      return Response.redirect(redirectUrl, 302)
    }

    const signingSessionId = await resolveSigningSessionId(supabaseAdmin, userId, sessionFromQuery)
    if (!signingSessionId) {
      edgeLog("warn", "sign-callback missing signing session id", { userId })
      redirectUrl += "?signed=false&error=missing_session"
      return Response.redirect(redirectUrl, 302)
    }

    let session
    try {
      session = await fetchSigningSession(signingSessionId)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      edgeLog("error", "sign-callback session fetch failed", { message, signingSessionId })
      redirectUrl += "?signed=false&error=session_lookup_failed"
      return Response.redirect(redirectUrl, 302)
    }

    if (session.externalReference && session.externalReference !== userId) {
      edgeLog("warn", "sign-callback externalReference mismatch", {
        userId,
        externalReference: session.externalReference,
      })
      redirectUrl += "?signed=false&error=session_user_mismatch"
      return Response.redirect(redirectUrl, 302)
    }

    if (!isSigningSessionCompleted(session)) {
      edgeLog("info", "sign-callback signing not completed", {
        userId,
        signingSessionId,
        lifecycleState: session.lifecycle?.state,
        stateIsFinal: session.lifecycle?.stateIsFinal,
      })
      await recordPlatformEvent(supabaseAdmin, {
        severity: "info",
        source: "edge:sign-callback",
        code: "SIGN_NOT_COMPLETED",
        message: "Callback received but Signicat session is not signed yet",
        userId,
        kommuneId: await resolveKommuneIdFromCity(supabaseAdmin, city),
        metadata: {
          signingSessionId,
          lifecycleState: session.lifecycle?.state ?? null,
        },
      })
      redirectUrl += "?signed=false&error=signing_not_completed"
      return Response.redirect(redirectUrl, 302)
    }

    const alreadyProcessed = await wasSigningSessionAlreadyProcessed(supabaseAdmin, signingSessionId)

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

    const kommuneId = await resolveKommuneIdFromCity(supabaseAdmin, city)

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
        await recordPlatformEvent(supabaseAdmin, {
          severity: "warn",
          source: "edge:sign-callback",
          code: "SIGN_TERMS_SYNC_FAILED",
          message: "Terms sync after sign failed",
          userId,
          kommuneId,
          metadata: { detail: termsSyncErr.message.slice(0, 200) },
        })
      }
    } else {
      edgeLog("warn", "sign-callback missing terms_document_id for sync", { userId })
    }

    if (!alreadyProcessed) {
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
        const eventId = crypto.randomUUID()
        const notifications = recipients.map((p) => ({
          owner_id: p.id,
          type: "TERMS_SIGNED",
          title: "Vilkårsavtale signert",
          message: `${userName} har signert vilkårsavtalen.`,
          status: "unread",
          event_id: eventId,
        }))
        await supabaseAdmin.from("notifications").insert(notifications)
      }
    } else {
      edgeLog("info", "sign-callback duplicate session skipped notify", { signingSessionId })
    }

    redirectUrl += "?signed=true" + (city ? `&city=${encodeURIComponent(city)}` : "")
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    edgeLog("error", "sign-callback failure", { message })
    const kommuneId = userId ? await resolveKommuneIdFromCity(supabaseAdmin, city) : null
    await recordPlatformEvent(supabaseAdmin, {
      severity: "error",
      source: "edge:sign-callback",
      code: "SIGN_CALLBACK_EXCEPTION",
      message: "Sign callback processing failed",
      userId: userId ?? null,
      kommuneId,
      metadata: { detail: message.slice(0, 200) },
    })
    redirectUrl += `?signed=false&error=callback_failed`
  }

  return Response.redirect(redirectUrl, 302)
})
