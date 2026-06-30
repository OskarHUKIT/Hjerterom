import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { z } from "https://esm.sh/zod@3.23.8"
import { assertAllowedBrowserOrigin, buildCorsHeaders, handleCorsOptions } from "../_shared/cors.ts"
import { edgeLog } from "../_shared/edgeLog.ts"
import { recordPlatformEvent, resolveKommuneIdFromCity } from "../_shared/recordPlatformEvent.ts"
import { sanitizeOriginQueryValue } from "../_shared/safeRedirect.ts"
import { signicatUiLanguageFromAppLocale } from "../_shared/signicatUiLanguage.ts"

const signAgreementBodySchema = z.object({
  userId: z.string().uuid(),
  origin: z.string().max(512).optional(),
  city: z.string().max(200).optional(),
  agreementVersion: z.string().max(32).optional(),
  /** Boly UI language: drives Signicat Sign API `ui.language` (nb/en; se → nb, since Sign API rejects "no"). */
  appLocale: z.enum(["no", "se", "en"]).optional(),
})

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
  const preflight = handleCorsOptions(req)
  if (preflight) return preflight

  if (req.method === "POST") {
    const originDenied = assertAllowedBrowserOrigin(req)
    if (originDenied) return originDenied
  }

  let currentStep = "Initialisering"
  let userId: string | undefined
  let city: string | undefined
  let supabaseAdmin: ReturnType<typeof createClient> | undefined
  try {
    const raw = await req.text()
    let json: unknown = {}
    try {
      json = raw ? JSON.parse(raw) : {}
    } catch {
      console.error('Body parse failed. Raw (first 200):', raw.slice(0, 200))
      throw new Error('Ugyldig forespørsel: kunne ikke parse JSON.')
    }
    const parsedBody = signAgreementBodySchema.safeParse(json)
    if (!parsedBody.success) {
      return new Response(
        JSON.stringify({
          error: 'Ugyldig forespørsel',
          message: 'Validering av body feilet',
          issues: parsedBody.error.flatten(),
        }),
        { status: 400, headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' } },
      )
    }
    const { userId: uid, origin, city: cityRaw, appLocale } = parsedBody.data
    userId = uid
    city = cityRaw
    const cityParam = city?.trim() ? `&city=${encodeURIComponent(city.trim())}` : ''
    const safeOrigin = sanitizeOriginQueryValue(origin)
    const signicatUiLang = signicatUiLanguageFromAppLocale(appLocale)

    edgeLog("info", "sign-agreement start", {
      userId,
      originOk: !!safeOrigin,
      hasCity: !!(city && city.trim()),
      hasSecret: !!CLIENT_SECRET,
      signicatUiLanguage: signicatUiLang,
    })
    if (!CLIENT_SECRET) throw new Error("SIGNICAT_SECRET_SIGN mangler i Supabase Secrets. Sjekk at du har lagt den til i Edge Functions -> Secrets.")
    if (!SUPABASE_URL) throw new Error("SUPABASE_URL mangler")

    currentStep = "Rate limit"
    supabaseAdmin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)

    currentStep = "Sjekk avtalestatus"
    const { data: uaCheck } = await supabaseAdmin
      .from("user_agreements")
      .select("is_terminated, terminated_by_kommune")
      .eq("user_id", userId)
      .maybeSingle()
    if (uaCheck?.is_terminated === true) {
      const kommuneId = await resolveKommuneIdFromCity(supabaseAdmin, city)
      if (uaCheck?.terminated_by_kommune === true) {
        await recordPlatformEvent(supabaseAdmin, {
          severity: "warn",
          source: "edge:sign-agreement",
          code: "SIGN_TERMINATED_BY_KOMMUNE",
          message: "Sign blocked: agreement terminated by kommune",
          userId,
          kommuneId,
        })
        return new Response(
          JSON.stringify({
            error: "Signering ikke tilgjengelig",
            message:
              "Avtalen er sagt opp av kommunen. Be om å få signere på nytt under Mine boliger og vent på godkjenning før du prøver igjen.",
          }),
          { status: 403, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } },
        )
      }
      await recordPlatformEvent(supabaseAdmin, {
        severity: "warn",
        source: "edge:sign-agreement",
        code: "SIGN_TERMINATED",
        message: "Sign blocked: agreement terminated",
        userId,
        kommuneId,
      })
      return new Response(
        JSON.stringify({
          error: "Signering ikke tilgjengelig",
          message:
            "Avtalen er avsluttet. Ta kontakt med kommunen eller logg inn på utleierkontoen for neste steg.",
        }),
        { status: 403, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } },
      )
    }

    currentStep = "Hent dokument å signere"
    const { data: docId, error: rpcErr } = await supabaseAdmin.rpc(
      "get_first_missing_terms_document_id_for_user",
      {
        p_user_id: userId,
        p_city: city?.trim() || null,
      },
    )
    if (rpcErr) console.warn("get_first_missing_terms_document_id_for_user:", rpcErr.message)

    if (!docId || typeof docId !== "string") {
      const kommuneId = await resolveKommuneIdFromCity(supabaseAdmin, city)
      await recordPlatformEvent(supabaseAdmin, {
        severity: "info",
        source: "edge:sign-agreement",
        code: "SIGN_NOTHING_TO_SIGN",
        message: "No pending terms document for user",
        userId,
        kommuneId,
      })
      return new Response(
        JSON.stringify({
          error: "Ingenting å signere",
          message:
            "Alle påkrevde vilkår for dette området er allerede signert, eller det finnes ingen publiserte vilkår.",
        }),
        { status: 400, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } },
      )
    }

    /** Test/staging: skip Signicat when BANKID_AUTO_ACCEPT=true */
    if (Deno.env.get("BANKID_AUTO_ACCEPT") === "true") {
      await supabaseAdmin.from("user_agreements").upsert(
        {
          user_id: userId,
          agreement_version: "1.0",
          signed_at: new Date().toISOString(),
          is_terminated: false,
          terminated_at: null,
          terminated_by_kommune: false,
        },
        { onConflict: "user_id, agreement_version" },
      )
      await supabaseAdmin.rpc("sync_terms_acceptance_after_sign", {
        p_user_id: userId,
        p_terms_document_id: docId,
      })
      await supabaseAdmin.from("audit_logs").insert({
        user_id: userId,
        action_type: "SIGN_TERMS_BANKID",
        details: { mode: "auto_accept_test", signingSessionId: "edge-bypass" },
      })
      const base = safeOrigin || SUPABASE_URL?.replace(/\/$/, "") || ""
      const cityQ = city?.trim() ? `&city=${encodeURIComponent(city.trim())}` : ""
      return new Response(
        JSON.stringify({
          url: `${base}/homeowner/sign-terms?signed=true${cityQ}`,
          autoAccept: true,
        }),
        { headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } },
      )
    }

    /**
     * To lag rate-limit på SIGN_INITIATED:
     *   1) Burst-vindu: max 8 starter per 15 min (beskytter mot spam-klikk og Signicat-kvote).
     *   2) Dagstak:     max 3 starter per 24 t per konto (produktkrav: begrens misbruk).
     */
    const burstWindowMs = 15 * 60 * 1000
    const burstMaxStarts = 8
    const dailyWindowMs = 24 * 60 * 60 * 1000
    const dailyMaxStarts = 3

    const burstSince = new Date(Date.now() - burstWindowMs).toISOString()
    const dailySince = new Date(Date.now() - dailyWindowMs).toISOString()

    const [{ count: burstCount, error: burstErr }, { count: dailyCount, error: dailyErr }] =
      await Promise.all([
        supabaseAdmin
          .from("audit_logs")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("action_type", "SIGN_INITIATED")
          .gte("created_at", burstSince),
        supabaseAdmin
          .from("audit_logs")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("action_type", "SIGN_INITIATED")
          .gte("created_at", dailySince),
      ])

    if (!dailyErr && (dailyCount ?? 0) >= dailyMaxStarts) {
      edgeLog("warn", "sign-agreement daily cap", { userId, dailyCount })
      return new Response(
        JSON.stringify({
          error: "Dagsgrense nådd",
          message:
            "Du har startet signering 3 ganger det siste døgnet. Prøv igjen i morgen, eller ta kontakt med kommunen hvis du trenger hjelp.",
        }),
        { status: 429, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } },
      )
    }

    if (!burstErr && (burstCount ?? 0) >= burstMaxStarts) {
      edgeLog("warn", "sign-agreement rate limited", { userId, burstCount })
      const kommuneId = await resolveKommuneIdFromCity(supabaseAdmin, city)
      await recordPlatformEvent(supabaseAdmin, {
        severity: "warn",
        source: "edge:sign-agreement",
        code: "SIGN_RATE_LIMITED",
        message: "Sign rate limit exceeded",
        userId,
        kommuneId,
        metadata: { burst_count: burstCount ?? 0 },
      })
      return new Response(
        JSON.stringify({
          error: "For mange forsøk",
          message: "Vent noen minutter før du prøver å signere på nytt.",
        }),
        { status: 429, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } },
      )
    }

    currentStep = "Logging"
    // signing_session_id settes etter Signicat-økt er opprettet (under).

    let pdfUrl = fallbackPdfUrl()
    let signTitle = "Vilkårsavtale Boligbank"

    if (docId && typeof docId === "string") {
      const { data: row } = await supabaseAdmin
        .from("terms_documents")
        .select("title, pdf_bucket, pdf_storage_path, approved_for_utleier_signing")
        .eq("id", docId)
        .maybeSingle()

      if (row && row.approved_for_utleier_signing !== true) {
        const kommuneId = await resolveKommuneIdFromCity(supabaseAdmin, city)
        await recordPlatformEvent(supabaseAdmin, {
          severity: "warn",
          source: "edge:sign-agreement",
          code: "SIGN_TERMS_NOT_APPROVED",
          message: "Terms document not approved for signing",
          userId,
          kommuneId,
          metadata: { terms_document_id: docId },
        })
        return new Response(
          JSON.stringify({
            error: "Signering ikke tilgjengelig",
            message:
              "Dette vilkårsdokumentet er ikke godkjent for utleiersignering ennå. Ta kontakt med kommunen eller prøv igjen senere.",
          }),
          { status: 400, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } },
        )
      }

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
          success: `${functionsHost}/sign-callback?userId=${encodeURIComponent(userId)}&origin=${encodeURIComponent(safeOrigin)}${cityParam}`,
          cancel: `${functionsHost}/sign-callback?status=cancel&userId=${encodeURIComponent(userId)}&origin=${encodeURIComponent(safeOrigin)}${cityParam}`,
          error: `${functionsHost}/sign-callback?status=error&userId=${encodeURIComponent(userId)}&origin=${encodeURIComponent(safeOrigin)}${cityParam}`,
        },
        ui: { language: signicatUiLang },
      }])
    })

    const sessionData = await sessionRes.json()
    edgeLog("info", "sign-agreement session response", { ok: sessionRes.ok })
    
    if (!sessionRes.ok) throw new Error(`Signerings-økt feilet: ${JSON.stringify(sessionData)}`)

    const sessionObj = Array.isArray(sessionData) ? sessionData[0] : sessionData
    const signatureUrl = sessionObj?.signatureUrl || sessionObj?.url
    const signingSessionId =
      typeof sessionObj?.id === "string" && sessionObj.id.trim() ? sessionObj.id.trim() : ""

    if (!signatureUrl) {
      throw new Error(`Fant ingen URL i svaret fra Signicat. Svar: ${JSON.stringify(sessionData)}`)
    }
    if (!signingSessionId) {
      throw new Error(`Fant ingen signing session id i svaret fra Signicat.`)
    }

    await supabaseAdmin.from("audit_logs").insert([
      {
        user_id: userId,
        action_type: "SIGN_INITIATED",
        details: {
          note: "rate_limit_burst_15m_daily_3",
          terms_document_id: docId,
          signing_session_id: signingSessionId,
          burst_count_before: burstCount ?? 0,
          daily_count_before: dailyCount ?? 0,
        },
      },
    ])

    const sessionParam = `&signingSessionId=${encodeURIComponent(signingSessionId)}`
    const redirectSettings = {
      success: `${functionsHost}/sign-callback?userId=${encodeURIComponent(userId)}&origin=${encodeURIComponent(safeOrigin)}${cityParam}${sessionParam}`,
      cancel: `${functionsHost}/sign-callback?status=cancel&userId=${encodeURIComponent(userId)}&origin=${encodeURIComponent(safeOrigin)}${cityParam}${sessionParam}`,
      error: `${functionsHost}/sign-callback?status=error&userId=${encodeURIComponent(userId)}&origin=${encodeURIComponent(safeOrigin)}${cityParam}${sessionParam}`,
    }
    const patchRes = await fetch(
      `https://api.signicat.com/sign/signing-sessions/${signingSessionId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ redirectSettings }),
      },
    )
    if (!patchRes.ok) {
      edgeLog("warn", "sign-agreement redirect patch failed", {
        status: patchRes.status,
        signingSessionId,
      })
    }

    return new Response(JSON.stringify({ url: signatureUrl }), {
      headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" }
    })

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    edgeLog("error", "sign-agreement", { step: currentStep, message })
    if (supabaseAdmin && userId) {
      const kommuneId = await resolveKommuneIdFromCity(supabaseAdmin, city)
      await recordPlatformEvent(supabaseAdmin, {
        severity: "error",
        source: "edge:sign-agreement",
        code: "SIGN_FAILED",
        message: `Sign failed at ${currentStep}`,
        userId,
        kommuneId,
        metadata: { step: currentStep, detail: message.slice(0, 200) },
      })
    }
    return new Response(JSON.stringify({
      error: `Feil under ${currentStep}`, 
      message 
    }), { 
      status: 400,
      headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" }
    })
  }
})
