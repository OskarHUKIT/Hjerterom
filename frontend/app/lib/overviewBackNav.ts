import type { TranslationKey } from '../../lib/translations'
import { isKommuneStaffRole } from './kommuneRoles'

const DB_PATH = '/nav/database'
const MANAGE_PATH = '/homeowner/manage'

function pathOnly(pathname: string): string {
  const base = pathname.split('?')[0] || '/'
  if (base.length > 1 && base.endsWith('/')) return base.slice(0, -1)
  return base
}

type TFn = (key: TranslationKey) => string

/** Tilbake til Boligbank / Mine boliger. `null` når man allerede er på hub (ingen «til forsiden»). */
export function getOverviewBackLink(
  pathname: string,
  role: string | null | undefined,
  t: TFn
): { href: string; label: string } | null {
  const path = pathOnly(pathname)
  if (role == null || role === '') {
    return { href: '/', label: t('overview') }
  }
  if (isKommuneStaffRole(role)) {
    if (path === DB_PATH) return null
    return { href: DB_PATH, label: t('housingBank') }
  }
  if (path === MANAGE_PATH) return null
  return { href: MANAGE_PATH, label: t('myProperties') }
}
