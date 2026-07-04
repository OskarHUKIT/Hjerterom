export type NavDbViewMode = 'table' | 'map' | 'timeline' | 'list'

export const mobileNavDbViewKey = 'boly-nav-db-view-mobile'
/** Gjenopprett tabell/kart/tidslinje etter retur fra listing (samme fane). */
export const sessionNavDbViewSessionKey = 'boly-nav-db-view-session'

/** Maks rader per Supabase-kall; flere sider hentes i én fetch-kjøring. */
export const navDbListingsPageSize = 800
/** Slutt å hente flere sider etter dette (sikkerhetsgrense). */
export const navDbListingsMaxRows = 30_000

export const navDbDefaultVisibleColumnsDesktop = ['address', 'city', 'owner_name', 'price_daily'] as const
export const navDbDefaultVisibleColumnsMobile = ['address', 'price_daily'] as const
