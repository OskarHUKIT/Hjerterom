/** Routes where the global command palette is active. */
export function isCommandPaletteRoute(pathname: string | null): boolean {
  if (!pathname) return false
  if (pathname === '/ops' || pathname.startsWith('/ops/')) return true
  if (pathname === '/nav' || pathname.startsWith('/nav/')) return true
  return false
}
