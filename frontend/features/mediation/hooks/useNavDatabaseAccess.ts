'use client'

import { useKommuneNavAccess } from '@/app/hooks/useKommuneNavAccess'
import { useEventStaffAccess } from '@/features/auth/hooks/useEventStaffAccess'
import type { NavDatabasePortalMode } from '@/features/mediation/types/navDatabasePortal'

export type NavDatabaseAccessState = {
  isEventPortal: boolean
  userRole: string | null
  kommuneCanEdit: boolean
  kommuneRegion: string | string[] | 'event' | null
  isAuthorized: boolean | null
  accessPending: boolean
  accessError: boolean
  accessQueryError: Error | null
  refetchAccess: () => void
}

/**
 * Dual-mode auth for boligbank (kommune) vs event staff database views.
 * Complements `useAuthGate` for surfaces that switch portal context on one page.
 */
export function useNavDatabaseAccess(portalMode: NavDatabasePortalMode): NavDatabaseAccessState {
  const isEventPortal = portalMode === 'event'

  const {
    data: access,
    isPending: accessPending,
    isError: accessError,
    error: accessQueryError,
    refetch: refetchKommuneAccess,
  } = useKommuneNavAccess({ redirectUnauthenticated: !isEventPortal, enabled: !isEventPortal })

  const { data: eventAccess, isPending: eventAccessPending } = useEventStaffAccess({
    enabled: isEventPortal,
    loginRedirect: '/nav/event/database',
  })

  const userRole = isEventPortal
    ? eventAccess?.kind === 'ok'
      ? eventAccess.userRole
      : null
    : access?.kind === 'ok'
      ? access.userRole
      : null

  const kommuneCanEdit = isEventPortal
    ? true
    : access?.kind === 'ok'
      ? access.kommuneCanEdit
      : true

  const kommuneRegion = isEventPortal
    ? 'event'
    : access?.kind === 'ok'
      ? access.kommuneRegion
      : null

  const isAuthorized: boolean | null = isEventPortal
    ? eventAccessPending || !eventAccess
      ? null
      : eventAccess.kind === 'ok'
        ? true
        : eventAccess.kind === 'forbidden'
          ? false
          : null
    : accessPending || access === undefined
      ? null
      : access.kind === 'unauthenticated'
        ? null
        : access.kind === 'ok'
          ? true
          : access.kind === 'forbidden'
            ? false
            : null

  return {
    isEventPortal,
    userRole,
    kommuneCanEdit,
    kommuneRegion,
    isAuthorized,
    accessPending: isEventPortal ? eventAccessPending : accessPending,
    accessError: isEventPortal ? false : accessError,
    accessQueryError: isEventPortal ? null : accessQueryError ?? null,
    refetchAccess: () => void refetchKommuneAccess(),
  }
}
