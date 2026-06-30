import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/app/lib/supabase'
import { isKommuneStaffRole } from '@/app/lib/kommuneRoles'
import { QK } from '@/app/lib/queries/queryKeys'

export type PublishedEventOption = { id: string; name: string }

export function useNavDatabasePublishedEvents(userRole: string | null | undefined) {
  return useQuery({
    queryKey: [...QK.navDatabasePublishedEvents, userRole ?? 'none'],
    queryFn: async (): Promise<PublishedEventOption[]> => {
      const { data } = await supabase
        .from('central_events')
        .select('id, name')
        .eq('status', 'published')
        .order('start_date', { ascending: false })
        .limit(30)
      return (data ?? []) as PublishedEventOption[]
    },
    enabled: isKommuneStaffRole(userRole ?? undefined),
    staleTime: 60_000,
  })
}
