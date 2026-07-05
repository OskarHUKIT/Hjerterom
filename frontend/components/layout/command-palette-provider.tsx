'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  Building2,
  CalendarPlus,
  CheckCircle2,
  Globe,
  Moon,
  Search,
  Sun,
} from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { useTheme } from '@/context/ThemeContext'
import { usePlatformMode } from '@/context/PlatformModeContext'
import { useAuthSession } from '@/context/AuthSessionContext'
import { useToast } from '@/app/components/design-system'
import { supabase } from '@/app/lib/supabase'
import {
  appShellNavItems,
  resolveAppShellRole,
  type AppShellNavItem,
  type AppShellRole,
} from '@/lib/appShellNavConfig'
import { flattenOpsNav } from '@/app/ops/lib/opsNav'
import { useAppShellNav } from '@/app/components/app-shell/useAppShellNav'
import { useAuthGate } from '@/features/auth/hooks/useAuthGate'
import { searchBoligbankListings } from '@/lib/commandPaletteListings'
import {
  getCommandPaletteRecents,
  recordCommandPaletteVisit,
  touchCommandPaletteRecent,
} from '@/lib/commandPaletteRecents'
import { isCommandPaletteRoute } from '@/lib/commandPaletteRoutes'
import {
  CommandPalette,
  type CommandPaletteItem,
  type CommandPaletteSection,
} from '@/components/ui/command-palette'
import type { Locale, TranslationKey } from '@/lib/translations'

type CommandPaletteContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null)

export function useCommandPalette() {
  const ctx = useContext(CommandPaletteContext)
  if (!ctx) {
    throw new Error('useCommandPalette must be used within CommandPaletteProvider')
  }
  return ctx
}

function nextLocale(current: Locale): Locale {
  if (current === 'no') return 'se'
  if (current === 'se') return 'en'
  return 'no'
}

async function closeLatestOpenInquiry(
  shellRole: AppShellRole | null,
  userId: string
): Promise<boolean> {
  if (shellRole === 'event-caseworker') {
    const { data: staffRows } = await supabase
      .from('central_event_staff')
      .select('event_id')
      .eq('profile_id', userId)
    const eventIds = (staffRows ?? []).map((row) => row.event_id)
    if (eventIds.length === 0) return false

    const { data: inquiry } = await supabase
      .from('event_inquiries')
      .select('id')
      .in('event_id', eventIds)
      .neq('status', 'closed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!inquiry?.id) return false

    const { error } = await supabase
      .from('event_inquiries')
      .update({ status: 'closed', updated_at: new Date().toISOString() })
      .eq('id', inquiry.id)

    return !error
  }

  if (shellRole === 'municipality-admin' || shellRole === 'municipality-caseworker') {
    const { data: inquiry } = await supabase
      .from('event_inquiries')
      .select('id')
      .neq('status', 'closed')
      .or(`assigned_profile_id.eq.${userId},status.eq.new`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!inquiry?.id) return false

    const { error } = await supabase.rpc('kommune_update_event_inquiry', {
      p_inquiry_id: inquiry.id,
      p_status: 'closed',
      p_assign_to_self: false,
    })

    return !error
  }

  return false
}

function navItemToPaletteItem(
  item: AppShellNavItem,
  label: string,
  onNavigate: (href: string, title: string) => void
): CommandPaletteItem {
  return {
    id: `nav-${item.id}`,
    section: 'navigation',
    title: label,
    icon: item.icon,
    keywords: [item.href, item.id],
    onSelect: () => onNavigate(item.href, label),
  }
}

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const toggle = useCallback(() => setOpen((value) => !value), [])

  return (
    <CommandPaletteContext.Provider value={{ open, setOpen, toggle }}>
      {children}
      <GlobalCommandPalette open={open} onOpenChange={setOpen} />
    </CommandPaletteContext.Provider>
  )
}

type GlobalCommandPaletteProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function GlobalCommandPalette({ open, onOpenChange }: GlobalCommandPaletteProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { t, locale, setLocale } = useLanguage()
  const { toggleTheme, theme } = useTheme()
  const toast = useToast()
  const { user } = useAuthSession()
  const { flags } = usePlatformMode()
  const appShell = useAppShellNav()
  const opsAccess = useAuthGate({ mode: 'ops' })

  const [query, setQuery] = useState('')
  const [listingHits, setListingHits] = useState<
    Awaited<ReturnType<typeof searchBoligbankListings>>
  >([])
  const [searchingListings, setSearchingListings] = useState(false)
  const [recentsVersion, setRecentsVersion] = useState(0)

  const enabled = Boolean(user) && isCommandPaletteRoute(pathname)
  const isOps = pathname?.startsWith('/ops') ?? false

  const shellRole: AppShellRole | null = isOps
    ? null
    : resolveAppShellRole(appShell.navRole, appShell.hasSignedTerms)

  const canSearchListings =
    !isOps &&
    (shellRole === 'municipality-admin' || shellRole === 'municipality-caseworker') &&
    flags.social !== false

  const canCloseInquiry =
    !isOps &&
    flags.centralEvents !== false &&
    (shellRole === 'municipality-admin' ||
      shellRole === 'municipality-caseworker' ||
      shellRole === 'event-caseworker')

  const navigate = useCallback(
    (href: string, title: string, kind: 'route' | 'listing' = 'route', subtitle?: string) => {
      recordCommandPaletteVisit({
        id: `${kind}:${href}`,
        kind,
        title,
        subtitle,
        href,
      })
      setRecentsVersion((v) => v + 1)
      onOpenChange(false)
      router.push(href)
    },
    [onOpenChange, router]
  )

  useEffect(() => {
    if (!enabled) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [enabled, open, onOpenChange])

  useEffect(() => {
    if (!canSearchListings || !query.trim()) {
      setListingHits([])
      setSearchingListings(false)
      return
    }

    setSearchingListings(true)
    const timer = window.setTimeout(() => {
      void searchBoligbankListings(query.trim(), 8)
        .then(setListingHits)
        .finally(() => setSearchingListings(false))
    }, 200)

    return () => window.clearTimeout(timer)
  }, [canSearchListings, query])

  const sections = useMemo((): CommandPaletteSection[] => {
    if (!enabled) return []

    const labelForNav = (item: AppShellNavItem) =>
      t(item.labelKey as TranslationKey)

    const navigationItems: CommandPaletteItem[] = isOps
      ? flattenOpsNav(flags.centralEvents).map((item) => ({
          id: `ops-${item.href}`,
          section: 'navigation' as const,
          title: t(item.labelKey),
          icon: item.icon,
          keywords: [item.href],
          onSelect: () => navigate(item.href, t(item.labelKey)),
        }))
      : appShellNavItems(shellRole, { platform: appShell.platform }).map((item) =>
          navItemToPaletteItem(item, labelForNav(item), (href, title) => navigate(href, title))
        )

    const listingItems: CommandPaletteItem[] = listingHits.map((hit) => {
      const title = hit.address?.trim() || t('housingBank')
      const subtitle = hit.city?.trim() || undefined
      const href = `/listings/${hit.id}?view=nav`
      return {
        id: `listing-${hit.id}`,
        section: 'listings' as const,
        title,
        subtitle,
        icon: Building2,
        keywords: [hit.id, hit.city ?? '', hit.address ?? ''],
        onSelect: () => navigate(href, title, 'listing', subtitle),
      }
    })

    const actionItems: CommandPaletteItem[] = []

    if (isOps && flags.centralEvents) {
      actionItems.push({
        id: 'action-new-event',
        section: 'actions',
        title: t('commandPaletteActionNewEvent'),
        icon: CalendarPlus,
        onSelect: () => navigate('/ops/events/new', t('commandPaletteActionNewEvent')),
      })
    }

    if (canCloseInquiry && user?.id) {
      actionItems.push({
        id: 'action-close-inquiry',
        section: 'actions',
        title: t('commandPaletteActionMarkInquiryClosed'),
        icon: CheckCircle2,
        onSelect: () => {
          void (async () => {
            const ok = await closeLatestOpenInquiry(shellRole, user.id)
            onOpenChange(false)
            toast(
              ok ? t('commandPaletteInquiryClosed') : t('commandPaletteInquiryCloseNone'),
              ok ? 'success' : 'info'
            )
          })()
        },
      })
    }

    actionItems.push({
      id: 'action-switch-language',
      section: 'actions',
      title: t('commandPaletteActionSwitchLanguage'),
      subtitle: t('commandPaletteActionSwitchLanguageHint'),
      icon: Globe,
      onSelect: () => {
        const next = nextLocale(locale)
        setLocale(next)
        onOpenChange(false)
        toast(t('commandPaletteLanguageSwitched'), 'success')
      },
    })

    actionItems.push({
      id: 'action-toggle-theme',
      section: 'actions',
      title: t('commandPaletteActionToggleTheme'),
      subtitle: theme === 'dark' ? t('lightMode') : t('darkMode'),
      icon: theme === 'dark' ? Sun : Moon,
      onSelect: () => {
        toggleTheme()
        onOpenChange(false)
      },
    })

    const recentItems: CommandPaletteItem[] = getCommandPaletteRecents().map((recent) => ({
      id: `recent-${recent.id}`,
      section: 'recent' as const,
      title: recent.title,
      subtitle: recent.subtitle,
      icon: recent.kind === 'listing' ? Building2 : undefined,
      onSelect: () => {
        touchCommandPaletteRecent(recent.id)
        onOpenChange(false)
        router.push(recent.href)
      },
    }))

    const built: CommandPaletteSection[] = []

    if (!query.trim() && recentItems.length > 0) {
      built.push({
        id: 'recent',
        label: t('commandPaletteSectionRecent'),
        items: recentItems,
      })
    }

    if (navigationItems.length > 0) {
      built.push({
        id: 'navigation',
        label: t('commandPaletteSectionNavigation'),
        items: navigationItems,
      })
    }

    if (canSearchListings && (query.trim() || listingItems.length > 0)) {
      built.push({
        id: 'listings',
        label: t('commandPaletteSectionListings'),
        items: query.trim() ? listingItems : [],
      })
    }

    if (actionItems.length > 0) {
      built.push({
        id: 'actions',
        label: t('commandPaletteSectionActions'),
        items: actionItems,
      })
    }

    return built
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recentsVersion busts recent list
  }, [
    enabled,
    isOps,
    flags.centralEvents,
    flags.social,
    shellRole,
    appShell.platform,
    listingHits,
    query,
    canSearchListings,
    canCloseInquiry,
    user?.id,
    locale,
    theme,
    t,
    navigate,
    onOpenChange,
    router,
    setLocale,
    toggleTheme,
    toast,
    recentsVersion,
  ])

  if (!enabled) return null
  if (isOps && opsAccess.data?.kind !== 'ok') return null

  return (
    <CommandPalette
      open={open}
      onOpenChange={onOpenChange}
      query={query}
      onQueryChange={setQuery}
      sections={sections}
      placeholder={t('commandPalettePlaceholder')}
      emptyLabel={t('commandPaletteNoResults')}
      resultsCountLabel={t('commandPaletteResultsCount')}
      searching={searchingListings}
      footerHint={t('commandPaletteNavigateHint')}
    />
  )
}

type CommandPaletteTriggerProps = {
  className?: string
  compact?: boolean
}

export function CommandPaletteTrigger({ className, compact }: CommandPaletteTriggerProps) {
  const { toggle } = useCommandPalette()
  const { t } = useLanguage()
  const pathname = usePathname()
  const enabled = isCommandPaletteRoute(pathname)

  if (!enabled) return null

  return (
    <button
      type="button"
      className={`hrt-chrome-round-btn${compact ? ' hrt-chrome-round-btn--compact' : ''}${className ? ` ${className}` : ''}`}
      onClick={toggle}
      aria-label={t('commandPaletteOpen')}
      title={t('commandPaletteOpenHint')}
    >
      <Search size={compact ? 14 : 16} aria-hidden />
    </button>
  )
}
