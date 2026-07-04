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
  DEFAULT_PLATFORM_SETTINGS,
  effectivePlatformFlags,
  parsePlatformSettings,
  type EffectiveModuleFlags,
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
  flags: EffectiveModuleFlags
  isLoading: boolean
  isError: boolean
  refetch: () => void
}

const PlatformModeContext = createContext<PlatformModeContextValue>({
  settings: DEFAULT_PLATFORM_SETTINGS,
  flags: effectivePlatformFlags(DEFAULT_PLATFORM_SETTINGS),
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

  const settings = q.data ?? DEFAULT_PLATFORM_SETTINGS
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
