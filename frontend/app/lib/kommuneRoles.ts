/** Kommune-saksbehandler eller kommune-admin (begge har tilgang til Nav-funksjoner). */
export function isKommuneStaffRole(role: string | null | undefined): boolean {
  return role === 'kommune_ansatt' || role === 'kommune_admin'
}

export function isKommuneAdminRole(role: string | null | undefined): boolean {
  return role === 'kommune_admin'
}

/**
 * «Kontoer» i nav for alle kommunebrukere (saksbehandlere og kommune-admin).
 */
export function kommuneNavUsesAccountsLabel(role: string | null | undefined): boolean {
  return isKommuneStaffRole(role)
}
