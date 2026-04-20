const isDev = process.env.NODE_ENV === 'development'

export function devLog(...args: unknown[]): void {
  if (isDev) console.log(...args)
}

export function devWarn(...args: unknown[]): void {
  if (isDev) console.warn(...args)
}

export function devInfo(...args: unknown[]): void {
  if (isDev) console.info(...args)
}

/** Unexpected failures — visible in server logs (Route Handlers) and browser devtools when debugging. */
export function logError(...args: unknown[]): void {
  console.error(...args)
}
