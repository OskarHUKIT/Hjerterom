/** Felter som identifiserer samme hendelse på tvers av kommune-staff (én rad per owner_id). */
export type NotificationSiblingFields = {
  event_id?: string | null
  type: string
  title: string
  message?: string | null
  listing_id?: string | null
  related_user_id?: string | null
}

export function isSameKommuneNotificationEvent(
  a: NotificationSiblingFields,
  b: NotificationSiblingFields
): boolean {
  const aEvent = a.event_id?.trim() || null
  const bEvent = b.event_id?.trim() || null
  if (aEvent && bEvent) return aEvent === bEvent
  return (
    a.type === b.type &&
    a.title === b.title &&
    (a.message ?? null) === (b.message ?? null) &&
    (a.listing_id ?? null) === (b.listing_id ?? null) &&
    (a.related_user_id ?? null) === (b.related_user_id ?? null)
  )
}

export function kommuneNotificationSiblingIds<T extends NotificationSiblingFields & { id: string }>(
  rows: T[],
  target: NotificationSiblingFields
): string[] {
  return rows.filter((row) => isSameKommuneNotificationEvent(row, target)).map((row) => row.id)
}
