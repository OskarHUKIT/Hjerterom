# Vipps ePayment (NPD-3C)

Parallel payment path for Finn tourism checkout alongside Stripe.

## Environment variables

| Variable | Purpose |
|----------|---------|
| `VIPPS_CLIENT_ID` | OAuth client id |
| `VIPPS_CLIENT_SECRET` | OAuth client secret |
| `VIPPS_SUBSCRIPTION_KEY` | APIM subscription key |
| `VIPPS_MSN` | Merchant serial number |
| `VIPPS_API_BASE` | Optional; defaults to test API |

When unset, `/api/vipps/config` returns `{ configured: false }` and Finn checkout shows Stripe only.

## Flow

1. Guest selects payment on `/finn/book/[id]` → `POST /api/vipps/checkout`
2. Server creates Vipps ePayment with `Idempotency-Key: booking-<id>`
3. Booking row updated: `payment_provider = 'vipps'`, `vipps_order_id` set
4. `POST /api/webhooks/vipps` marks booking `paid` on capture

## Idempotency

- Checkout uses booking id as idempotency key (safe retry)
- Webhook should treat duplicate capture events as no-op (booking already `paid`)

## Webhook setup

Register webhook URL: `https://<deployment>/api/webhooks/vipps`

Verify in Vipps portal that test MSN matches `VIPPS_MSN`.

## Local / phi without Vipps

Finn checkout displays translated «Vipps not ready» and hides Vipps radio. Stripe remains available.
