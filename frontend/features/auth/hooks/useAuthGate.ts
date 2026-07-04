'use client'

import { useLandlordNavGateQuery } from '@/app/hooks/useLandlordNavGateQuery'
import { useKommuneNavAccess } from '@/app/hooks/useKommuneNavAccess'
import { useOpsAccess } from '@/app/hooks/useOpsAccess'
import { useChatUserBootstrap } from '@/app/hooks/useChatUserBootstrap'
import { useEventStaffAccess } from '@/features/auth/hooks/useEventStaffAccess'
import type { UseQueryResult } from '@tanstack/react-query'
import type { KommuneNavAccess } from '@/app/lib/queries/kommuneNavAccess'
import type { OpsAccess } from '@/app/lib/queries/opsAccess'
import type { EventStaffAccess } from '@/app/lib/queries/eventStaffAccess'
import type { LandlordNavGateResult } from '@/app/lib/queries/landlordNavGateQuery'
import type { ChatUserBootstrap } from '@/app/lib/queries/chatUserBootstrap'

export type AuthGateMode = 'landlord-nav' | 'kommune' | 'ops' | 'event-staff' | 'chat'

type KommuneGateOptions = NonNullable<Parameters<typeof useKommuneNavAccess>[0]>
type OpsGateOptions = NonNullable<Parameters<typeof useOpsAccess>[0]>
type EventStaffGateOptions = Parameters<typeof useEventStaffAccess>[0]

export type UseAuthGateOptions =
  | { mode: 'landlord-nav' }
  | ({ mode: 'kommune' } & KommuneGateOptions)
  | ({ mode: 'ops' } & OpsGateOptions)
  | ({ mode: 'event-staff' } & EventStaffGateOptions)
  | { mode: 'chat' }

export function useAuthGate(
  options: { mode: 'landlord-nav' }
): UseQueryResult<LandlordNavGateResult, Error>
export function useAuthGate(
  options: { mode: 'kommune' } & KommuneGateOptions
): UseQueryResult<KommuneNavAccess, Error>
export function useAuthGate(
  options: { mode: 'ops' } & OpsGateOptions
): UseQueryResult<OpsAccess, Error>
export function useAuthGate(
  options: { mode: 'event-staff' } & EventStaffGateOptions
): UseQueryResult<EventStaffAccess, Error>
export function useAuthGate(
  options: { mode: 'chat' }
): UseQueryResult<ChatUserBootstrap, Error>
/**
 * Unified auth gate entry point (W4 brief). Delegates to per-surface hooks with `enabled` guards.
 */
export function useAuthGate(options: UseAuthGateOptions) {
  const mode = options.mode
  const landlord = useLandlordNavGateQuery({ enabled: mode === 'landlord-nav' })
  const kommune = useKommuneNavAccess({
    ...(mode === 'kommune' ? options : {}),
    enabled: mode === 'kommune',
    redirectUnauthenticated:
      mode === 'kommune' ? (options as KommuneGateOptions).redirectUnauthenticated : false,
  })
  const ops = useOpsAccess({
    ...(mode === 'ops' ? options : {}),
    enabled: mode === 'ops',
    redirectUnauthenticated:
      mode === 'ops' ? (options as OpsGateOptions).redirectUnauthenticated : false,
  })
  const eventStaff = useEventStaffAccess({
    ...(mode === 'event-staff' ? options : { enabled: false }),
    enabled: mode === 'event-staff',
  })
  const chat = useChatUserBootstrap({ enabled: mode === 'chat' })

  switch (mode) {
    case 'landlord-nav':
      return landlord
    case 'kommune':
      return kommune
    case 'ops':
      return ops
    case 'event-staff':
      return eventStaff
    case 'chat':
      return chat
    default:
      return landlord
  }
}
