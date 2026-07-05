'use client'

import Link from 'next/link'
import {
  Filter,
  MapPin,
  LayoutList,
  ShieldCheck,
  Calendar,
  Settings,
  List,
  Map as MapIcon,
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { TranslationKey } from '@/lib/translations'
import type { NavDbViewMode } from '@/features/mediation/constants/navDatabase'
import type { NavDatabaseStatusCounts } from '@/features/mediation/lib/navDatabaseFetch'

export type NavDatabaseActiveTab =
  | 'Alle'
  | 'Tilgjengelig'
  | 'Utilgjengelig'
  | 'Formidlet'
  | 'Ikke markert'

export type NavDatabasePageToolbarProps = {
  isMobile: boolean
  overviewBack: { href: string; label: string } | null
  viewMode: NavDbViewMode
  kommuneCanEdit: boolean
  activeTab: NavDatabaseActiveTab
  statusCounts: NavDatabaseStatusCounts
  filterActiveCount: number
  showFilters: boolean
  showColumnSettings: boolean
  onViewModeChange: (mode: NavDbViewMode) => void
  onActiveTabChange: (tab: NavDatabaseActiveTab) => void
  onShowFiltersChange: (open: boolean) => void
  onShowColumnSettingsChange: (open: boolean) => void
  onClearFocusListingFromUrl: () => void
  onPersistMobileDbView: (mode: NavDbViewMode) => void
  startViewTransition: (fn: () => void) => void
  t: (key: TranslationKey) => string
}

type StatusTabDef = {
  id: NavDatabaseActiveTab
  labelKey: TranslationKey
  count: number
  dotClass?: string
}

export default function NavDatabasePageToolbar({
  isMobile,
  overviewBack,
  viewMode,
  kommuneCanEdit,
  activeTab,
  statusCounts,
  filterActiveCount,
  showFilters,
  showColumnSettings,
  onViewModeChange,
  onActiveTabChange,
  onShowFiltersChange,
  onShowColumnSettingsChange,
  onClearFocusListingFromUrl,
  onPersistMobileDbView,
  startViewTransition,
  t,
}: NavDatabasePageToolbarProps) {
  const setView = (mode: NavDbViewMode) => {
    startViewTransition(() => {
      if (mode !== 'map') onClearFocusListingFromUrl()
      onViewModeChange(mode)
      if (isMobile && mode !== 'table') onPersistMobileDbView(mode)
    })
  }

  const statusTabs: StatusTabDef[] = [
    { id: 'Alle', labelKey: 'dbStatusAll', count: statusCounts.all },
    {
      id: 'Tilgjengelig',
      labelKey: 'available',
      count: statusCounts.tilgjengelig,
      dotClass: 'ds-lane-dot--tilgjengelig',
    },
    {
      id: 'Utilgjengelig',
      labelKey: 'unavailable',
      count: statusCounts.utilgjengelig,
      dotClass: 'ds-lane-dot--utilgjengelig',
    },
    {
      id: 'Formidlet',
      labelKey: 'formidlet',
      count: statusCounts.formidlet,
      dotClass: 'ds-lane-dot--formidlet',
    },
    {
      id: 'Ikke markert',
      labelKey: 'availabilityUnmarked',
      count: statusCounts.ikkeMarkert,
      dotClass: 'ds-lane-dot--ikke-markert',
    },
  ]

  const desktopViewOptions: { mode: NavDbViewMode; labelKey: TranslationKey; icon: React.ReactNode }[] =
    [
      { mode: 'timeline', labelKey: 'dbViewTimeline', icon: <Calendar size={13} aria-hidden /> },
      { mode: 'table', labelKey: 'dbViewTable', icon: <LayoutList size={13} aria-hidden /> },
      { mode: 'map', labelKey: 'dbViewMap', icon: <MapIcon size={13} aria-hidden /> },
    ]

  const mobileViewOptions: { mode: NavDbViewMode; labelKey: TranslationKey; icon: React.ReactNode }[] =
    [
      { mode: 'list', labelKey: 'dbViewList', icon: <List size={13} aria-hidden /> },
      { mode: 'map', labelKey: 'dbViewMap', icon: <MapPin size={13} aria-hidden /> },
    ]

  const handleStatusTab = (tab: NavDatabaseActiveTab) => {
    onActiveTabChange(tab)
  }

  return (
    <div className="nav-db-page">
      <header className="nav-db-page-header">
        <div>
          {overviewBack ? (
            <Link
              href={overviewBack.href}
              className="nav-link"
              style={{
                marginLeft: '-0.5rem',
                marginBottom: 'var(--space-2)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                fontSize: '0.85rem',
              }}
            >
              ← {overviewBack.label}
            </Link>
          ) : null}
          <div className="nav-db-page-header__title-row">
            <h1 className="nav-db-page-header__title">{t('housingBank')}</h1>
            <span className="nav-db-count-badge">
              {t('dbListingCount').replace('{count}', String(statusCounts.all))}
            </span>
          </div>
          <p className="nav-db-page-header__subtitle">{t('dbPageSubtitle')}</p>
        </div>
        {kommuneCanEdit ? (
          <span className="nav-db-edit-badge">
            <ShieldCheck size={12} aria-hidden />
            {t('dbEditAccessBadge')}
          </span>
        ) : null}
      </header>

      <div className="nav-db-toolbar">
        {!isMobile ? (
          <div className="ds-segmented-group ds-segmented-group--view" role="group" aria-label={t('dbTimelineControls')}>
            {desktopViewOptions.map(({ mode, labelKey, icon }) => {
              const active = viewMode === mode
              return (
                <button
                  key={mode}
                  type="button"
                  className={`ds-segmented-group__btn${active ? ' ds-segmented-group__btn--active' : ''}`}
                  aria-pressed={active}
                  onClick={() => setView(mode)}
                >
                  {icon}
                  <span>{t(labelKey)}</span>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="ds-segmented-group ds-segmented-group--view" role="group" aria-label={t('dbMobileTools')}>
            {mobileViewOptions.map(({ mode, labelKey, icon }) => {
              const active = viewMode === mode
              return (
                <button
                  key={mode}
                  type="button"
                  className={`ds-segmented-group__btn${active ? ' ds-segmented-group__btn--active' : ''}`}
                  aria-pressed={active}
                  onClick={() => setView(mode)}
                >
                  {icon}
                  <span>{t(labelKey)}</span>
                </button>
              )
            })}
          </div>
        )}

        <div className="nav-db-toolbar__actions">
          <button
            type="button"
            className="nav-db-ghost-btn"
            aria-pressed={showFilters}
            onClick={() => {
              onShowFiltersChange(!showFilters)
              onShowColumnSettingsChange(false)
            }}
          >
            <Filter size={14} aria-hidden />
            <span>{showFilters ? t('dbFilterClose') : t('dbFilterOpen')}</span>
            {filterActiveCount > 0 ? (
              <span className={`ds-badge-count${showFilters ? ' ds-badge-count--active' : ''}`}>
                {filterActiveCount}
              </span>
            ) : null}
          </button>

          {!isMobile && viewMode !== 'map' ? (
            <TooltipProvider delay={200}>
              <Tooltip>
                <TooltipTrigger
                  className="nav-db-ghost-btn nav-db-ghost-btn--icon"
                  aria-pressed={showColumnSettings}
                  aria-label={t('dbColumnSettingsTooltip')}
                  onClick={() => {
                    onShowColumnSettingsChange(!showColumnSettings)
                    onShowFiltersChange(false)
                  }}
                >
                  <Settings size={14} aria-hidden />
                </TooltipTrigger>
                <TooltipContent>{t('dbColumnSettingsTooltip')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
        </div>
      </div>

      {viewMode !== 'map' ? (
        <div className="ds-tab-pills" role="tablist" aria-label={t('dbMapShowStatuses')}>
          {statusTabs.map((tab) => {
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={`ds-tab-pill${active ? ' ds-tab-pill--active' : ''}`}
                onClick={() => handleStatusTab(tab.id)}
              >
                {tab.dotClass ? <span className={`ds-lane-dot ${tab.dotClass}`} aria-hidden /> : null}
                <span>{t(tab.labelKey)}</span>
                <span className="ds-badge-count">{tab.count}</span>
              </button>
            )
          })}
        </div>
      ) : (
        <p
          className="nav-db-page-header__subtitle"
          style={{ marginBottom: 'var(--space-4)' }}
        >
          {t('dbMapModeHint')}
        </p>
      )}
    </div>
  )
}
