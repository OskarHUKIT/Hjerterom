/**
 * Maps Boly `appLocale` to Signicat Sign API v2 `ui.language`.
 *
 * Sign API accepts: da, de, en, fi, nb, nn, sv — so Norwegian must be sent as "nb"
 * (not the ISO 639-1 alias "no", which Signicat rejects with 400 bad_request).
 *
 * Sami (`se`) is not a Signicat Hub language — Norwegian Bokmål is used (matches
 * BankID OIDC docs as well).
 */
export function signicatUiLanguageFromAppLocale(
  locale: string | undefined
): "nb" | "en" {
  if (locale === "en") return "en"
  return "nb"
}
