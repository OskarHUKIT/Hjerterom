export function isHomeownerShellRoute(pathname: string | null): boolean {
  if (!pathname) return false
  return pathname === '/homeowner' || pathname.startsWith('/homeowner/')
}
