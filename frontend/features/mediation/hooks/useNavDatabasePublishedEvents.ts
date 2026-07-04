import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/app/lib/supabase'
import { isKommuneStaffRole } from '@/app/lib/kommuneRoles'
import { isEventStaffRole } from '@/app/lib/eventStaffRoles'
import { QK } from '@/app/lib/queries/queryKeys'

export type PublishedEventOption = { id: string; name: string }

export function useNavDatabasePublishedEvents(userRole: string | null | undefined) {
  const isKommune = isKommuneStaffRole(userRole ?? undefined)
  const isEvent = isEventStaffRole(userRole ?? undefined)

  return useQuery({
    queryKey: [...QK.navDatabasePublishedEvents, userRole ?? 'none'],
    queryFn: async (): Promise<PublishedEventOption[]> => {
      if (isEvent) {
        const { data: auth } = await supabase.auth.getUser()
        if (!auth.user) return []
        const { data } = await supabase
          .from('central_event_staff')
          .select('event_id, central_events(id, name, status, start_date)')
          .eq('profile_id', auth.user.id)
        const rows = (data ?? []) as Array<{
          event_id: string
          central_events:
            | { id: string; name: string; status: string; start_date: string }
            | { id: string; name: string; status: string; start_date: string }[]
            | null
        }>
        return rows
          .map((row) => {
            const ev = Array.isArray(row.central_events)
              ? row.central_events[0]
              : row.central_events
            if (!ev || ev.status !== 'published') return null
            return { id: ev.id, name: ev.name }
          })
          .filter((x): x is PublishedEventOption => x != null)
      }

      const { data } = await supabase
        .from('central_events')
        .select('id, name')
        .eq('status', 'published')
        .order('start_date', { ascending: false })
        .limit(30)
      return (data ?? []) as PublishedEventOption[]
    },
    enabled: isKommune || isEvent,
    staleTime: 60_000,
  })
}
