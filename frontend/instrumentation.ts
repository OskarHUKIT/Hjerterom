/** Optional Sentry — install @sentry/nextjs and set NEXT_PUBLIC_SENTRY_DSN to enable. */
export async function register() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return
  console.info('[instrumentation] NEXT_PUBLIC_SENTRY_DSN set — install @sentry/nextjs for full capture')
}
