import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { buildCorsHeaders, handleCorsOptions } from "../_shared/cors.ts"
import { edgeLog } from "../_shared/edgeLog.ts"
import { sendViaNotificationMailer } from "../_shared/notificationMailer.ts"

type OutboxRow = {
  id: string
  template: string
  recipient_email: string
  payload: Record<string, unknown>
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function buildGuestEmail(args: {
  template: string
  payload: Record<string, unknown>
  appBase: string
}): { subject: string; text: string; html: string } | null {
  const { template, payload, appBase } = args

  if (template === "los_confirmation") {
    const ref = String(payload.case_reference ?? "LOS")
    const name = String(payload.contact_name ?? "der")
    const kommune = payload.kommune_name ? ` (${payload.kommune_name})` : ""
    const subject = `Digital Los — saksnummer ${ref}`
    const body =
      `Hei ${name},\n\n` +
      `Samtalen din er overlevert til saksbehandler${kommune}. ` +
      `Referanse: ${ref}.\n\n` +
      `En saksbehandler tar kontakt så snart som mulig.\n\n` +
      `Hjerterum / Digital Los`
    const html = `<!DOCTYPE html><html lang="nb"><body style="font-family:sans-serif;line-height:1.5;color:#1e293b;">
<p>Hei ${escapeHtml(name)},</p>
<p>Samtalen din er overlevert til saksbehandler${escapeHtml(kommune)}. Referanse: <strong>${escapeHtml(ref)}</strong>.</p>
<p>En saksbehandler tar kontakt så snart som mulig.</p>
<p style="color:#64748b;font-size:13px;">Hjerterum · <a href="${encodeURI(appBase)}">${escapeHtml(appBase)}</a></p>
</body></html>`
    return { subject, text: body, html }
  }

  if (template === "booking_receipt" || template === "booking_accepted") {
    const name = String(payload.guest_name ?? "der")
    const address = String(payload.listing_address ?? "boligen")
    const checkIn = String(payload.check_in ?? "")
    const checkOut = String(payload.check_out ?? "")
    const amount = payload.amount_cents != null
      ? `${Math.round(Number(payload.amount_cents) / 100).toLocaleString("nb-NO")} kr`
      : null
    const bookingId = String(payload.booking_id ?? "")
    const subject = template === "booking_receipt" ? "Kvittering — Hjerterum booking" : "Booking bekreftet — Hjerterum"
    const lines = [
      `Hei ${name},`,
      "",
      template === "booking_receipt"
        ? "Takk for betalingen. Her er kvitteringen for oppholdet ditt."
        : "Bookingforespørselen din er godkjent.",
      "",
      `Bolig: ${address}`,
      checkIn && checkOut ? `Datoer: ${checkIn} – ${checkOut}` : "",
      amount ? `Beløp: ${amount}` : "",
      bookingId ? `Referanse: ${bookingId}` : "",
      "",
      `Se booking: ${appBase}/finn/mine?booking=${bookingId}`,
      "",
      "Hjerterum",
    ].filter(Boolean)
    const text = lines.join("\n")
    const html = `<!DOCTYPE html><html lang="nb"><body style="font-family:sans-serif;line-height:1.5;color:#1e293b;">
<p>Hei ${escapeHtml(name)},</p>
<p>${escapeHtml(template === "booking_receipt" ? "Takk for betalingen." : "Bookingforespørselen din er godkjent.")}</p>
<ul>
<li><strong>Bolig:</strong> ${escapeHtml(address)}</li>
${checkIn && checkOut ? `<li><strong>Datoer:</strong> ${escapeHtml(checkIn)} – ${escapeHtml(checkOut)}</li>` : ""}
${amount ? `<li><strong>Beløp:</strong> ${escapeHtml(amount)}</li>` : ""}
${bookingId ? `<li><strong>Referanse:</strong> ${escapeHtml(bookingId)}</li>` : ""}
</ul>
<p><a href="${encodeURI(`${appBase}/finn/mine?booking=${bookingId}`)}">Åpne booking</a></p>
</body></html>`
    return { subject, text, html }
  }

  return null
}

serve(async (req) => {
  const preflight = handleCorsOptions(req)
  if (preflight) return preflight

  const cronSecret = Deno.env.get("CRON_SECRET")?.trim()
  if (cronSecret) {
    const bearer = req.headers.get("authorization")
    const headerOk = bearer === `Bearer ${cronSecret}`
    const alt = req.headers.get("x-cron-secret") === cronSecret
    if (!headerOk && !alt) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
      })
    }
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!supabaseUrl?.trim() || !serviceKey?.trim()) {
    return new Response(JSON.stringify({ error: "Missing Supabase configuration" }), {
      status: 500,
      headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
    })
  }

  const supabase = createClient(supabaseUrl, serviceKey)
  const appBase = (Deno.env.get("NOTIFICATION_APP_BASE_URL") ?? "https://hjerterum.no").replace(/\/$/, "")
  const fromName = Deno.env.get("NOTIFICATION_FROM_NAME")?.trim() || "Hjerterum"

  const { data: rows, error } = await supabase
    .from("guest_email_outbox")
    .select("id, template, recipient_email, payload")
    .is("sent_at", null)
    .order("created_at", { ascending: true })
    .limit(25)

  if (error) {
    edgeLog("error", "process-guest-email-outbox fetch failed", { message: error.message })
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
    })
  }

  let sent = 0
  let skipped = 0

  for (const row of (rows ?? []) as OutboxRow[]) {
    const built = buildGuestEmail({ template: row.template, payload: row.payload ?? {}, appBase })
    if (!built) {
      skipped += 1
      continue
    }

    try {
      await sendViaNotificationMailer({
        fromName,
        toEmail: row.recipient_email,
        subject: built.subject,
        textPart: built.text,
        htmlPart: built.html,
      })
      await supabase
        .from("guest_email_outbox")
        .update({ sent_at: new Date().toISOString() })
        .eq("id", row.id)
      sent += 1
    } catch (e) {
      edgeLog("warn", "process-guest-email-outbox send failed", {
        id: row.id,
        message: e instanceof Error ? e.message : String(e),
      })
    }
  }

  return new Response(JSON.stringify({ ok: true, sent, skipped, pending: (rows ?? []).length - sent - skipped }), {
    headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
  })
})
