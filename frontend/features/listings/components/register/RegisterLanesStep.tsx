'use client'

import { Building2, CalendarDays, Compass } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'

type Props = {
  socialKommuneActive: boolean | null
  hasSignedTerms: boolean
  tourismEnabled: boolean
  onTourismChange: (next: boolean) => void
  showTourism: boolean
  eventInterest: boolean
  onEventInterestChange: (next: boolean) => void
  showEvents: boolean
}

/** Simplified lane picks for registration — sosial read-only, optional tourism/event toggles. */
export default function RegisterLanesStep({
  socialKommuneActive,
  hasSignedTerms,
  tourismEnabled,
  onTourismChange,
  showTourism,
  eventInterest,
  onEventInterestChange,
  showEvents,
}: Props) {
  const { t } = useLanguage()

  const socialActive = socialKommuneActive === true && hasSignedTerms
  const socialHint =
    socialKommuneActive === false
      ? t('landlordNonSubscribedBody')
      : socialActive
        ? t('regLanesSocialHint')
        : t('laneNeedsAgreement')

  return (
    <div className="register-lanes-grid">
      <article className="register-lanes-card register-lanes-card--social">
        <div className="register-lanes-card-head">
          <Building2 size={20} aria-hidden />
          <h4>{t('laneSosial')}</h4>
        </div>
        <p className="register-lanes-card-meta">{socialHint}</p>
        <span
          className={`register-lanes-tag${socialActive ? ' register-lanes-tag--active' : ''}`}
        >
          {socialActive ? t('listingHubLaneOn') : t('laneNeedsAgreement')}
        </span>
      </article>

      {showTourism ? (
        <article className="register-lanes-card register-lanes-card--tourism">
          <div className="register-lanes-card-head">
            <Compass size={20} aria-hidden />
            <h4>{t('laneTourism')}</h4>
          </div>
          <p className="register-lanes-card-meta">{t('regLanesTourismHint')}</p>
          <label className="register-lanes-toggle">
            <input
              type="checkbox"
              checked={tourismEnabled}
              onChange={(e) => onTourismChange(e.target.checked)}
            />
            {t('regLanesTourismEnable')}
          </label>
        </article>
      ) : null}

      {showEvents ? (
        <article className="register-lanes-card register-lanes-card--event">
          <div className="register-lanes-card-head">
            <CalendarDays size={20} aria-hidden />
            <h4>{t('laneEvent')}</h4>
          </div>
          <p className="register-lanes-card-meta">{t('regLanesEventHint')}</p>
          <label className="register-lanes-toggle">
            <input
              type="checkbox"
              checked={eventInterest}
              onChange={(e) => onEventInterestChange(e.target.checked)}
            />
            {t('regLanesEventInterest')}
          </label>
        </article>
      ) : null}
    </div>
  )
}
