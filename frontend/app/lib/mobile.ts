/** True når nettleseren rapporterer mobil/tablet (User-Agent). Brukes etter mount for å unngå SSR/hydration-feil. */
export function isMobileUserAgent(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile/i.test(ua)
}
