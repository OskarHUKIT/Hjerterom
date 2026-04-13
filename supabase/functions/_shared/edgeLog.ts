/** Enkel strukturert logging for Edge Functions (lettere å parse i loggaggregator). */

export function edgeLog(
  level: "info" | "warn" | "error",
  msg: string,
  data: Record<string, unknown> = {},
): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    msg,
    ...data,
  })
  if (level === "error") console.error(line)
  else if (level === "warn") console.warn(line)
  else console.log(line)
}
