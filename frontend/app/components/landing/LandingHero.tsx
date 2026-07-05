'use client'

import { Accessibility, MapPin, Shield } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { usePlatformMode } from '@/context/PlatformModeContext'
import {
  resolveHeroContent,
  splitHeroTitle,
  type LandingHeroModule,
} from '@/lib/landingHeroContent'

type LandingHeroProps = {
  activeModule: LandingHeroModule
}

function HeroSkeleton() {
  const { t } = useLanguage()

  return (
    <div className="hrt-landing-hero__content" aria-busy="true" aria-label={t('heroLoadingAria')}>
      <div className="hrt-landing-hero__skeleton hrt-landing-hero__skeleton--eyebrow" />
      <div className="hrt-landing-hero__skeleton hrt-landing-hero__skeleton--title" />
      <div className="hrt-landing-hero__skeleton hrt-landing-hero__skeleton--title-short" />
      <div className="hrt-landing-hero__skeleton hrt-landing-hero__skeleton--lead" />
      <div className="hrt-landing-hero__skeleton hrt-landing-hero__skeleton--lead-short" />
      <div className="hrt-landing-hero__trust hrt-landing-hero__trust--loading">
        <div className="hrt-landing-hero__skeleton hrt-landing-hero__skeleton--chip" />
        <div className="hrt-landing-hero__skeleton hrt-landing-hero__skeleton--chip" />
        <div className="hrt-landing-hero__skeleton hrt-landing-hero__skeleton--chip" />
      </div>
    </div>
  )
}

function HeroTitle({
  title,
  titleAccent,
  accentOnOwnLine,
}: {
  title: string
  titleAccent: string
  accentOnOwnLine?: boolean
}) {
  if (accentOnOwnLine && titleAccent) {
    return (
      <>
        <span className="hrt-landing-hero__title-line">{title}</span>
        <span className="hrt-landing-hero__title-accent hrt-landing-hero__title-accent-line">
          {titleAccent}
        </span>
      </>
    )
  }

  const [titleBefore, accent, titleAfter] = splitHeroTitle(title, titleAccent)

  return (
    <span className="hrt-landing-hero__title-line">
      {accent ? (
        <>
          {titleBefore}
          <span className="hrt-landing-hero__title-accent">{accent}</span>
          {titleAfter}
        </>
      ) : (
        title
      )}
    </span>
  )
}

export default function LandingHero({ activeModule }: LandingHeroProps) {
  const { t } = useLanguage()
  const { flags, isLoading } = usePlatformMode()

  const content = resolveHeroContent(activeModule, flags, t)

  return (
    <section className="hrt-landing-hero" aria-labelledby="landing-hero-title">
      {isLoading ? (
        <HeroSkeleton />
      ) : (
        <div className="hrt-landing-hero__content">
          <p className="hrt-landing-hero__eyebrow">
            <span className="hrt-landing-hero__eyebrow-dot" aria-hidden />
            <span key={content.eyebrow}>{content.eyebrow}</span>
          </p>

          <h1 id="landing-hero-title" className="hrt-landing-hero__title">
            <span key={`${content.title}-${content.titleAccent}`}>
              <HeroTitle
                title={content.title}
                titleAccent={content.titleAccent}
                accentOnOwnLine={content.accentOnOwnLine}
              />
            </span>
          </h1>

          <p className="hrt-landing-hero__lead" key={content.description}>
            {content.description}
          </p>

          <ul className="hrt-landing-hero__trust" aria-label={t('homeTrustAria')}>
            <li className="hrt-landing-hero__trust-chip">
              <Shield size={16} aria-hidden />
              {t('homeTrustSecure')}
            </li>
            <li className="hrt-landing-hero__trust-chip">
              <Accessibility size={16} aria-hidden />
              {t('homeTrustA11y')}
            </li>
            <li className="hrt-landing-hero__trust-chip">
              <MapPin size={16} aria-hidden />
              {t('homeTrustNordic')}
            </li>
          </ul>
        </div>
      )}
    </section>
  )
}
