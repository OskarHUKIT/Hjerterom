/**
 * Mailjet REST API v3.1 (transactional send). Uses API key + secret (Basic auth).
 * @see https://dev.mailjet.com/email/reference/v3/send/
 */

export type MailjetTransactionalArgs = {
  fromEmail: string
  fromName: string
  toEmail: string
  toName?: string
  subject: string
  textPart: string
  htmlPart: string
}

export function mailjetApiConfigured(): boolean {
  const k = Deno.env.get("MAILJET_API_KEY")?.trim()
  const s = Deno.env.get("MAILJET_SECRET_KEY")?.trim()
  return !!(k && s)
}

export async function sendMailjetTransactional(args: MailjetTransactionalArgs): Promise<void> {
  const apiKey = Deno.env.get("MAILJET_API_KEY")?.trim()
  const apiSecret = Deno.env.get("MAILJET_SECRET_KEY")?.trim()
  if (!apiKey || !apiSecret) {
    throw new Error("MAILJET_API_KEY and MAILJET_SECRET_KEY must be set")
  }
  const auth = btoa(`${apiKey}:${apiSecret}`)
  const toName =
    args.toName?.trim() ||
    args.toEmail.split("@")[0] ||
    "Recipient"

  const body = {
    Messages: [
      {
        From: { Email: args.fromEmail, Name: args.fromName },
        To: [{ Email: args.toEmail, Name: toName }],
        Subject: args.subject,
        TextPart: args.textPart,
        HTMLPart: args.htmlPart,
      },
    ],
  }

  const r = await fetch("https://api.mailjet.com/v3.1/send", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  const resText = await r.text()
  if (!r.ok) {
    console.error("Mailjet error:", r.status, resText)
    throw new Error(`Mailjet ${r.status}: ${resText}`)
  }
}
