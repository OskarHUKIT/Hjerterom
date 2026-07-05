'use client'

import { useCallback, useState } from 'react'
import { Building2, Compass, Home as HomeIcon, MessageCircle } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { usePlatformMode } from '../context/PlatformModeContext'
import FeatureSection from './components/design-system/FeatureSection'
import LandingHero from './components/landing/LandingHero'
import type { LandingHeroModule } from '@/lib/landingHeroContent'

export default function Home() {
  const { t } = useLanguage()
  const { flags } = usePlatformMode()
  const [activeModule, setActiveModule] = useState<LandingHeroModule>('default')

  const activateModule = useCallback((module: LandingHeroModule) => {
    setActiveModule(module)
  }, [])

  const deactivateModule = useCallback(() => {
    setActiveModule('default')
  }, [])

  return (
    <main className="home-landing">
      <div className="hrt-landing-aurora">
        <div className="hrt-landing-aurora__grain" aria-hidden />
        <div className="hrt-landing-aurora__blob hrt-landing-aurora__blob--indigo" aria-hidden />
        <div className="hrt-landing-aurora__blob hrt-landing-aurora__blob--teal" aria-hidden />
        <div className="hrt-landing-aurora__blob hrt-landing-aurora__blob--rose" aria-hidden />

        <LandingHero activeModule={activeModule} />

        <div className="home-landing-features container">
          <FeatureSection
            eyebrow={t('homeFeaturesEyebrow')}
            title={t('homeFeaturesTitle')}
            lead={t('homeFeaturesLead')}
            onModuleActivate={activateModule}
            onModuleDeactivate={deactivateModule}
            items={[
              {
                icon: Building2,
                title: t('homeFeatureKommuneTitle'),
                description: t('homeFeatureKommuneDesc'),
                href: '/login',
                ctaLabel: t('homeFeatureGoTo'),
                moduleId: 'kommune',
                iconTone: 'primary',
              },
              {
                icon: HomeIcon,
                title: t('homeFeatureLandlordTitle'),
                description: t('homeFeatureLandlordDesc'),
                href: '/login',
                ctaLabel: t('homeFeatureGoTo'),
                moduleId: 'landlord',
                iconTone: 'teal',
              },
              ...(flags.finn
                ? [
                    {
                      icon: Compass,
                      title: t('homeFeatureFinnTitle'),
                      description: t('homeFeatureFinnDesc'),
                      href: '/finn',
                      ctaLabel: t('homeFeatureGoTo'),
                      moduleId: 'finn' as const,
                      iconTone: 'warm' as const,
                    },
                  ]
                : []),
              ...(flags.los
                ? [
                    {
                      icon: MessageCircle,
                      title: t('homeFeatureLosTitle'),
                      description: t('homeFeatureLosDesc'),
                      href: '/los',
                      ctaLabel: t('homeFeatureGoTo'),
                      moduleId: 'los' as const,
                      iconTone: 'teal' as const,
                    },
                  ]
                : []),
            ]}
          />
        </div>
      </div>
    </main>
  )
}
