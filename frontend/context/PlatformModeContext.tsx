'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/app/lib/supabase'
import {
  BOLY_ONLY_SETTINGS,
  effectivePlatformFlags,
  parsePlatformSettings,
  type EffectivePlatformFlags,
  type PlatformSettings,
} from '@/lib/platformSettings'
import { invalidatePlatformSettingsCache } from '@/lib/platformSettingsServer'

export const platformSettingsQueryKey = ['platform', 'settings'] as const

async function fetchPlatformSettingsClient(): Promise<PlatformSettings> {
  const { data, error } = await supabase.rpc('get_platform_settings')
  if (error) throw error
  return parsePlatformSettings(data)
}

type PlatformModeContextValue = {
  settings: PlatformSettings
  flags: EffectivePlatformFlags
  isLoading: boolean
  isError: boolean
  refetch: () => void
}

const PlatformModeContext = createContext<PlatformModeContextValue>({
  settings: BOLY_ONLY_SETTINGS,
  flags: effectivePlatformFlags(BOLY_ONLY_SETTINGS),
  isLoading: true,
  isError: false,
  refetch: () => {},
})

export function PlatformModeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const q = useQuery({
    queryKey: platformSettingsQueryKey,
    queryFn: fetchPlatformSettingsClient,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
  })

  const settings = q.data ?? BOLY_ONLY_SETTINGS
  const flags = useMemo(() => effectivePlatformFlags(settings), [settings])

  const refetch = useCallback(() => {
    invalidatePlatformSettingsCache()
    void queryClient.invalidateQueries({ queryKey: platformSettingsQueryKey })
  }, [queryClient])

  const value = useMemo(
    () => ({
      settings,
      flags,
      isLoading: q.isPending,
      isError: q.isError,
      refetch,
    }),
    [settings, flags, q.isPending, q.isError, refetch]
  )

  return <PlatformModeContext.Provider value={value}>{children}</PlatformModeContext.Provider>
}

export function usePlatformMode() {
  return useContext(PlatformModeContext)
}
