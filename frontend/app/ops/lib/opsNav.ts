import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Users,
  FileText,
  Shield,
  BarChart3,
  Megaphone,
  Building2,
  HeartPulse,
  CalendarDays,
  SlidersHorizontal,
} from 'lucide-react'

export type OpsNavLabelKey =
  | 'opsNavDashboard'
  | 'opsNavPlatform'
  | 'opsNavBroadcasts'
  | 'opsNavEvents'
  | 'opsNavKommuner'
  | 'opsNavServiceAreas'
  | 'opsNavAccounts'
  | 'opsNavTerms'
  | 'opsNavHealth'
  | 'opsNavSecurity'
  | 'opsNavStats'

export type OpsNavGroupKey =
  | 'opsNavGroupOverview'
  | 'opsNavGroupPlatform'
  | 'opsNavGroupOrganization'
  | 'opsNavGroupGovernance'

export type OpsNavItem = {
  href: string
  icon: LucideIcon
  labelKey: OpsNavLabelKey
  exact?: boolean
  requiresCentralEvents?: boolean
  /** Show badge when terms_pending > 0 */
  termsBadge?: boolean
}

export type OpsNavGroup = {
  groupKey: OpsNavGroupKey
  items: OpsNavItem[]
}

export const OPS_NAV_GROUPS: OpsNavGroup[] = [
  {
    groupKey: 'opsNavGroupOverview',
    items: [{ href: '/ops', icon: LayoutDashboard, labelKey: 'opsNavDashboard', exact: true }],
  },
  {
    groupKey: 'opsNavGroupPlatform',
    items: [
      { href: '/ops/platform', icon: SlidersHorizontal, labelKey: 'opsNavPlatform' },
      { href: '/ops/broadcasts', icon: Megaphone, labelKey: 'opsNavBroadcasts' },
      {
        href: '/ops/events',
        icon: CalendarDays,
        labelKey: 'opsNavEvents',
        requiresCentralEvents: true,
      },
    ],
  },
  {
    groupKey: 'opsNavGroupOrganization',
    items: [
      { href: '/ops/kommuner', icon: Building2, labelKey: 'opsNavKommuner' },
      { href: '/ops/service-areas', icon: Building2, labelKey: 'opsNavServiceAreas' },
      { href: '/ops/accounts', icon: Users, labelKey: 'opsNavAccounts' },
    ],
  },
  {
    groupKey: 'opsNavGroupGovernance',
    items: [
      { href: '/ops/terms', icon: FileText, labelKey: 'opsNavTerms', termsBadge: true },
      { href: '/ops/health', icon: HeartPulse, labelKey: 'opsNavHealth' },
      { href: '/ops/security', icon: Shield, labelKey: 'opsNavSecurity' },
      { href: '/ops/stats', icon: BarChart3, labelKey: 'opsNavStats' },
    ],
  },
]

export const OPS_MOBILE_PRIMARY: Pick<OpsNavItem, 'href' | 'icon' | 'labelKey' | 'exact'>[] = [
  { href: '/ops', icon: LayoutDashboard, labelKey: 'opsNavDashboard', exact: true },
  { href: '/ops/kommuner', icon: Building2, labelKey: 'opsNavKommuner' },
  { href: '/ops/accounts', icon: Users, labelKey: 'opsNavAccounts' },
]

export function flattenOpsNav(centralEvents: boolean): OpsNavItem[] {
  return OPS_NAV_GROUPS.flatMap((g) =>
    g.items.filter((item) => !item.requiresCentralEvents || centralEvents)
  )
}

export function isOpsNavActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}
