/** Platform module registry — single source for ops toggles and runtime gates. */

import type { PlatformSettings } from '@/lib/platformSettings'

export type ModuleId = 'social' | 'tourism' | 'finn' | 'los' | 'events' | 'stripe'

export type ModuleDef = {
  id: ModuleId
  requires: ModuleId[]
  /** Route prefixes blocked when module is off (except explicit grace paths). */
  routes: string[]
}

export const MODULE_REGISTRY: Record<ModuleId, ModuleDef> = {
  social: {
    id: 'social',
    requires: [],
    routes: ['/nav/database', '/nav/terms-documents', '/nav/kommune-access'],
  },
  tourism: {
    id: 'tourism',
    requires: [],
    routes: ['/finn/listing', '/finn/book', '/finn/arrangement'],
  },
  finn: {
    id: 'finn',
    requires: ['tourism'],
    routes: ['/finn'],
  },
  los: {
    id: 'los',
    requires: ['social'],
    routes: ['/los', '/nav/los-inbox'],
  },
  events: {
    id: 'events',
    requires: [],
    routes: ['/nav/event', '/nav/event-inquiries', '/ops/events'],
  },
  stripe: {
    id: 'stripe',
    requires: ['tourism'],
    routes: [],
  },
}

/** Finn paths that stay open when tourism is off (active bookings). */
export const FINN_GRACE_PATH_PREFIXES = ['/finn/mine', '/finn/login', '/finn/vilkar'] as const

export function isFinnGracePath(pathname: string): boolean {
  return FINN_GRACE_PATH_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  )
}

export function effectiveModuleFlags(s: PlatformSettings) {
  const social = s.socialModuleEnabled
  const tourism = s.tourismLaneEnabled
  const finnPortal = s.finnPortalEnabled
  const losRaw = s.losPortalEnabled
  const events = s.centralEventsEnabled
  const stripeRaw = s.stripeBookingsEnabled

  const los = losRaw && social
  const finn = finnPortal && tourism
  const stripeBookings = stripeRaw && tourism

  /** Homeowner portal when any housing module needs utleier UI. */
  const homeownerPortal = social || tourism || events

  /** Kommune SB (boligbank) requires social. */
  const kommunePortal = social

  return {
    social,
    tourism,
    finn,
    los,
    centralEvents: events,
    stripeBookings,
    homeownerPortal,
    kommunePortal,
    /** Legacy aliases */
    isBolyCore: social,
    isHjerterumMode: tourism || los || events || finnPortal,
  }
}

export type EffectiveModuleFlags = ReturnType<typeof effectiveModuleFlags>

/** Client-side dependency normalization before save (mirrors DB ops_set_platform_settings). */
export function normalizeModuleSettings(input: {
  socialModuleEnabled: boolean
  finnPortalEnabled: boolean
  losPortalEnabled: boolean
  centralEventsEnabled: boolean
  tourismLaneEnabled: boolean
  stripeBookingsEnabled: boolean
}) {
  let social = input.socialModuleEnabled
  let finn = input.finnPortalEnabled
  let los = input.losPortalEnabled
  let events = input.centralEventsEnabled
  let tourism = input.tourismLaneEnabled
  let stripe = input.stripeBookingsEnabled

  if (los && !social) los = false
  if (!social) los = false
  if (!tourism) {
    stripe = false
    finn = false
  }
  if (stripe && !tourism) stripe = false

  return {
    socialModuleEnabled: social,
    finnPortalEnabled: finn,
    losPortalEnabled: los,
    centralEventsEnabled: events,
    tourismLaneEnabled: tourism,
    stripeBookingsEnabled: stripe,
  }
}

/** Hide message channels when their module is off (data retained in DB). */
export function isMessageChannelVisible(
  channel: 'social_caseworker' | 'event_caseworker' | 'guest_booking',
  flags: EffectiveModuleFlags
): boolean {
  switch (channel) {
    case 'social_caseworker':
      return flags.social
    case 'event_caseworker':
      return flags.centralEvents
    case 'guest_booking':
      return flags.tourism
    default:
      return true
  }
}
