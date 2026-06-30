/** Platform feature flags from `platform_settings` (singleton). */

export type ProductMode = 'boly' | 'hjerterum'

export type PlatformSettingsRaw = {
  product_mode: ProductMode
  finn_portal_enabled: boolean
  los_portal_enabled: boolean
  central_events_enabled: boolean
  tourism_lane_enabled: boolean
  stripe_bookings_enabled: boolean
  updated_at?: string | null
}

export type PlatformSettings = {
  productMode: ProductMode
  finnPortalEnabled: boolean
  losPortalEnabled: boolean
  centralEventsEnabled: boolean
  tourismLaneEnabled: boolean
  stripeBookingsEnabled: boolean
  updatedAt: string | null
}

/** Safe default: classic Boly only (matches migration seed). */
export const BOLY_ONLY_SETTINGS: PlatformSettings = {
  productMode: 'boly',
  finnPortalEnabled: false,
  losPortalEnabled: false,
  centralEventsEnabled: false,
  tourismLaneEnabled: false,
  stripeBookingsEnabled: false,
  updatedAt: null,
}

export function parsePlatformSettings(raw: unknown): PlatformSettings {
  if (!raw || typeof raw !== 'object') return BOLY_ONLY_SETTINGS
  const o = raw as PlatformSettingsRaw
  const mode = o.product_mode === 'hjerterum' ? 'hjerterum' : 'boly'
  return {
    productMode: mode,
    finnPortalEnabled: Boolean(o.finn_portal_enabled),
    losPortalEnabled: Boolean(o.los_portal_enabled),
    centralEventsEnabled: Boolean(o.central_events_enabled),
    tourismLaneEnabled: Boolean(o.tourism_lane_enabled),
    stripeBookingsEnabled: Boolean(o.stripe_bookings_enabled),
    updatedAt: typeof o.updated_at === 'string' ? o.updated_at : null,
  }
}

/** Effective flags — Hjerterum modules require product_mode=hjerterum AND per-flag enable. */
export function effectivePlatformFlags(s: PlatformSettings) {
  const hjerterum = s.productMode === 'hjerterum'
  return {
    isBolyCore: true,
    isHjerterumMode: hjerterum,
    finn: hjerterum && s.finnPortalEnabled,
    los: hjerterum && s.losPortalEnabled,
    centralEvents: hjerterum && s.centralEventsEnabled,
    tourism: hjerterum && s.tourismLaneEnabled,
    stripeBookings: hjerterum && s.stripeBookingsEnabled,
  }
}

export type EffectivePlatformFlags = ReturnType<typeof effectivePlatformFlags>
