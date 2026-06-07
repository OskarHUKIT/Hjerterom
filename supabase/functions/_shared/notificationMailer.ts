/**
 * Notification e-mail transport selection.
 *
 * Supabase Auth confirmation mail uses Custom SMTP (often Google Workspace) and
 * shows the Workspace profile photo in Gmail. Notification mail previously
 * preferred Mailjet REST when MAILJET_* was set, so Gmail showed a blank avatar.
 *
 * Default: use SMTP when configured (same path as Auth), else Mailjet REST.
 * Override: NOTIFICATION_MAILER=smtp | mailjet
 */

import nodemailer from "npm:nodemailer@6.9.10"
import { mailjetApiConfigured, sendMailjetTransactional } from "./mailjetSend.ts"

export type NotificationMailerKind = "smtp" | "mailjet"

export function getNotificationFromAddress(): string | null {
  return (
    Deno.env.get("NOTIFICATION_FROM_EMAIL")?.trim() ||
    Deno.env.get("SMTP_FROM")?.trim() ||
    null
  )
}

export function smtpConfigured(): boolean {
  const host = Deno.env.get("SMTP_HOSTNAME")?.trim()
  const user = Deno.env.get("SMTP_USERNAME")?.trim()
  const pass = Deno.env.get("SMTP_PASSWORD")?.trim()
  const from = getNotificationFromAddress()
  return !!(host && user && pass && from)
}

export function mailjetConfigured(): boolean {
  return mailjetApiConfigured() && !!getNotificationFromAddress()
}

/** Which transport to use; null if nothing is configured. */
export function resolveNotificationMailer(): NotificationMailerKind | null {
  const explicit = Deno.env.get("NOTIFICATION_MAILER")?.trim().toLowerCase()
  const hasSmtp = smtpConfigured()
  const hasMailjet = mailjetConfigured()

  if (explicit === "smtp") return hasSmtp ? "smtp" : hasMailjet ? "mailjet" : null
  if (explicit === "mailjet") return hasMailjet ? "mailjet" : hasSmtp ? "smtp" : null

  // Prefer SMTP so Google Workspace sender profile photos appear in Gmail (same as Auth mail).
  if (hasSmtp) return "smtp"
  if (hasMailjet) return "mailjet"
  return null
}

export type SendNotificationMailArgs = {
  fromName: string
  toEmail: string
  toName?: string
  subject: string
  textPart: string
  htmlPart: string
}

export async function sendViaNotificationMailer(
  args: SendNotificationMailArgs
): Promise<NotificationMailerKind> {
  const kind = resolveNotificationMailer()
  if (!kind) {
    throw new Error("No notification mailer configured (SMTP_* or MAILJET_*)")
  }

  const fromAddr = getNotificationFromAddress()
  if (!fromAddr) {
    throw new Error("NOTIFICATION_FROM_EMAIL or SMTP_FROM must be set")
  }

  if (kind === "mailjet") {
    await sendMailjetTransactional({
      fromEmail: fromAddr,
      fromName: args.fromName,
      toEmail: args.toEmail,
      toName: args.toName,
      subject: args.subject,
      textPart: args.textPart,
      htmlPart: args.htmlPart,
    })
    return "mailjet"
  }

  const host = Deno.env.get("SMTP_HOSTNAME")!.trim()
  const smtpUser = Deno.env.get("SMTP_USERNAME")!.trim()
  const smtpPass = Deno.env.get("SMTP_PASSWORD")!.trim()

  const transport = nodemailer.createTransport({
    host,
    port: Number(Deno.env.get("SMTP_PORT") ?? "587"),
    secure: (Deno.env.get("SMTP_SECURE") ?? "false").toLowerCase() === "true",
    requireTLS:
      (Deno.env.get("SMTP_SECURE") ?? "false").toLowerCase() !== "true" &&
      Number(Deno.env.get("SMTP_PORT") ?? "587") === 587,
    auth: { user: smtpUser, pass: smtpPass },
  })

  await new Promise<void>((resolve, reject) => {
    transport.sendMail(
      {
        from: `"${args.fromName}" <${fromAddr}>`,
        to: args.toEmail,
        subject: args.subject,
        text: args.textPart,
        html: args.htmlPart,
      },
      (err: Error | null) => (err ? reject(err) : resolve())
    )
  })

  return "smtp"
}
