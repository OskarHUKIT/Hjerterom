/**
 * Vipps ePayment API helpers (test/prod via VIPPS_ENV).
 * @see https://developer.vippsmobilepay.com/docs/APIs/epayment-api/
 */

export type VippsConfig = {
  clientId: string
  clientSecret: string
  subscriptionKey: string
  merchantSerialNumber: string
  env: 'test' | 'production'
}

export function getVippsConfig(): VippsConfig | null {
  const clientId = process.env.VIPPS_CLIENT_ID?.trim()
  const clientSecret = process.env.VIPPS_CLIENT_SECRET?.trim()
  const subscriptionKey = process.env.VIPPS_SUBSCRIPTION_KEY?.trim()
  const msn = process.env.VIPPS_MSN?.trim()
  if (!clientId || !clientSecret || !subscriptionKey || !msn) return null
  const env = process.env.VIPPS_ENV === 'production' ? 'production' : 'test'
  return { clientId, clientSecret, subscriptionKey, merchantSerialNumber: msn, env }
}

function vippsBaseUrl(env: 'test' | 'production'): string {
  return env === 'production'
    ? 'https://api.vipps.no'
    : 'https://apitest.vipps.no'
}

export async function vippsGetAccessToken(cfg: VippsConfig): Promise<string> {
  const res = await fetch(`${vippsBaseUrl(cfg.env)}/accessToken/get`, {
    method: 'POST',
    headers: {
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      'Ocp-Apim-Subscription-Key': cfg.subscriptionKey,
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Vipps token failed: ${res.status} ${text}`)
  }
  const data = (await res.json()) as { access_token?: string }
  if (!data.access_token) throw new Error('Vipps token missing')
  return data.access_token
}

export async function vippsCreatePayment(
  cfg: VippsConfig,
  opts: {
    reference: string
    amountCents: number
    returnUrl: string
    phoneNumber?: string
  }
): Promise<{ redirectUrl: string; paymentId: string }> {
  const token = await vippsGetAccessToken(cfg)
  const res = await fetch(`${vippsBaseUrl(cfg.env)}/epayment/v1/payments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Ocp-Apim-Subscription-Key': cfg.subscriptionKey,
      'Content-Type': 'application/json',
      'Idempotency-Key': opts.reference,
      'Merchant-Serial-Number': cfg.merchantSerialNumber,
    },
    body: JSON.stringify({
      amount: { currency: 'NOK', value: opts.amountCents },
      paymentMethod: { type: 'WALLET' },
      reference: opts.reference,
      returnUrl: opts.returnUrl,
      userFlow: 'WEB_REDIRECT',
      paymentDescription: 'Hjerterum booking',
      ...(opts.phoneNumber ? { customer: { phoneNumber: opts.phoneNumber } } : {}),
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Vipps payment failed: ${res.status} ${text}`)
  }
  const data = (await res.json()) as { redirectUrl?: string; paymentId?: string }
  if (!data.redirectUrl || !data.paymentId) throw new Error('Vipps payment response incomplete')
  return { redirectUrl: data.redirectUrl, paymentId: data.paymentId }
}

export async function vippsGetPayment(
  cfg: VippsConfig,
  reference: string
): Promise<{ state?: string }> {
  const token = await vippsGetAccessToken(cfg)
  const res = await fetch(`${vippsBaseUrl(cfg.env)}/epayment/v1/payments/${reference}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Ocp-Apim-Subscription-Key': cfg.subscriptionKey,
      'Merchant-Serial-Number': cfg.merchantSerialNumber,
    },
  })
  if (!res.ok) return {}
  return (await res.json()) as { state?: string }
}
