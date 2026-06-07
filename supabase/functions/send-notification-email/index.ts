import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import nodemailer from "npm:nodemailer@6.9.10"
import { buildCorsHeaders, handleCorsOptions } from "../_shared/cors.ts"
import { edgeLog } from "../_shared/edgeLog.ts"
import { recordPlatformEvent } from "../_shared/recordPlatformEvent.ts"
import { mailjetApiConfigured, sendMailjetTransactional } from "../_shared/mailjetSend.ts"
import { notificationWebhookPayloadSchema } from "../_shared/webhookSchemas.ts"

type NotificationRecord = {
  id: string
  owner_id: string
  type?: string
  title: string
  message: string
  status?: string
  listing_id?: string
  related_user_id?: string
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/** Normalizes legacy mixed-case brand from env/dashboard to canonical “Boly”. */
function normalizeBrandSpelling(s: string): string {
  const legacy = ["Bo", "Ly"].join("")
  return s.replace(new RegExp(`\\b${legacy}\\b`, "g"), "Boly")
}

type EmailLocale = "no" | "se" | "en"

function normalizeEmailLocale(raw: string | null | undefined): EmailLocale {
  const t = typeof raw === "string" ? raw.trim().toLowerCase() : ""
  if (t === "se" || t === "en" || t === "no") return t
  return "no"
}

/** Språk: først profiles.preferred_locale, deretter user_metadata (synk fra app). */
function resolveEmailLocale(
  profile: { preferred_locale?: string | null } | null | undefined,
  user: { user_metadata?: Record<string, unknown> } | undefined
): EmailLocale {
  const p = profile?.preferred_locale
  if (typeof p === "string" && p.trim() !== "") {
    return normalizeEmailLocale(p)
  }
  const m = user?.user_metadata
  if (!m || typeof m !== "object") return "no"
  const fromMeta = m.preferred_locale ?? m.locale
  if (typeof fromMeta === "string" && fromMeta.trim() !== "") {
    return normalizeEmailLocale(fromMeta)
  }
  return "no"
}

function anonymousGreetingName(locale: EmailLocale): string {
  if (locale === "en") return "there"
  if (locale === "se") return "dušše"
  return "der"
}

function greetingName(
  user: { user_metadata?: Record<string, unknown>; email?: string } | undefined,
  locale: EmailLocale
): string {
  const full = user?.user_metadata?.full_name
  if (typeof full === "string" && full.trim()) {
    const first = full.trim().split(/\s+/)[0]
    if (first) return first
  }
  const em = user?.email?.split("@")[0]
  return em && em.length > 0 ? em : anonymousGreetingName(locale)
}

function isMessageNotificationType(type: string | undefined): boolean {
  const t = (type || "").trim().toUpperCase()
  return t === "NEW_MESSAGE" || t === "MESSAGE"
}

const MAX_BODY_CHARS = 8000

function truncateBody(s: string): string {
  if (s.length <= MAX_BODY_CHARS) return s
  return s.slice(0, MAX_BODY_CHARS).trimEnd() + "\n\n[…]"
}

type EmailStrings = {
  introOther: string
  listingLabel: string
  openInBoly: string
  linkPlain: string
  footer: string
  greetingWord: string
  allNotifications: string
  preheaderSuffix: string
}

const EMAIL_COPY: Record<EmailLocale, EmailStrings> = {
  no: {
    introOther: "Her er innholdet i varselet.",
    listingLabel: "Bolig",
    openInBoly: "Åpne i Boly",
    linkPlain: "Lenke:",
    footer:
      "Du får denne e-posten fordi e-postvarsler er på i Boly (Varsler). Slå av i appen om du ikke vil ha dem.",
    greetingWord: "Hei",
    allNotifications: "Alle varsler",
    preheaderSuffix: "— Boly",
  },
  se: {
    introOther: "Dás lea dieđu sisdoallu.",
    listingLabel: "Dávir",
    openInBoly: "Raba Bolys",
    linkPlain: "Liŋka:",
    footer:
      "Oaččut dán go e-poasta-dieđut leat čállon Bolys. Sáhttát heaitit appas.",
    greetingWord: "Bures",
    allNotifications: "Buot dieđut",
    preheaderSuffix: "— Boly",
  },
  en: {
    introOther: "Here’s what the notification says.",
    listingLabel: "Property",
    openInBoly: "Open in Boly",
    linkPlain: "Link:",
    footer: "You’re getting this because email notifications are on in Boly. Turn them off under Notifications if you prefer.",
    greetingWord: "Hi",
    allNotifications: "All notifications",
    preheaderSuffix: "— Boly",
  },
}

/** Statiske titler (norsk / engelsk / nordsamisk) — samme innhold, ett språk i hele e-posten. */
const TITLE_TRIPLES: readonly { no: string; en: string; se: string }[] = [
  { no: "Bolig formidlet", en: "Listing mediated", se: "Dávir lea formidleren" },
  { no: "Formidlingsperiode forlenget", en: "Mediation period extended", se: "Formidlingsáigi lea guhkán" },
  { no: "Ny bolig registrert", en: "New listing registered", se: "Ođđa dávir lea registrerejuvvon" },
  { no: "Fyll ut fakturagrunnlag", en: "Fill in invoice basis", se: "Dievát fakturagrunnlag" },
  { no: "Haster: Overtakelsesrapport mangler", en: "Urgent: Handover report missing", se: "Hástalaš: Overtakelsesraporta váilot" },
  { no: "Vilkårsavtale signert", en: "Terms agreement signed", se: "Eaktavuohta lea vuolláičáhppan" },
  { no: "Melding fra kommune", en: "Message from municipality", se: "Sáhcastallan kommuvdnas" },
]

function titleInLocale(raw: string, locale: EmailLocale): string {
  const t = raw.trim()
  for (const row of TITLE_TRIPLES) {
    if (t === row.no || t === row.en || t === row.se) {
      return row[locale]
    }
  }
  const mNo = t.match(/^Ny melding fra (.+)$/i)
  const mEn = t.match(/^New message from (.+)$/i)
  const mNy = mNo || mEn
  if (mNy) {
    const name = mNy[1].trim()
    if (locale === "no") return `Ny melding fra ${name}`
    if (locale === "en") return `New message from ${name}`
    return `Ođđa sáhka ${name}`
  }
  return t
}

const MEDIATION_NOTE_SEP = {
  no: "\n\nMelding fra kommunen:\n",
  en: "\n\nMessage from the municipality:\n",
  se: "\n\nSáhcastallan kommuvdnas:\n",
}

/** Deler av varsel som har merknad fra kommune (først hovedtekst, så merknad). */
const NOTE_SPLIT = /\n\n(?:Melding fra kommunen:|Message from the municipality:|Sáhcastallan kommuvdnas):\n/

function mediationSepFor(locale: EmailLocale): string {
  if (locale === "en") return MEDIATION_NOTE_SEP.en
  if (locale === "se") return MEDIATION_NOTE_SEP.se
  return MEDIATION_NOTE_SEP.no
}

/**
 * Oversetter kjente systemtekster i varselmeldingen til mottakers språk.
 * Fritekst (f.eks. chat) etter «Navn:» beholdes som den er.
 */
function localizeMessageBaseOnly(s: string, locale: EmailLocale): string {
  if (locale === "no") return s

  if (locale === "en") {
    let x = s
    x = x
      .replace(/ har sendt en melding til Kommune\./g, " sent a message to the municipality.")
      .replace(/ har sendt deg en melding\./g, " sent you a message.")
      .replace(/ sendte et bilde\./g, " sent a picture.")
      .replace(/\(Bilde vedlagt\)/g, "(Image attached)")
    x = x.replace(
      /^(.+?) har registrert en ny bolig i (.+): (.+)$/m,
      "$1 registered a new property in $2: $3"
    )
    x = x.replace(/^(.+?) har signert vilkårsavtalen\.$/m, "$1 signed the terms agreement.")
    x = x.replace(
      /^Kommunen har forlenget formidlingsperioden for (.+?) til (.+?)\.$/m,
      "The municipality has extended the mediation period for $1 to $2."
    )
    x = x.replace(
      /^Kommunen har markert boligen din i (.+?) som formidlet for perioden (.+?)–(.+?)\. Lever overtakelsesrapport ved overtakelse – klikk for å åpne skjema\.$/m,
      "The municipality has marked your property at $1 as mediated for the period $2–$3. Submit a handover report on takeover – click to open the form."
    )
    x = x.replace(
      /^Boligen din i (.+?) er markert som formidlet for perioden (.+?)–(.+?)\. Lever overtakelsesrapport ved overtakelse – klikk for å åpne skjema\.$/m,
      "Your property at $1 has been marked as mediated for the period $2–$3. Submit a handover report on takeover – click to open the form."
    )
    x = x.replace(
      /^Du valgte utbetaling til konto for boligen i (.+?)\. Fyll ut fakturagrunnlaget i Boly slik at kommunen kan behandle utbetalingen\. Bruk knappen under for å åpne skjemaet\.$/m,
      "You chose payment to account for the property at $1. Fill in the invoice basis in Boly so the municipality can process the payment. Use the button below to open the form."
    )
    x = x.replace(
      /^BOLIGEN BLIR FORMIDLET I MORGEN\. Du må levere overtakelsesrapport for (.+?) før overtakelsen starter\.$/m,
      "THE PROPERTY IS MEDIATED TOMORROW. You must submit a handover report for $1 before the takeover starts."
    )
    x = x.replace(
      /^Kommunen har bedt om ny overtakelsesrapport\. Se meldinger\.$/m,
      "The municipality has requested a new handover report. See messages."
    )
    x = x.replace(/^Kommunen: /m, "The municipality: ")
    return x
  }

  let x = s
  x = x
    .replace(/ har sendt en melding til Kommune\./g, " lea sádden sáhka kommuvdnii.")
    .replace(/ har sendt deg en melding\./g, " lea sádden dutnje sáhka.")
    .replace(/ sendte et bilde\./g, " sáddii gova.")
    .replace(/\(Bilde vedlagt\)/g, "(Govva mielddis)")
  x = x.replace(
    /^(.+?) har registrert en ny bolig i (.+): (.+)$/m,
    "$1 lea registreren ođđa dáviri $2:s: $3"
  )
  x = x.replace(/^(.+?) har signert vilkårsavtalen\.$/m, "$1 lea vuolláičáhppan eaktavuođa.")
  x = x.replace(
    /^Kommunen har forlenget formidlingsperioden for (.+?) til (.+?)\.$/m,
    "Kommuvdna lea guhkit formidlingsáiggi $1:s gitta $2."
  )
  x = x.replace(
    /^Kommunen har markert boligen din i (.+?) som formidlet for perioden (.+?)–(.+?)\. Lever overtakelsesrapport ved overtakelse – klikk for å åpne skjema\.$/m,
    "Kommuvdna lea merken du dávira $1:s formidleren áigodagas $2–$3. Buovdde overtakelsesraporta go lea áigi – deaddil rabastit skovváža."
  )
  x = x.replace(
    /^Boligen din i (.+?) er markert som formidlet for perioden (.+?)–(.+?)\. Lever overtakelsesrapport ved overtakelse – klikk for å åpne skjema\.$/m,
    "Du dávir $1:s lea merken formidleren áigodagas $2–$3. Buovdde overtakelsesraporta go lea áigi – deaddil rabastit skovváža."
  )
  x = x.replace(
    /^Du valgte utbetaling til konto for boligen i (.+?)\. Fyll ut fakturagrunnlaget i Boly slik at kommunen kan behandle utbetalingen\. Bruk knappen under for å åpne skjemaet\.$/m,
    "Válljet máksima kontoi dávirii $1:s. Dievát fakturagrunnlag Bolys vai kommuvdna sáhttá gieđahallat máksima. Geavat boksa vuolležis rabastit skovváža."
  )
  x = x.replace(
    /^BOLIGEN BLIR FORMIDLET I MORGEN\. Du må levere overtakelsesrapport for (.+?) før overtakelsen starter\.$/m,
    "DÁVIR LEAT FORMIDLEREN IČČÁŽAN. Don fertet buovdát overtakelsesraporta $1:s ovdal go váldin álgá."
  )
  x = x.replace(
    /^Kommunen har bedt om ny overtakelsesrapport\. Se meldinger\.$/m,
    "Kommuvdna lea bivdán ođđa overtakelsesraporta. Geahča sáhkavuoruid."
  )
  x = x.replace(/^Kommunen: /m, "Kommuvdna: ")
  return x
}

function localizeMessageBody(raw: string, locale: EmailLocale): string {
  const parts = raw.split(NOTE_SPLIT)
  if (parts.length === 2) {
    const sep = mediationSepFor(locale)
    return `${localizeMessageBaseOnly(parts[0], locale)}${sep}${parts[1]}`
  }
  return localizeMessageBaseOnly(raw, locale)
}

function localizeNotificationStrings(
  title: string,
  message: string,
  locale: EmailLocale
): { title: string; message: string } {
  return {
    title: titleInLocale(title, locale),
    message: localizeMessageBody(message, locale),
  }
}

function buildEmailContent(args: {
  locale: EmailLocale
  title: string
  message: string
  link: string
  appBase: string
  listingLine: string | null
  recipientFirstName: string
  supportEmail: string
  notifType?: string
}): { text: string; html: string; subject: string } {
  const { locale, title, message, link, appBase, listingLine, recipientFirstName, supportEmail, notifType } = args
  const c = EMAIL_COPY[locale]
  const isMsg = isMessageNotificationType(notifType)
  const body = truncateBody((message || "").trim() || "—")
  const msgHtml = escapeHtml(body).replace(/\n/g, "<br/>")
  const subject = `Boly: ${title}`.slice(0, 200)
  const preheader = `${title} ${c.preheaderSuffix}`.slice(0, 140)
  const lang = locale === "en" ? "en" : locale === "se" ? "se" : "nb"

  const textLines: string[] = [
    `${c.greetingWord} ${recipientFirstName},`,
    "",
  ]
  if (!isMsg) {
    textLines.push(c.introOther, "")
  }
  textLines.push(title, "", body, "")
  if (listingLine) {
    textLines.push(`${c.listingLabel}: ${listingLine}`, "")
  }
  textLines.push(
    `${c.openInBoly}: ${link}`,
    "",
    `${c.allNotifications}: ${appBase}/nav/notifications`,
    "",
    c.footer,
    "",
    supportEmail
  )
  const text = textLines.join("\n")

  const introHtml = isMsg
    ? ""
    : `<p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#475569;">${escapeHtml(c.introOther)}</p>`

  const listingHtml = listingLine
    ? `<p style="margin:16px 0 0;font-size:14px;line-height:1.5;color:#334155;"><strong>${escapeHtml(c.listingLabel)}:</strong> ${escapeHtml(listingLine)}</p>`
    : ""

  const html = `<!DOCTYPE html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:24px 12px;background:#eef1f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:16px;line-height:1.55;color:#1e293b;">
  <div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #d8dee6;border-radius:4px;">
    <tr><td style="padding:22px 22px 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <p style="margin:0 0 6px;font-size:13px;color:#64748b;">Boly</p>
      <h1 style="margin:0 0 14px;font-size:18px;font-weight:600;color:#0f172a;line-height:1.3;">${escapeHtml(title)}</h1>
      <p style="margin:0 0 14px;font-size:15px;color:#334155;">${escapeHtml(c.greetingWord)} ${escapeHtml(recipientFirstName)},</p>
      ${introHtml}
      <div style="padding:12px 14px;background:#f8fafc;border-left:3px solid #94a3b8;margin:0 0 16px;font-size:15px;color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${msgHtml}</div>
      ${listingHtml}
      <p style="margin:20px 0 12px;font-size:15px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <a href="${encodeURI(link)}" style="color:#0f766e;font-weight:600;">${escapeHtml(c.openInBoly)}</a>
      </p>
      <p style="margin:0 0 18px;font-size:12px;word-break:break-all;color:#64748b;font-family:ui-monospace,Menlo,Consolas,monospace;">${escapeHtml(c.linkPlain)} ${escapeHtml(link)}</p>
      <p style="margin:0;font-size:12px;line-height:1.5;color:#64748b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        ${escapeHtml(c.footer)}
        <a href="mailto:${escapeHtml(supportEmail)}" style="color:#0f766e;">${escapeHtml(supportEmail)}</a>
        · <a href="${encodeURI(`${appBase}/nav/notifications`)}" style="color:#0f766e;">${escapeHtml(c.allNotifications)}</a>
      </p>
    </td></tr>
  </table>
</body></html>`

  return { text, html, subject }
}

serve(async (req) => {
  const preflight = handleCorsOptions(req)
  if (preflight) return preflight

  try {
    let raw: unknown
    try {
      raw = await req.json()
    } catch (e) {
      edgeLog("warn", "send-notification-email invalid JSON", {
        message: e instanceof Error ? e.message : String(e),
      })
      return new Response(
        JSON.stringify({ error: "Invalid JSON body. Use Content-Type: application/json and valid JSON." }),
        { status: 400, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } }
      )
    }

    const parsed = notificationWebhookPayloadSchema.safeParse(raw)
    if (!parsed.success) {
      edgeLog("warn", "send-notification-email validation", { issues: parsed.error.flatten() })
      return new Response(
        JSON.stringify({ error: "Invalid webhook payload", issues: parsed.error.flatten() }),
        { status: 400, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } }
      )
    }
    const payload = parsed.data

    const evtType = typeof payload.type === "string" ? payload.type.toUpperCase() : ""
    const tbl = payload.table
    edgeLog("info", "send-notification-email received", {
      method: req.method,
      table: tbl,
      type: payload.type,
      normalizedType: evtType,
    })

    if (tbl !== "notifications" || evtType !== "INSERT") {
      edgeLog("info", "send-notification-email skip", {
        reason: "not a notification INSERT",
        table: tbl,
        type: payload.type,
      })
      return new Response(
        JSON.stringify({ ok: true, skipped: "not a notification insert" }),
        { headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } }
      )
    }

    const record = payload.record
    const ownerId = record.owner_id

    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    if (!supabaseUrl || !serviceKey) {
      console.error("send-notification-email missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env")
      return new Response(
        JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }),
        { status: 500, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } }
      )
    }

    const supabase = createClient(supabaseUrl, serviceKey)

    const { data: profile } = await supabase
      .from("profiles")
      .select("email_notifications_enabled, preferred_locale")
      .eq("id", ownerId)
      .maybeSingle()

    if (profile?.email_notifications_enabled !== true) {
      console.log(
        "send-notification-email skip:",
        JSON.stringify({ ownerId, reason: "email_notifications_enabled is false or no profile row" })
      )
      return new Response(
        JSON.stringify({ ok: true, skipped: "email_notifications_enabled is false" }),
        { headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } }
      )
    }

    const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(ownerId)
    const to = userData?.user?.email?.trim()
    if (userErr || !to) {
      console.log(
        "send-notification-email skip:",
        JSON.stringify({ ownerId, reason: "no recipient email", userErr: userErr?.message })
      )
      await recordPlatformEvent(supabase, {
        severity: "warn",
        source: "edge:send-notification-email",
        code: "EMAIL_RECIPIENT_MISSING",
        message: "Notification email skipped: no recipient",
        userId: ownerId,
        metadata: { notification_type: record.type },
      })
      return new Response(
        JSON.stringify({ ok: true, skipped: "no recipient email" }),
        { headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } }
      )
    }

    const host = Deno.env.get("SMTP_HOSTNAME")
    const smtpUser = Deno.env.get("SMTP_USERNAME")
    const smtpPass = Deno.env.get("SMTP_PASSWORD")
    /** Verified sender in Mailjet (domain + address). */
    const fromAddr =
      Deno.env.get("NOTIFICATION_FROM_EMAIL")?.trim() ||
      Deno.env.get("SMTP_FROM")?.trim() ||
      null

    const hasMailjet = mailjetApiConfigured() && !!fromAddr
    const hasSmtp = !!(host && smtpUser && smtpPass && fromAddr)

    if (!hasMailjet && !hasSmtp) {
      console.warn(
        "send-notification-email: set MAILJET_API_KEY + MAILJET_SECRET_KEY + NOTIFICATION_FROM_EMAIL (or SMTP_FROM), or full SMTP_* for Mailjet SMTP"
      )
      await recordPlatformEvent(supabase, {
        severity: "warn",
        source: "edge:send-notification-email",
        code: "MAILER_SKIPPED",
        message: "Notification email skipped: no mailer configured",
        userId: ownerId,
        metadata: { notification_type: record.type },
      })
      return new Response(
        JSON.stringify({
          ok: true,
          skipped: "no mailer configured (Mailjet API or SMTP_*)",
        }),
        { headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } }
      )
    }

    const fromName = normalizeBrandSpelling(
      Deno.env.get("NOTIFICATION_FROM_NAME") ?? "Boly"
    ).replace(/"/g, "'")
    const appBase = (Deno.env.get("NOTIFICATION_APP_BASE_URL") ?? "https://bolynorge.no").replace(/\/$/, "")

    const title = record.title || "Boly"
    const message = record.message || ""
    const path = record.listing_id ? `/listings/${record.listing_id}` : "/nav/notifications"
    const link = `${appBase}${path}`

    let listingLine: string | null = null
    if (record.listing_id) {
      const { data: listing } = await supabase
        .from("listings")
        .select("address, city")
        .eq("id", record.listing_id)
        .maybeSingle()
      if (listing) {
        const parts = [listing.address, listing.city].filter(
          (x): x is string => typeof x === "string" && x.trim() !== ""
        )
        if (parts.length) listingLine = parts.join(", ")
      }
    }

    const supportEmail = (Deno.env.get("NOTIFICATION_SUPPORT_EMAIL") ?? "info@bolynorge.no").trim()
    const emailLocale = resolveEmailLocale(profile, userData?.user)
    const recipientFirstName = greetingName(userData?.user, emailLocale)

    console.log(
      "send-notification-email locale:",
      JSON.stringify({
        locale: emailLocale,
        profileLocale: profile?.preferred_locale ?? null,
        metaLocale: userData?.user?.user_metadata?.preferred_locale ?? null,
      })
    )

    const { title: emailTitle, message: emailMessage } = localizeNotificationStrings(title, message, emailLocale)

    const { text: textBody, html: htmlBody, subject: emailSubject } = buildEmailContent({
      locale: emailLocale,
      title: emailTitle,
      message: emailMessage,
      link,
      appBase,
      listingLine,
      recipientFirstName,
      supportEmail,
      notifType: record.type,
    })

    if (hasMailjet) {
      await sendMailjetTransactional({
        fromEmail: fromAddr!,
        fromName,
        toEmail: to,
        subject: emailSubject,
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
            subject: emailSubject,
            text: textBody,
            html: htmlBody,
          },
          (err: Error | null) => (err ? reject(err) : resolve())
        )
      })
    }

    const masked = to.replace(/^(.{2}).+(@.+)$/, "$1***$2")
    console.log(
      "send-notification-email sent:",
      JSON.stringify({ to: masked, via: hasMailjet ? "mailjet" : "smtp", locale: emailLocale })
    )
    return new Response(
      JSON.stringify({ ok: true, sent: true, to: masked, via: hasMailjet ? "mailjet" : "smtp", locale: emailLocale }),
      { headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } }
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("send-notification-email error:", msg)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    if (supabaseUrl && serviceKey) {
      const supabaseAdmin = createClient(supabaseUrl, serviceKey)
      await recordPlatformEvent(supabaseAdmin, {
        severity: "error",
        source: "edge:send-notification-email",
        code: "EMAIL_SEND_FAILED",
        message: "Notification email send failed",
        metadata: { detail: msg.slice(0, 200) },
      })
    }
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } }
    )
  }
})
