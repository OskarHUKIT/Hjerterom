/**
 * Maps Boly `appLocale` from the sign-agreement client to Sign API v2 `ui.language`.
 * Sami (`se`) is not a Signicat Hub language — Norwegian is used (same as OIDC docs for BankID).
 */
export function signicatUiLanguageFromAppLocale(
  locale: string | undefined
): "no" | "en" {
  if (locale === "en") return "en"
  return "no"
}
