import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { z } from "https://esm.sh/zod@3.23.8"
import nodemailer from "npm:nodemailer@6.9.10"
import { assertAllowedBrowserOrigin, buildCorsHeaders, handleCorsOptions } from "../_shared/cors.ts"
import { edgeLog } from "../_shared/edgeLog.ts"
import { recordPlatformEvent } from "../_shared/recordPlatformEvent.ts"
import { mailjetApiConfigured, sendMailjetTransactional } from "../_shared/mailjetSend.ts"

const bodySchema = z.object({
  terms_document_id: z.string().uuid(),
})

function normalizeBrandSpelling(s: string): string {
  const legacy = ["Bo", "Ly"].join("")
  return s.replace(new RegExp(`\\b${legacy}\\b`, "g"), "Boly")
}

serve(async (req) => {
  const preflight = handleCorsOptions(req)
  if (preflight) return preflight

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
      })
    }

    const originDenied = assertAllowedBrowserOrigin(req)
    if (originDenied) return originDenied

    const raw = await req.text()
    let json: unknown = {}
    try {
      json = raw ? JSON.parse(raw) : {}
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
      })
    }

    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Validation failed", issues: parsed.error.flatten() }),
        { status: 400, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } }
      )
    }

    const { terms_document_id } = parsed.data

    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    if (!supabaseUrl || !serviceKey) {
      console.error("notify-terms-central-review: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
      })
    }

    const supabase = createClient(supabaseUrl, serviceKey)
    const { data: row, error: rowErr } = await supabase
      .from("terms_documents")
      .select("id, title, version, kommune_region, approved_for_utleier_signing, created_at")
      .eq("id", terms_document_id)
      .maybeSingle()

    if (rowErr || !row) {
      edgeLog("warn", "notify-terms-central-review: document not found", {
        terms_document_id,
        message: rowErr?.message,
      })
      return new Response(JSON.stringify({ ok: false, error: "Document not found" }), {
        status: 404,
        headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
      })
    }

    if (row.approved_for_utleier_signing === true) {
      return new Response(JSON.stringify({ ok: true, skipped: "already approved" }), {
        headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
      })
    }

    const to =
      (Deno.env.get("CENTRAL_TERMS_INBOX") ?? "info@bolynorge.no").trim() || "info@bolynorge.no"
    const host = Deno.env.get("SMTP_HOSTNAME")
    const smtpUser = Deno.env.get("SMTP_USERNAME")
    const smtpPass = Deno.env.get("SMTP_PASSWORD")
    const fromAddr =
      Deno.env.get("NOTIFICATION_FROM_EMAIL")?.trim() ||
      Deno.env.get("SMTP_FROM")?.trim() ||
      null

    const hasMailjet = mailjetApiConfigured() && !!fromAddr
    const hasSmtp = !!(host && smtpUser && smtpPass && fromAddr)

    if (!hasMailjet && !hasSmtp) {
      console.warn(
        "notify-terms-central-review: no mailer configured (MAILJET_API_KEY + MAILJET_SECRET_KEY + NOTIFICATION_FROM_EMAIL or SMTP_*)"
      )
      await recordPlatformEvent(supabase, {
        severity: "warn",
        source: "edge:notify-terms",
        code: "MAILER_SKIPPED",
        message: "Terms review email skipped: no mailer configured",
        metadata: { terms_document_id: row.id },
      })
      return new Response(
        JSON.stringify({ ok: true, skipped: "no mailer configured" }),
        { headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } }
      )
    }

    const fromName = normalizeBrandSpelling(Deno.env.get("NOTIFICATION_FROM_NAME") ?? "Boly").replace(
      /"/g,
      "'"
    )
    const subject = `Nytt vilkårsdokument venter sentral godkjenning (v${row.version})`
    const regionLine =
      row.kommune_region && String(row.kommune_region).trim()
        ? `Område: ${String(row.kommune_region).trim()}`
        : "Område: (global / ikke satt)"
    const opsBase = (Deno.env.get("NOTIFICATION_APP_BASE_URL") ?? "https://bolynorge.no").replace(
      /\/$/,
      ""
    )
    const approveHint = `Godkjennelse: Logg inn som plattformoperatør på ${opsBase}/ops/terms og godkjenn dokumentet der (eller bruk SQL Editor som fallback).`
    const textBody = [
      "Hei,",
      "",
      "En kommune har lastet opp et nytt vilkårsdokument som venter sentral godkjenning før det brukes for utleieres BankID-signering.",
      "",
      `Tittel: ${row.title ?? "(uten tittel)"}`,
      `Versjon: ${row.version}`,
      regionLine,
      `Dokument-ID: ${row.id}`,
      "",
      approveHint,
      "",
      "— Boly",
    ].join("\n")

    const htmlBody = `<p>Hei,</p>
<p>En kommune har lastet opp et nytt vilkårsdokument som venter <strong>sentral godkjenning</strong> før det brukes for utleieres BankID-signering.</p>
<ul>
<li><strong>Tittel:</strong> ${escapeHtml(String(row.title ?? ""))}</li>
<li><strong>Versjon:</strong> ${escapeHtml(String(row.version))}</li>
<li><strong>${escapeHtml(regionLine)}</strong></li>
<li><strong>Dokument-ID:</strong> <code>${escapeHtml(String(row.id))}</code></li>
</ul>
<p>${escapeHtml(approveHint)}</p>
<p>— Boly</p>`

    if (hasMailjet) {
      await sendMailjetTransactional({
        fromEmail: fromAddr!,
        fromName,
        toEmail: to,
        subject,
        textPart: textBody,
        htmlPart: htmlBody,
      })
    } else {
      const transport = nodemailer.createTransport({
        host: host!,
        port: Number(Deno.env.get("SMTP_PORT") ?? "587"),
        secure: (Deno.env.get("SMTP_SECURE") ?? "false").toLowerCase() === "true",
        requireTLS: (Deno.env.get("SMTP_SECURE") ?? "false").toLowerCase() !== "true" &&
          Number(Deno.env.get("SMTP_PORT") ?? "587") === 587,
        auth: { user: smtpUser!, pass: smtpPass! },
      })
      await new Promise<void>((resolve, reject) => {
        transport.sendMail(
          {
            from: `"${fromName}" <${fromAddr}>`,
            to,
            subject,
            text: textBody,
            html: htmlBody,
          },
          (err: Error | null) => (err ? reject(err) : resolve())
        )
      })
    }

    edgeLog("info", "notify-terms-central-review sent", { to, terms_document_id })
    return new Response(JSON.stringify({ ok: true, sent: true }), {
      headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("notify-terms-central-review error:", msg)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    if (supabaseUrl && serviceKey) {
      const supabaseAdmin = createClient(supabaseUrl, serviceKey)
      await recordPlatformEvent(supabaseAdmin, {
        severity: "error",
        source: "edge:notify-terms",
        code: "NOTIFY_TERMS_FAILED",
        message: "Terms review notification failed",
        metadata: { detail: msg.slice(0, 200) },
      })
    }
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
    })
  }
})

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
