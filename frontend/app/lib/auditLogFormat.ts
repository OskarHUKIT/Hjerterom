/**
 * Formaterer audit log-oppføringer til lesbare norske beskrivelser.
 */
export type AuditLog = {
  action_type: string
  listing_address?: string | null
  details?: Record<string, unknown> | null
}

export function formatAuditLogDescription(log: AuditLog): string {
  const addr = log.listing_address || 'Bolig'
  const d = log.details || {}

  switch (log.action_type) {
    case 'STATUS_CHANGE':
      return `Endret tilgjengelighet for ${addr} fra «${(d as any).from || '?'}» til «${(d as any).to || '?'}»`
    case 'CREATE_LISTING':
      return `Registrerte ny bolig: ${addr}`
    case 'DELETE_LISTING':
      return `Slettet bolig: ${addr}`
    case 'SIGN_TERMS':
      return `Signerte vilkårsavtale${(d as any).version ? ` v${(d as any).version}` : ''}`
    case 'SIGN_TERMS_BANKID':
      return 'Signerte vilkårsavtale med BankID'
    case 'SIGN_INITIATED':
      return `Startet vilkårs-signering${(d as any).role ? ` (${(d as any).role})` : ''}`
    case 'TERMINATE_AGREEMENT':
      return 'Avsluttet vilkårsavtale'
    case 'KOMMUNE_MARK_FORMIDLA': {
      const start = (d as any).start_date ? new Date((d as any).start_date).toLocaleDateString('no-NO') : ''
      const end = (d as any).end_date ? new Date((d as any).end_date).toLocaleDateString('no-NO') : ''
      return start && end
        ? `Markerte ${addr} som formidlet for perioden ${start}–${end}`
        : `Markerte ${addr} som formidlet`
    }
    case 'KOMMUNE_REMOVE_FORMIDLA':
      return `Fjernet formidling for ${addr}`
    case 'UPDATE_FIELD': {
      const field = (d as any).field
      const value = (d as any).value
      const fieldNames: Record<string, string> = {
        address: 'adresse',
        city: 'by',
        type: 'boligtype',
        status: 'status',
        is_available: 'tilgjengelighet',
      }
      const fieldLabel = fieldNames[field] || field
      return `Oppdaterte ${fieldLabel} for ${addr}${value != null ? ` til «${value}»` : ''}`
    }
    default:
      return log.listing_address ? `${log.action_type}: ${addr}` : log.action_type
  }
}

export function getAuditLogIcon(action_type: string): string {
  switch (action_type) {
    case 'STATUS_CHANGE': return 'toggle'
    case 'CREATE_LISTING': return 'plus'
    case 'DELETE_LISTING': return 'trash'
    case 'SIGN_TERMS':
    case 'SIGN_TERMS_BANKID':
    case 'SIGN_INITIATED':
    case 'TERMINATE_AGREEMENT': return 'shield'
    case 'KOMMUNE_MARK_FORMIDLA':
    case 'KOMMUNE_REMOVE_FORMIDLA': return 'home'
    case 'UPDATE_FIELD': return 'edit'
    default: return 'clock'
  }
}
