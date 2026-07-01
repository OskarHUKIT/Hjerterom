'use client'

import Link from 'next/link'
import {
  Filter,
  MapPin,
  LayoutList,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Calendar,
  Settings,
  List,
} from 'lucide-react'
import { isKommuneStaffRole } from '@/app/lib/kommuneRoles'
import type { TranslationKey } from '@/lib/translations'
import type { NavDbViewMode } from '@/features/mediation/constants/navDatabase'

export type NavDatabasePageToolbarProps = {
  isMobile: boolean
  overviewBack: { href: string; label: string } | null
  viewMode: NavDbViewMode
  userRole: string | null
  activeTab: 'Tilgjengelig' | 'Utilgjengelig' | 'Formidlet'
  showFilters: boolean
  showColumnSettings: boolean
  onViewModeChange: (mode: NavDbViewMode) => void
  onActiveTabChange: (tab: 'Tilgjengelig' | 'Utilgjengelig' | 'Formidlet') => void
  onShowFiltersChange: (open: boolean) => void
  onShowColumnSettingsChange: (open: boolean) => void
  onClearFocusListingFromUrl: () => void
  onPersistMobileDbView: (mode: NavDbViewMode) => void
  startViewTransition: (fn: () => void) => void
  t: (key: TranslationKey) => string
}

export default function NavDatabasePageToolbar({
  isMobile,
  overviewBack,
  viewMode,
  userRole,
  activeTab,
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
  const setViewMode = onViewModeChange
  const setActiveTab = onActiveTabChange
  const setShowFilters = onShowFiltersChange
  const setShowColumnSettings = onShowColumnSettingsChange
  const clearFocusListingFromUrl = onClearFocusListingFromUrl
  const persistMobileDbView = onPersistMobileDbView
  return (
    <>
<div
        className="db-header-row animate-delay-1"
        style={{
          marginBottom: isMobile ? 'var(--space-3)' : 'var(--space-8)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: isMobile ? 'var(--space-2)' : 'var(--space-4)',
        }}
      >
        <div style={{ minWidth: 0 }}>
          {overviewBack && (
            <Link
              href={overviewBack.href}
              className="nav-link"
              style={{
                marginLeft: '-1rem',
                marginBottom: isMobile ? 0 : 'var(--space-2)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                fontSize: isMobile ? '0.85rem' : undefined,
              }}
            >
              ← {overviewBack.label}
            </Link>
          )}
          <h1
            style={{
              fontSize: isMobile ? 'clamp(1.35rem, 5vw, 1.75rem)' : 'clamp(1.5rem, 5vw, 2.75rem)',
              margin: isMobile ? '2px 0 0' : undefined,
              lineHeight: isMobile ? 1.2 : undefined,
            }}
          >
            {t('housingBank')}
          </h1>
        </div>
        {!isMobile && (
          <div className="db-view-btns" style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button
              type="button"
              onClick={() =>
                startViewTransition(() => {
                  clearFocusListingFromUrl()
                  setViewMode('table')
                })
              }
              style={{
                padding: 'var(--space-3)',
                borderRadius: '10px',
                background: viewMode === 'table' ? 'var(--color-accent)' : 'var(--bg-app)',
                border: '1px solid var(--border-subtle)',
                cursor: 'pointer',
                color: viewMode === 'table' ? 'white' : 'var(--text-main)',
              }}
              title={t('dbViewTable')}
            >
              <LayoutList size={20} />
            </button>
            <button
              type="button"
              onClick={() => startViewTransition(() => setViewMode('map'))}
              style={{
                padding: 'var(--space-3)',
                borderRadius: '10px',
                background: viewMode === 'map' ? 'var(--color-accent)' : 'var(--bg-app)',
                border: '1px solid var(--border-subtle)',
                cursor: 'pointer',
                color: viewMode === 'map' ? 'white' : 'var(--text-main)',
              }}
              title={t('dbViewMap')}
            >
              <MapPin size={20} />
            </button>
            <button
              type="button"
              onClick={() =>
                startViewTransition(() => {
                  clearFocusListingFromUrl()
                  setViewMode('timeline')
                })
              }
              style={{
                padding: 'var(--space-3)',
                borderRadius: '10px',
                background: viewMode === 'timeline' ? 'var(--color-accent)' : 'var(--bg-app)',
                border: '1px solid var(--border-subtle)',
                cursor: 'pointer',
                color: viewMode === 'timeline' ? 'white' : 'var(--text-main)',
              }}
              title={t('dbViewTimeline')}
            >
              <Calendar size={20} />
            </button>
          </div>
        )}
        {isMobile && (
          <div
            className="db-view-btns"
            style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', width: '100%' }}
          >
            <button
              type="button"
              onClick={() => {
                startViewTransition(() => {
                  clearFocusListingFromUrl()
                  setViewMode('list')
                  persistMobileDbView('list')
                })
              }}
              style={{
                padding: 'var(--space-3)',
                borderRadius: '10px',
                minHeight: 'var(--touch-target)',
                minWidth: 'var(--touch-target)',
                background: viewMode === 'list' ? 'var(--color-accent)' : 'var(--bg-app)',
                border: '1px solid var(--border-subtle)',
                cursor: 'pointer',
                color: viewMode === 'list' ? 'white' : 'var(--text-main)',
              }}
              title={t('dbViewList')}
              aria-pressed={viewMode === 'list'}
              aria-label={t('dbViewList')}
            >
              <List size={20} />
            </button>
            <button
              type="button"
              onClick={() => {
                startViewTransition(() => {
                  setViewMode('map')
                  persistMobileDbView('map')
                })
              }}
              style={{
                padding: 'var(--space-3)',
                borderRadius: '10px',
                minHeight: 'var(--touch-target)',
                minWidth: 'var(--touch-target)',
                background: viewMode === 'map' ? 'var(--color-accent)' : 'var(--bg-app)',
                border: '1px solid var(--border-subtle)',
                cursor: 'pointer',
                color: viewMode === 'map' ? 'white' : 'var(--text-main)',
              }}
              title={t('dbViewMap')}
              aria-pressed={viewMode === 'map'}
              aria-label={t('dbViewMap')}
            >
              <MapPin size={20} />
            </button>
          </div>
        )}
      </div>

      <div
        className="db-tabs-row animate-delay-2"
        style={{
          display: 'flex',
          gap: isMobile ? 'var(--space-2)' : 'var(--space-4)',
          marginBottom: isMobile ? 'var(--space-3)' : 'var(--space-6)',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: 'var(--space-1)',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          rowGap: isMobile ? 'var(--space-2)' : 'var(--space-4)',
        }}
      >
        <div
          className="tabs-scroll"
          style={{
            display: 'flex',
            gap: 'var(--space-4)',
            flex: '1 1 auto',
            minWidth: 0,
            overflowX: 'auto',
            paddingBottom: '4px',
            alignItems: 'flex-end',
          }}
        >
          {viewMode === 'map' ? null : viewMode !== 'timeline' ? (
            (['Tilgjengelig', 'Utilgjengelig', 'Formidlet'] as const).map((tab) => {
              const tabLabel =
                tab === 'Tilgjengelig'
                  ? t('available')
                  : tab === 'Utilgjengelig'
                    ? t('unavailable')
                    : t('formidlet')
              const iconOnly = isKommuneStaffRole(userRole) && isMobile
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  aria-label={tabLabel}
                  title={tabLabel}
                  style={{
                    padding: iconOnly ? 'var(--space-3)' : 'var(--space-3) var(--space-4)',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: 'none',
                    border: 'none',
                    color: activeTab === tab ? 'var(--color-sky-blue)' : 'var(--text-muted)',
                    borderBottom:
                      activeTab === tab
                        ? '2px solid var(--color-sky-blue)'
                        : '2px solid transparent',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: iconOnly ? 0 : 8,
                  }}
                >
                  {tab === 'Tilgjengelig' && (
                    <CheckCircle2
                      size={iconOnly ? 22 : 16}
                      style={{ color: activeTab === tab ? 'var(--color-teal)' : undefined }}
                      aria-hidden
                    />
                  )}
                  {tab === 'Utilgjengelig' && (
                    <XCircle
                      size={iconOnly ? 22 : 16}
                      style={{ color: activeTab === tab ? '#ef4444' : undefined }}
                      aria-hidden
                    />
                  )}
                  {tab === 'Formidlet' && (
                    <ShieldCheck
                      size={iconOnly ? 22 : 16}
                      style={{ color: activeTab === tab ? 'var(--color-sky-blue)' : undefined }}
                      aria-hidden
                    />
                  )}
                  {!iconOnly && tabLabel}
                </button>
              )
            })
          ) : (
            <div
              style={{
                padding: 'var(--space-3) 0',
                color: 'var(--color-sky-blue)',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Calendar size={18} /> {t('dbAvailabilityCalendarTitle')}
            </div>
          )}
        </div>
        <div
          className="db-action-btns"
          style={{
            display: 'flex',
            gap: isMobile ? 'var(--space-2)' : 'var(--space-2)',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          {isMobile ? (
            <button
              type="button"
              onClick={() => {
                setShowFilters(!showFilters)
                setShowColumnSettings(false)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: '12px',
                background: showFilters ? 'var(--color-accent)' : 'var(--bg-app)',
                border: '1px solid var(--border-subtle)',
                color: showFilters ? 'white' : 'var(--text-main)',
                cursor: 'pointer',
                fontWeight: 600,
                minHeight: 'var(--touch-target)',
              }}
            >
              <Filter size={18} />{' '}
              <span className="btn-label">
                {showFilters ? t('dbFilterClose') : t('dbFilterOpen')}
              </span>
            </button>
          ) : (
            <>
              {viewMode !== 'map' && (
                <button
                  type="button"
                  onClick={() => {
                    setShowColumnSettings(!showColumnSettings)
                    setShowFilters(false)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: 'var(--space-2) var(--space-5)',
                    borderRadius: '12px',
                    background: showColumnSettings ? 'var(--color-accent)' : 'var(--bg-app)',
                    border: '1px solid var(--border-subtle)',
                    color: showColumnSettings ? 'white' : 'var(--text-main)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    minHeight: 'var(--touch-target)',
                  }}
                >
                  <Settings size={18} />{' '}
                  <span className="btn-label">{t('dbCustomizeColumns')}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowFilters(!showFilters)
                  setShowColumnSettings(false)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: 'var(--space-2) var(--space-5)',
                  borderRadius: '12px',
                  background: showFilters ? 'var(--color-accent)' : 'var(--bg-app)',
                  border: '1px solid var(--border-subtle)',
                  color: showFilters ? 'white' : 'var(--text-main)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  minHeight: 'var(--touch-target)',
                }}
              >
                <Filter size={18} />{' '}
                <span className="btn-label">
                  {showFilters ? t('dbFilterClose') : t('dbFilterOpen')}
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}
