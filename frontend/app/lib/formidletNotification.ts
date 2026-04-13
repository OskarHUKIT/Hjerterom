/** Max characters of mediation note appended to owner notification (full note still stored in DB). */
export const MAX_MEDIATION_NOTE_IN_NOTIFICATION = 500

export function appendMediationNoteToOwnerMessage(
  baseMessage: string,
  note: string | null | undefined,
  includeInNotification: boolean
): string {
  const trimmed = (note ?? '').trim()
  if (!includeInNotification || !trimmed) return baseMessage
  const slice =
    trimmed.length > MAX_MEDIATION_NOTE_IN_NOTIFICATION
      ? `${trimmed.slice(0, MAX_MEDIATION_NOTE_IN_NOTIFICATION)}…`
      : trimmed
  return `${baseMessage}\n\nMelding fra kommunen:\n${slice}`
}
