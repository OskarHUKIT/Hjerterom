/** Turist/leietaker i Finn-portalen (ikke utleier eller kommune). */
export function isLeietakerRole(role: string | null | undefined): boolean {
  return role === 'leietaker'
}
