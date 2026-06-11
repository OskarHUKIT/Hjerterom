const CLIENT_ID =
  Deno.env.get("SIGNICAT_CLIENT_ID_SIGN")?.trim() || "sandbox-misty-angle-164"
const CLIENT_SECRET = Deno.env.get("SIGNICAT_SECRET_SIGN")?.trim()

export type SignicatSigningSession = {
  id?: string
  externalReference?: string
  lifecycle?: { state?: string; stateIsFinal?: boolean }
  output?: { signatures?: unknown[]; packages?: unknown[] }
}

export async function getSignicatSignAccessToken(): Promise<string> {
  if (!CLIENT_SECRET) {
    throw new Error("SIGNICAT_SECRET_SIGN mangler")
  }
  const tokenRes = await fetch("https://api.signicat.com/auth/open/connect/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + btoa(`${CLIENT_ID}:${CLIENT_SECRET}`),
    },
    body: new URLSearchParams({ grant_type: "client_credentials", scope: "signicat-api" }),
  })
  if (!tokenRes.ok) {
    const err = await tokenRes.text()
    throw new Error(`Signicat token-feil: ${tokenRes.status} - ${err}`)
  }
  const { access_token } = await tokenRes.json()
  if (!access_token) throw new Error("Signicat token mangler access_token")
  return access_token
}

export async function fetchSigningSession(sessionId: string): Promise<SignicatSigningSession> {
  const access_token = await getSignicatSignAccessToken()
  const res = await fetch(`https://api.signicat.com/sign/signing-sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${access_token}`, Accept: "application/json" },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(
      `Signicat session ${sessionId}: ${res.status} ${JSON.stringify(body).slice(0, 300)}`,
    )
  }
  return body as SignicatSigningSession
}

/** True only when Signicat reports a finalised, successful signature (not merely started). */
export function isSigningSessionCompleted(session: SignicatSigningSession): boolean {
  const state = (session.lifecycle?.state || "").toUpperCase()
  if (state === "REJECTED" || state === "CANCELLED" || state === "EXPIRED") {
    return false
  }
  if (state === "SIGNED" && session.lifecycle?.stateIsFinal === true) {
    return true
  }
  const signatures = session.output?.signatures
  return (
    session.lifecycle?.stateIsFinal === true &&
    Array.isArray(signatures) &&
    signatures.length > 0
  )
}
