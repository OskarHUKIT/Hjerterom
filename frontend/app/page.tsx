'use client'

import { useCallback, useState, type FocusEvent } from 'react'
import {
  LogIn,
  Presentation,
  Compass,
  MessageCircle,
  Building2,
  Home as HomeIcon,
} from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { usePlatformMode } from '../context/PlatformModeContext'
import PortalCard from './components/design-system/PortalCard'
import FeatureSection from './components/design-system/FeatureSection'
import Modal from './components/design-system/Modal'
import LandingHero from './components/landing/LandingHero'
import type { LandingHeroModule } from '@/lib/landingHeroContent'

function PortalWrap({
  moduleId,
  activeModule,
  onActivate,
  onDeactivate,
  children,
}: {
  moduleId: LandingHeroModule
  activeModule: LandingHeroModule
  onActivate: (module: LandingHeroModule) => void
  onDeactivate: () => void
  children: React.ReactNode
}) {
  const handleBlur = useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
        onDeactivate()
      }
    },
    [onDeactivate]
  )

  return (
    <div
      className="home-portal-wrap"
      data-active={activeModule === moduleId ? 'true' : undefined}
      onMouseEnter={() => onActivate(moduleId)}
      onMouseLeave={onDeactivate}
      onFocus={() => onActivate(moduleId)}
      onBlur={handleBlur}
    >
      {children}
    </div>
  )
}

export default function Home() {
  const { t } = useLanguage()
  const { flags } = usePlatformMode()
  const [showDemoPopup, setShowDemoPopup] = useState(false)
  const [activeModule, setActiveModule] = useState<LandingHeroModule>('default')

  const activateModule = useCallback((module: LandingHeroModule) => {
    setActiveModule(module)
  }, [])

  const deactivateModule = useCallback(() => {
    setActiveModule('default')
  }, [])

  return (
    <main className="home-landing">
      <LandingHero activeModule={activeModule} />

      <div className="home-landing-portals">
        <div className="grid-portal">
          <PortalWrap
            moduleId="login"
            activeModule={activeModule}
            onActivate={activateModule}
            onDeactivate={deactivateModule}
          >
            <PortalCard
              icon={LogIn}
              title={t('homeLoginCardTitle')}
              description={t('homeLoginCardDesc')}
              ctaLabel={t('homeLoginCardCta')}
              href="/login"
              variant="accent"
              ariaLabel={t('homeLoginCardLinkAria')}
            />
          </PortalWrap>

          <PortalWrap
            moduleId="demo"
            activeModule={activeModule}
            onActivate={activateModule}
            onDeactivate={deactivateModule}
          >
            <PortalCard
              icon={Presentation}
              title={t('homeDemoCardTitle')}
              description={t('homeDemoCardDesc')}
              ctaLabel={t('homeDemoCardCta')}
              onClick={() => setShowDemoPopup(true)}
              variant="primary"
            />
          </PortalWrap>

          {flags.finn ? (
            <PortalWrap
              moduleId="finn"
              activeModule={activeModule}
              onActivate={activateModule}
              onDeactivate={deactivateModule}
            >
              <PortalCard
                icon={Compass}
                title={t('homeFinnCardTitle')}
                description={t('homeFinnCardDesc')}
                ctaLabel={t('homeFinnCardCta')}
                href="/finn"
                variant="accent"
              />
            </PortalWrap>
          ) : null}

          {flags.los ? (
            <PortalWrap
              moduleId="los"
              activeModule={activeModule}
              onActivate={activateModule}
              onDeactivate={deactivateModule}
            >
              <PortalCard
                icon={MessageCircle}
                title={t('homeLosCardTitle')}
                description={t('homeLosCardDesc')}
                ctaLabel={t('homeLosCardCta')}
                href="/los"
                variant="teal"
              />
            </PortalWrap>
          ) : null}
        </div>
      </div>

      <div className="home-landing-features container">
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
