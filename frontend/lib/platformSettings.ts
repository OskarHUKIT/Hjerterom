/** Platform feature flags from `platform_settings` (singleton). */

import { effectiveModuleFlags, type EffectiveModuleFlags } from '@/lib/moduleRegistry'

export type PlatformSettingsRaw = {
  social_module_enabled?: boolean
  finn_portal_enabled: boolean
  los_portal_enabled: boolean
  central_events_enabled: boolean
  tourism_lane_enabled: boolean
  stripe_bookings_enabled: boolean
  updated_at?: string | null
  /** @deprecated Legacy — no longer returned by get_platform_settings */
  product_mode?: string
}

export type PlatformSettings = {
  socialModuleEnabled: boolean
  finnPortalEnabled: boolean
  losPortalEnabled: boolean
  centralEventsEnabled: boolean
  tourismLaneEnabled: boolean
  stripeBookingsEnabled: boolean
  updatedAt: string | null
}

/** Safe default: social + Los (anonymous public entry); Finn/events off until enabled in ops. */
export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  socialModuleEnabled: true,
  finnPortalEnabled: false,
  losPortalEnabled: true,
  centralEventsEnabled: false,
  tourismLaneEnabled: false,
  stripeBookingsEnabled: false,
  updatedAt: null,
}

/** @deprecated Use DEFAULT_PLATFORM_SETTINGS */
export const BOLY_ONLY_SETTINGS = DEFAULT_PLATFORM_SETTINGS

export function parsePlatformSettings(raw: unknown): PlatformSettings {
  if (!raw || typeof raw !== 'object') return DEFAULT_PLATFORM_SETTINGS
  const o = raw as PlatformSettingsRaw
  return {
    socialModuleEnabled: o.social_module_enabled !== false,
    finnPortalEnabled: Boolean(o.finn_portal_enabled),
    losPortalEnabled: Boolean(o.los_portal_enabled),
    centralEventsEnabled: Boolean(o.central_events_enabled),
    tourismLaneEnabled: Boolean(o.tourism_lane_enabled),
    stripeBookingsEnabled: Boolean(o.stripe_bookings_enabled),
    updatedAt: typeof o.updated_at === 'string' ? o.updated_at : null,
  }
}

export function effectivePlatformFlags(s: PlatformSettings): EffectiveModuleFlags {
  return effectiveModuleFlags(s)
}

export type { EffectiveModuleFlags }
