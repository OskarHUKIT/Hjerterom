'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthSession } from '@/context/AuthSessionContext'
import { usePlatformMode } from '@/context/PlatformModeContext'
import { isKommuneAdminRole, isKommuneStaffRole } from '@/app/lib/kommuneRoles'
import { fetchHeaderBundle, headerBundleQueryKey } from '@/app/lib/queries/headerBundleQuery'
import {
  navItemsForSidebar,
  navItemsFor,
  type NavAudience,
  type NavBadge,
  navBadgeCount,
} from '@/lib/navConfig'

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

  const audience: NavAudience | null = isKommuneStaffRole(navRole)
    ? 'kommune'
    : showLandlordFullNav
      ? 'landlord'
      : null

  const platformNav = {
    centralEvents: platformFlags.centralEvents,
    los: platformFlags.los,
  }

  const sidebarItems = useMemo(() => {
    if (!audience) return []
    return navItemsForSidebar(audience, {
      isAdmin: isKommuneAdminRole(navRole),
      platform: platformNav,
    })
  }, [audience, navRole, platformFlags.centralEvents, platformFlags.los])

  const mobileTabItems = useMemo(() => {
    if (!audience) return []
    return navItemsFor(audience, 'mobileTab', {
      isAdmin: isKommuneAdminRole(navRole),
      platform: platformNav,
    })
  }, [audience, navRole, platformFlags.centralEvents, platformFlags.los])

  const mobileMoreItems = useMemo(() => {
    if (!audience || audience !== 'kommune') return []
    return navItemsFor('kommune', 'mobileMore', {
      isAdmin: isKommuneAdminRole(navRole),
      platform: platformNav,
    })
  }, [audience, navRole, platformFlags.centralEvents, platformFlags.los])

  const logoHref = !user
    ? '/'
    : isKommuneStaffRole(navRole)
      ? '/nav/database'
      : hasSignedTerms
        ? '/homeowner/manage'
        : landlordBootstrapHref

  const badgeFor = (badge?: NavBadge) =>
    badge ? navBadgeCount(badge, badgeCounts) : 0

  return {
    user,
    loading,
    navRole,
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
  }
}
