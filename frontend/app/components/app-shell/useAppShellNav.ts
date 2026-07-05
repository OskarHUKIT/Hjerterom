'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthSession } from '@/context/AuthSessionContext'
import { usePlatformMode } from '@/context/PlatformModeContext'
import { isKommuneAdminRole, isKommuneStaffRole } from '@/app/lib/kommuneRoles'
import { fetchHeaderBundle, headerBundleQueryKey } from '@/app/lib/queries/headerBundleQuery'
import {
  appShellLogoHref,
  appShellMobileMoreItems,
  appShellMobileTabItems,
  appShellNavBadgeCount,
  appShellNavItems,
  resolveAppShellRole,
  type AppShellNavBadge,
  type AppShellNavItem,
  type AppShellPlatformFlags,
  type AppShellRole,
} from '@/lib/appShellNavConfig'

export type AppShellBadgeCounts = {
  notifications: number
  messages: number
  losInbox: number
}

export function useAppShellNav() {
  const { user, isReady: authReady } = useAuthSession()
  const { flags: platformFlags } = usePlatformMode()
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<string | null>(null)
  const [hasSignedTerms, setHasSignedTerms] = useState(false)
  const [landlordBootstrapHref, setLandlordBootstrapHref] = useState('/homeowner/register')
  const [badgeCounts, setBadgeCounts] = useState<AppShellBadgeCounts>({
    notifications: 0,
    messages: 0,
    losInbox: 0,
  })

  const headerBundleQ = useQuery({
    queryKey: headerBundleQueryKey(user?.id ?? ''),
    queryFn: () =>
      fetchHeaderBundle(user!.id, user!.user_metadata, user?.email ?? null),
    enabled: Boolean(user?.id),
    staleTime: 45_000,
    gcTime: 10 * 60 * 1000,
  })

  useEffect(() => {
    if (!user?.id) return
    const b = headerBundleQ.data
    if (!b) return
    setRole(b.role)
    setHasSignedTerms(b.hasSignedTerms)
    setLandlordBootstrapHref(b.landlordBootstrapHref)
    setBadgeCounts({
      notifications: b.unreadCount,
      messages: b.unreadMessageCount,
      losInbox: b.losInboxNewCount,
    })
  }, [user?.id, headerBundleQ.data])

  useEffect(() => {
    if (!authReady) return
    if (!user?.id) {
      setLoading(false)
      return
    }
    if (headerBundleQ.isPending && !headerBundleQ.isError) {
      setLoading(true)
      return
    }
    setLoading(false)
  }, [authReady, user?.id, headerBundleQ.isPending, headerBundleQ.isError])

  useEffect(() => {
    if (user) return
    setRole(null)
    setHasSignedTerms(false)
    setLandlordBootstrapHref('/homeowner/register')
    setBadgeCounts({ notifications: 0, messages: 0, losInbox: 0 })
  }, [user])

  const metadataRoleStr =
    user?.user_metadata && typeof user.user_metadata.role === 'string'
      ? user.user_metadata.role
      : null
  const navRole = role ?? (user ? metadataRoleStr : null)

  const showLandlordFullNav =
    Boolean(user) &&
    navRole != null &&
    !isKommuneStaffRole(navRole) &&
    hasSignedTerms

  const eligible =
    Boolean(user) &&
    !loading &&
    (isKommuneStaffRole(navRole) || showLandlordFullNav)

  const shellRole: AppShellRole | null = resolveAppShellRole(navRole, hasSignedTerms)

  const platform: AppShellPlatformFlags = useMemo(
    () => ({
      social: platformFlags.social,
      centralEvents: platformFlags.centralEvents,
      los: platformFlags.los,
      stripeBookings: platformFlags.stripeBookings,
    }),
    [
      platformFlags.social,
      platformFlags.centralEvents,
      platformFlags.los,
      platformFlags.stripeBookings,
    ]
  )

  const navOpts = useMemo(() => ({ platform }), [platform])

  const sidebarItems: AppShellNavItem[] = useMemo(
    () => appShellNavItems(shellRole, navOpts),
    [shellRole, navOpts]
  )

  const mobileTabItems: AppShellNavItem[] = useMemo(
    () => appShellMobileTabItems(shellRole, navOpts),
    [shellRole, navOpts]
  )

  const mobileMoreItems: AppShellNavItem[] = useMemo(
    () => appShellMobileMoreItems(shellRole, navOpts),
    [shellRole, navOpts]
  )

  const logoHref = !user
    ? '/'
    : shellRole
      ? appShellLogoHref(shellRole, platform, landlordBootstrapHref)
      : isKommuneStaffRole(navRole)
        ? appShellLogoHref('municipality-caseworker', platform, landlordBootstrapHref)
        : hasSignedTerms
          ? '/homeowner/manage'
          : landlordBootstrapHref

  const badgeFor = (badge?: AppShellNavBadge) =>
    badge ? appShellNavBadgeCount(badge, badgeCounts) : 0

  const audience =
    shellRole === 'landlord'
      ? ('landlord' as const)
      : shellRole === 'municipality-admin' || shellRole === 'municipality-caseworker'
        ? ('kommune' as const)
        : null

  return {
    user,
    loading,
    navRole,
    shellRole,
    eligible,
    audience,
    sidebarItems,
    mobileTabItems,
    mobileMoreItems,
    logoHref,
    hasSignedTerms,
    showLandlordFullNav,
    badgeFor,
    badgeCounts,
    platform,
    isAdmin: isKommuneAdminRole(navRole),
  }
}
