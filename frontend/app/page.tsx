'use client'

import { useState } from 'react'
import {
  LogIn,
  Presentation,
  Compass,
  MessageCircle,
  Shield,
  Accessibility,
  MapPin,
  Building2,
  Home as HomeIcon,
} from 'lucide-react'
import { HeroSection } from '@/components/ui/hero-section-dark'
import { useLanguage } from '../context/LanguageContext'
import { usePlatformMode } from '../context/PlatformModeContext'
import PortalCard from './components/design-system/PortalCard'
import FeatureSection from './components/design-system/FeatureSection'
import Modal from './components/design-system/Modal'

const HERO_PREVIEW_LIGHT =
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1600&q=80&auto=format&fit=crop'
const HERO_PREVIEW_DARK =
  'https://images.unsplash.com/photo-1600585154340-be6162a9a0a9?w=1600&q=80&auto=format&fit=crop'

export default function Home() {
  const { t } = useLanguage()
  const { flags } = usePlatformMode()
  const [showDemoPopup, setShowDemoPopup] = useState(false)

  const heroAccent = t('heroTitleAccent')
  const heroTitle = t('heroTitle')
  const titleParts = heroAccent ? heroTitle.split(heroAccent) : [heroTitle]

  return (
    <>
      <HeroSection
        title={t('heroEyebrow')}
        subtitle={{
          regular: titleParts[0] ?? heroTitle,
          gradient: heroAccent || heroTitle,
        }}
        description={t('heroDesc')}
        ctaText={t('heroCtaText')}
        ctaHref="/login"
        bottomImage={{
          light: HERO_PREVIEW_LIGHT,
          dark: HERO_PREVIEW_DARK,
          alt: t('heroPreviewAlt'),
        }}
        gridOptions={{
          angle: 65,
          opacity: 0.35,
          cellSize: 50,
          lightLineColor: 'color-mix(in srgb, var(--border-subtle) 80%, transparent)',
          darkLineColor: 'color-mix(in srgb, var(--border-subtle) 60%, transparent)',
        }}
      />

      <main className="home-landing container">
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
    </>
  )
}
