'use client'

import { useState } from 'react'
import { LogIn, Presentation, Compass, MessageCircle, Shield, Accessibility, MapPin } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { usePlatformMode } from '../context/PlatformModeContext'
import PortalCard from './components/design-system/PortalCard'
import Modal from './components/design-system/Modal'

export default function Home() {
  const { t } = useLanguage()
  const { flags } = usePlatformMode()
  const [showDemoPopup, setShowDemoPopup] = useState(false)

  return (
    <main className="home-landing container">
      <div className="home-landing-layout">
        <div className="hero-section">
          <h1 className="animate-delay-1 hero-title">{t('heroTitle')}</h1>
          <p className="animate-delay-2 hero-lead">{t('heroDesc')}</p>
          <ul className="hrt-trust-row animate-delay-2" aria-label={t('homeTrustAria')}>
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

        <div className="grid-portal animate-delay-3">
          <PortalCard
            icon={LogIn}
            title={t('homeLoginCardTitle')}
            ctaLabel={t('homeLoginCardCta')}
            href="/login"
            variant="accent"
            ariaLabel={t('homeLoginCardLinkAria')}
          />

          <PortalCard
            icon={Presentation}
            title={t('homeDemoCardTitle')}
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
