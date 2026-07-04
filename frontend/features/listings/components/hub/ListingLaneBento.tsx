'use client'

import { useRouter } from 'next/navigation'
import { Building2, CalendarDays, Compass } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'

export type ListingLaneBentoProps = {
  city: string
  socialKommuneActive: boolean
  hasActiveAgreement: boolean
  tourismEnabled: boolean
  tourismTermsSigned: boolean
  tourismPriceCents: number | null
  showTourism: boolean
  showEvents: boolean
  activeEventCount: number
  onOpenTourismSettings: () => void
  onOpenEventOptIn: () => void
}

/** Three-lane bento row — status + navigation only; settings live in accordion below. */
export default function ListingLaneBento({
  city,
  socialKommuneActive,
  hasActiveAgreement,
  tourismEnabled,
  tourismTermsSigned,
  tourismPriceCents,
  showTourism,
  showEvents,
  activeEventCount,
  onOpenTourismSettings,
  onOpenEventOptIn,
}: ListingLaneBentoProps) {
  const { t } = useLanguage()
  const router = useRouter()

  const socialActive = socialKommuneActive && hasActiveAgreement
  const tourismLive =
    tourismEnabled && tourismTermsSigned && typeof tourismPriceCents === 'number' && tourismPriceCents > 0

  const handleSosialClick = () => {
    if (!hasActiveAgreement) {
      router.push('/homeowner/agreements')
      return
    }
    document.getElementById('hub-calendar-heading')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const tileCount = 1 + (showTourism ? 1 : 0) + (showEvents ? 1 : 0)

  return (
    <div
      className={`listing-lane-bento ds-bento-grid ds-bento-grid--${tileCount}`}
      aria-label={t('listingHubBentoAria')}
    >
      <article className="listing-lane-bento__tile listing-lane-bento__tile--social">
        <button type="button" className="listing-lane-bento__surface" onClick={handleSosialClick}>
          <div className="listing-lane-bento__head">
            <span className="listing-lane-bento__icon" aria-hidden>
              <Building2 size={22} />
            </span>
            <span className="listing-lane-bento__lane">{t('laneSosial')}</span>
          </div>
          <p className="listing-lane-bento__meta">{city.trim() || t('laneSocialMeta')}</p>
          <span
            className={`listing-lane-bento__tag${socialActive ? ' listing-lane-bento__tag--active' : ''}`}
          >
            {socialActive ? t('listingHubLaneOn') : t('laneNeedsAgreement')}
          </span>
          <p className="listing-lane-bento__desc">{t('laneSocialDescShort')}</p>
          {!hasActiveAgreement ? (
            <span className="listing-lane-bento__cta listing-lane-bento__cta--link">
              {t('homeownerNavAgreements')}
            </span>
          ) : (
            <span className="listing-lane-bento__cta">{t('managePanelCalendar')}</span>
          )}
        </button>
      </article>

      {showTourism ? (
        <article className="listing-lane-bento__tile listing-lane-bento__tile--finn">
          <button type="button" className="listing-lane-bento__surface" onClick={onOpenTourismSettings}>
            <div className="listing-lane-bento__head">
              <span className="listing-lane-bento__icon" aria-hidden>
                <Compass size={22} />
              </span>
              <span className="listing-lane-bento__lane">{t('laneTourism')}</span>
            </div>
            <p className="listing-lane-bento__meta">{t('laneTourismMeta')}</p>
            <span
              className={`listing-lane-bento__tag${tourismLive ? ' listing-lane-bento__tag--active' : ''}`}
            >
              {tourismLive ? t('laneTourismLive') : t('laneTourismOff')}
            </span>
            <p className="listing-lane-bento__desc">{t('laneTourismDescShort')}</p>
            <span className="listing-lane-bento__cta">{t('laneTourismConfigure')}</span>
          </button>
        </article>
      ) : null}

      {showEvents ? (
        <article className="listing-lane-bento__tile listing-lane-bento__tile--event">
          <button type="button" className="listing-lane-bento__surface" onClick={onOpenEventOptIn}>
            <div className="listing-lane-bento__head">
              <span className="listing-lane-bento__icon" aria-hidden>
                <CalendarDays size={22} />
              </span>
              <span className="listing-lane-bento__lane">{t('laneEvent')}</span>
            </div>
            <p className="listing-lane-bento__meta">
              {t('laneEventActiveMeta').replace('{n}', String(activeEventCount))}
            </p>
            <span
              className={`listing-lane-bento__tag${activeEventCount > 0 ? ' listing-lane-bento__tag--active' : ''}`}
            >
              {activeEventCount > 0 ? t('listingHubLaneOn') : t('listingHubLaneOff')}
            </span>
            <p className="listing-lane-bento__desc">{t('laneEventDescShort')}</p>
            <span className="listing-lane-bento__cta">{t('laneEventOptInCta')}</span>
          </button>
        </article>
      ) : null}
    </div>
  )
}
