'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Home as HomeIcon,
  Info,
  Sparkles,
  LayoutDashboard,
  Building2,
  KeyRound,
  CalendarDays,
} from 'lucide-react'
import { getAuthUserDeduped } from '@/app/lib/supabase'
import { landlordOnboardingKey, LANDLORD_ONBOARDING_PREFIX } from '@/app/lib/landlordOnboarding'
import LandlordOnboardingModal from '@/app/components/LandlordOnboardingModal'
import {
  PwaInstallPromptDialog,
  PWA_PROMPT_DISMISSED_KEY,
  PWA_PROMPT_MANAGE_SESSION_KEY,
} from '@/app/components/PWAInstallPrompt'
import { useLanguage } from '@/context/LanguageContext'
import LoadingPlaceholder from '@/app/components/LoadingPlaceholder'
import { EmptyState, InteractiveEmptyState } from '@/app/components/design-system'
import EventTaskCards from '@/features/listings/components/EventTaskCards'
import LandlordStripeConnect from '@/features/bookings/components/LandlordStripeConnect'
import { usePlatformMode } from '@/context/PlatformModeContext'
import { shouldShowManageFullScreenSpinner } from '@/features/listings/lib/landlordManagePageGate'
import { useLandlordManageBootstrap } from '@/features/listings/hooks/useLandlordManageBootstrap'
import {
  useLandlordListingsQuery,
  type ListingsOnboardingCallbacks,
} from '@/features/listings/hooks/useLandlordListingsQuery'
import LandlordManageFilters, {
  type ManageListingFilter,
} from '@/features/listings/components/manage/LandlordManageFilters'
import LandlordListingCard from '@/features/listings/components/manage/LandlordListingCard'
import LandlordNonSubscribedBanner from '@/features/listings/components/LandlordNonSubscribedBanner'
import { listingAvailabilityStatusToday } from '@/app/lib/listingAvailabilityStatusToday'
import '@/features/listings/landlord-manage.css'

export default function HomeownerManage() {
  const { t } = useLanguage()
  const { flags: platformFlags } = usePlatformMode()
  const router = useRouter()
  const [showOverviewIntro, setShowOverviewIntro] = useState(false)
  const [showMineBoligerIntro, setShowMineBoligerIntro] = useState(false)
  const onboardingRef = useRef<ListingsOnboardingCallbacks | null>(null)
  const {
    myListings,
    availability,
    eventOptInsByListing,
    loading,
    setLoading,
    fetchError,
    setFetchError,
    refetch: fetchData,
  } = useLandlordListingsQuery({
    router,
    centralEvents: platformFlags.centralEvents,
    onboardingRef,
  })
  const {
    pageGate,
    pendingPwaAfterWelcome,
    pendingPwaBeforeOverview,
    setPendingPwaBeforeOverview,
    dismissLandlordWelcome,
    dismissPwaAfterWelcome,
  } = useLandlordManageBootstrap({
    refetch: fetchData,
    loading,
    setLoading,
    setFetchError,
  })
  onboardingRef.current = {
    setPendingPwaBeforeOverview,
    setShowOverviewIntro,
    setShowMineBoligerIntro,
  }
  const [filter, setFilter] = useState<ManageListingFilter>('all')
  const filtersRowRef = useRef<HTMLDivElement>(null)
  const [isMobileLayout, setIsMobileLayout] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.location.hash === '#bookings') {
      router.replace('/homeowner/bookings')
    }
  }, [router])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(max-width: 768px)')
    const sync = () => setIsMobileLayout(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const scrollFiltersIntoViewMobile = useCallback(() => {
    if (typeof window === 'undefined' || window.innerWidth > 768) return
    requestAnimationFrame(() => {
      filtersRowRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    })
  }, [])

  const dismissOverviewIntro = async () => {
    const user = await getAuthUserDeduped()
    if (user && typeof window !== 'undefined') {
      localStorage.setItem(landlordOnboardingKey(LANDLORD_ONBOARDING_PREFIX.overview, user.id), '1')
    }
    setShowOverviewIntro(false)
    if (user && myListings.length > 0 && typeof window !== 'undefined') {
      const mineKey = landlordOnboardingKey(LANDLORD_ONBOARDING_PREFIX.mineBoliger, user.id)
      if (!localStorage.getItem(mineKey)) {
        setShowMineBoligerIntro(true)
      }
    }
  }

  const dismissMineBoligerIntro = async () => {
    const user = await getAuthUserDeduped()
    if (user && typeof window !== 'undefined') {
      localStorage.setItem(
        landlordOnboardingKey(LANDLORD_ONBOARDING_PREFIX.mineBoliger, user.id),
        '1'
      )
    }
    setShowMineBoligerIntro(false)
  }

  const filteredListings = myListings.filter((l) => {
    if (filter === 'all') return true
    if (filter === 'availableToday') {
      return listingAvailabilityStatusToday(l.id, availability) === 'Tilgjengelig'
    }
    if (filter === 'mediated') {
      return listingAvailabilityStatusToday(l.id, availability) === 'Formidla'
    }
    if (filter === 'tourismActive') {
      return Boolean(l.tourism_enabled)
    }
    if (filter === 'eventActive') {
      return (eventOptInsByListing[l.id] ?? []).some((e) => e.status === 'active')
    }
    return true
  })

  if (shouldShowManageFullScreenSpinner(pageGate, loading, fetchError)) {
    return (
      <main className="container hm-page-loading">
        <LoadingPlaceholder minHeight={160} />
      </main>
    )
  }

  if (pageGate === 'welcome') {
    return (
      <>
        <PwaInstallPromptDialog
          open={pendingPwaAfterWelcome}
          onDismiss={(remember) => dismissPwaAfterWelcome(remember)}
        />
        {!pendingPwaAfterWelcome && (
          <LandlordOnboardingModal
            open
            title={t('landlordWelcomeTitle')}
            titleId="landlord-welcome-title"
            onDismiss={() => void dismissLandlordWelcome()}
            ctaLabel={t('landlordWelcomeCta')}
            icon={Sparkles}
            iconAccent="teal"
            skipLinkLabel={t('onboardingSkipIntro')}
            onSkip={() => void dismissLandlordWelcome()}
          >
            <p className="hm-onboard-lead">{t('landlordWelcomeIntro')}</p>
            <ul className="hm-onboard-list">
              <li className="hm-onboard-list-item">{t('landlordWelcomeBulletRegister')}</li>
              <li className="hm-onboard-list-item">{t('landlordWelcomeBulletMessages')}</li>
              <li>{t('landlordWelcomeBulletSign')}</li>
            </ul>
            <div className="hm-onboard-callout hm-onboard-callout--blue">
              <h2 className="hm-onboard-callout-title hm-onboard-callout-title--blue">
                {t('landlordWelcomeOrderTitle')}
              </h2>
              <p className="hm-onboard-callout-body">{t('landlordWelcomeOrderBody')}</p>
            </div>
          </LandlordOnboardingModal>
        )}
      </>
    )
  }

  const primaryListingCity = myListings[0]?.city ?? null

  return (
    <main className="container hm-manage-page">
      <LandlordNonSubscribedBanner city={primaryListingCity} />
      <PwaInstallPromptDialog
        open={pendingPwaBeforeOverview}
        onDismiss={(remember) => {
          try {
            if (remember) localStorage.setItem(PWA_PROMPT_DISMISSED_KEY, '1')
            sessionStorage.setItem(PWA_PROMPT_MANAGE_SESSION_KEY, '1')
          } catch {
            /* ignore */
          }
          setPendingPwaBeforeOverview(false)
          setShowOverviewIntro(true)
        }}
      />

      <LandlordOnboardingModal
        open={showOverviewIntro}
        title={t('landlordOverviewTitle')}
        titleId="landlord-overview-title"
        onDismiss={() => void dismissOverviewIntro()}
        ctaLabel={t('landlordOverviewCta')}
        icon={LayoutDashboard}
        iconAccent="blue"
        skipLinkLabel={t('onboardingSkipIntro')}
        onSkip={() => void dismissOverviewIntro()}
      >
        <p className="hm-onboard-lead">{t('landlordOverviewLead')}</p>
        <ul className="hm-onboard-list">
          <li className="hm-onboard-list-item">{t('landlordOverviewBullet1')}</li>
          <li className="hm-onboard-list-item">{t('landlordOverviewBullet2')}</li>
          <li>{t('landlordOverviewBullet3')}</li>
        </ul>
        <div className="hm-onboard-callout hm-onboard-callout--teal">
          <h2 className="hm-onboard-callout-title hm-onboard-callout-title--teal">
            {t('landlordOverviewExpectTitle')}
          </h2>
          <p className="hm-onboard-callout-body">{t('landlordOverviewExpectBody')}</p>
        </div>
      </LandlordOnboardingModal>

      <LandlordOnboardingModal
        open={showMineBoligerIntro && !showOverviewIntro}
        title={t('landlordMineBoligerTitle')}
        titleId="landlord-mineboliger-title"
        onDismiss={() => void dismissMineBoligerIntro()}
        ctaLabel={t('landlordMineBoligerCta')}
        icon={HomeIcon}
        iconAccent="teal"
        skipLinkLabel={t('onboardingSkipIntro')}
        onSkip={() => void dismissMineBoligerIntro()}
      >
        <p className="hm-onboard-lead">{t('landlordMineBoligerLead')}</p>
        <ul className="hm-onboard-list hm-onboard-list--spaced">
          <li className="hm-onboard-list-item">{t('landlordMineBoligerBullet1')}</li>
          <li className="hm-onboard-list-item">{t('landlordMineBoligerBullet2')}</li>
          <li>{t('landlordMineBoligerBullet3')}</li>
        </ul>
      </LandlordOnboardingModal>

      <div className="hm-header-row">
        <div>
          <h1 className="hm-page-title">{t('myProperties')}</h1>
        </div>
        <Link href="/homeowner/register" className="button hm-register-cta">
          <Plus size={22} /> <span className="hm-btn-label">{t('registerNewProperty')}</span>
        </Link>
      </div>

      {platformFlags.centralEvents ? (
        <EventTaskCards listingIds={myListings.map((l) => l.id)} />
      ) : null}
      {platformFlags.stripeBookings ? <LandlordStripeConnect /> : null}
      {platformFlags.stripeBookings ? (
        <Link href="/homeowner/bookings" className="card hm-bookings-link">
          <CalendarDays size={22} aria-hidden />
          <div>
            <div className="hm-bookings-link-title">{t('homeownerNavBookings')}</div>
            <div className="hm-bookings-link-desc">{t('landlordBookingsManageLinkDesc')}</div>
          </div>
        </Link>
      ) : null}

      <div>
          {myListings.length > 0 ? (
            <LandlordManageFilters
              filter={filter}
              onFilterChange={setFilter}
              filteredCount={filteredListings.length}
              filtersRowRef={filtersRowRef}
              onScrollFiltersIntoViewMobile={scrollFiltersIntoViewMobile}
              centralEvents={platformFlags.centralEvents}
              tourism={platformFlags.tourism}
            />
          ) : null}

          <div className="hm-listings-grid">
            {loading ? (
              <LoadingPlaceholder minHeight={120} />
            ) : fetchError ? (
              <div className="card hm-error-card">
                <Info size={36} className="hm-error-icon" />
                <p className="hm-error-text">
                  {fetchError === 'timeout' ? t('manageDataLoadTimeout') : fetchError}
                </p>
                <button type="button" className="button" onClick={() => void fetchData()}>
                  {t('retryLoad')}
                </button>
              </div>
            ) : myListings.length === 0 ? (
              <InteractiveEmptyState
                variant="subtle"
                title={t('manageEmptyTitle')}
                description={t('manageEmptyBody')}
                icons={[
                  <HomeIcon key="home" size={22} aria-hidden />,
                  <Building2 key="building" size={22} aria-hidden />,
                  <KeyRound key="key" size={22} aria-hidden />,
                ]}
                action={{
                  label: t('manageEmptyCta'),
                  href: '/homeowner/register',
                  icon: <Plus size={18} aria-hidden />,
                }}
              />
            ) : filteredListings.length > 0 ? (
              filteredListings.map((listing) => (
                <LandlordListingCard
                  key={listing.id}
                  listing={listing}
                  availability={availability}
                  isMobileLayout={isMobileLayout}
                />
              ))
            ) : (
              <EmptyState
                title={t('manageFilterActiveHint')}
                className="hm-filter-empty"
              />
            )}
          </div>
      </div>

    </main>
  )
}
