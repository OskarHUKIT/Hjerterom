'use client'

import { useState } from 'react'
import { LogIn, Presentation, Compass, MessageCircle, Shield, Accessibility, MapPin, Building2, Home as HomeIcon } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { usePlatformMode } from '../context/PlatformModeContext'
import PortalCard from './components/design-system/PortalCard'
import FeatureSection from './components/design-system/FeatureSection'
import Modal from './components/design-system/Modal'

export default function Home() {
  const { t } = useLanguage()
  const { flags } = usePlatformMode()
  const [showDemoPopup, setShowDemoPopup] = useState(false)

  const heroTitle = t('heroTitle')
  const heroAccent = t('heroTitleAccent')
  const titleParts = heroAccent ? heroTitle.split(heroAccent) : [heroTitle]

  return (
    <main className="home-landing container">
      <div className="home-landing-layout">
        <div className="hero-section">
          <p className="hrt-hero-eyebrow">{t('heroEyebrow')}</p>
          <h1 className="hero-title">
            {titleParts.length > 1 ? (
              <>
                {titleParts[0]}
                <em>{heroAccent}</em>
                {titleParts.slice(1).join(heroAccent)}
              </>
            ) : (
              heroTitle
            )}
          </h1>
          <p className="hero-lead">{t('heroDesc')}</p>
          <ul className="hrt-trust-row" aria-label={t('homeTrustAria')}>
            <li className="hrt-trust-badge">
              <Shield size={16} aria-hidden />
              {t('homeTrustSecure')}
            </li>
            <li className="hrt-trust-badge">
              <Accessibility size={16} aria-hidden />
              {t('homeTrustA11y')}
            </li>
            <li className="hrt-trust-badge">
              <MapPin size={16} aria-hidden />
              {t('homeTrustNordic')}
            </li>
          </ul>
        </div>

        <div className="grid-portal">
          <PortalCard
            icon={LogIn}
            title={t('homeLoginCardTitle')}
            description={t('homeLoginCardDesc')}
            ctaLabel={t('homeLoginCardCta')}
            href="/login"
            variant="accent"
            ariaLabel={t('homeLoginCardLinkAria')}
          />

          <PortalCard
            icon={Presentation}
            title={t('homeDemoCardTitle')}
            description={t('homeDemoCardDesc')}
            ctaLabel={t('homeDemoCardCta')}
            onClick={() => setShowDemoPopup(true)}
            variant="primary"
          />

          {flags.finn ? (
            <PortalCard
              icon={Compass}
              title={t('homeFinnCardTitle')}
              description={t('homeFinnCardDesc')}
              ctaLabel={t('homeFinnCardCta')}
              href="/finn"
              variant="accent"
            />
          ) : null}

          {flags.los ? (
            <PortalCard
              icon={MessageCircle}
              title={t('homeLosCardTitle')}
              description={t('homeLosCardDesc')}
              ctaLabel={t('homeLosCardCta')}
              href="/los"
              variant="teal"
            />
          ) : null}
        </div>
      </div>

      <FeatureSection
        title={t('homeFeaturesTitle')}
        lead={t('homeFeaturesLead')}
        items={[
          {
            icon: Building2,
            title: t('homeFeatureKommuneTitle'),
            description: t('homeFeatureKommuneDesc'),
          },
          {
            icon: HomeIcon,
            title: t('homeFeatureLandlordTitle'),
            description: t('homeFeatureLandlordDesc'),
          },
          ...(flags.finn
            ? [
                {
                  icon: Compass,
                  title: t('homeFeatureFinnTitle'),
                  description: t('homeFeatureFinnDesc'),
                },
              ]
            : []),
          ...(flags.los
            ? [
                {
                  icon: MessageCircle,
                  title: t('homeFeatureLosTitle'),
                  description: t('homeFeatureLosDesc'),
                },
              ]
            : []),
        ]}
      />

      <Modal open={showDemoPopup} onClose={() => setShowDemoPopup(false)} title={t('homeDemoCardTitle')}>
        <div className="hrt-modal-contact">
          <span className="hrt-modal-contact-name">Tina Olsen, Nav Narvik</span>
          <a href="mailto:Tina.Olsen@nav.no">Tina.Olsen@nav.no</a>
        </div>
        <div className="hrt-modal-contact">
          <span className="hrt-modal-contact-name">Lars Utstøl, GAMECHANGING</span>
          <a href="mailto:utstol@gamechanging.no">utstol@gamechanging.no</a>
        </div>
      </Modal>
    </main>
  )
}
