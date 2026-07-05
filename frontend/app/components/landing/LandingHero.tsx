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

function HeroMotif() {
  return (
    <div className="hrt-landing-hero__motif" aria-hidden>
      <svg viewBox="0 0 400 400" className="hrt-landing-hero__motif-svg">
        <rect
          x="70"
          y="70"
          width="260"
          height="260"
          rx="18"
          stroke="var(--hrt-primary)"
          strokeOpacity="0.35"
          strokeWidth="1.5"
          fill="none"
          transform="rotate(8 200 200)"
        />
        <rect
          x="110"
          y="110"
          width="180"
          height="180"
          rx="14"
          stroke="var(--hrt-teal)"
          strokeOpacity="0.35"
          strokeWidth="1.5"
          fill="none"
          transform="rotate(-6 200 200)"
        />
        <path
          d="M200 300c-58-38-96-74-96-118 0-30 22-52 50-52 22 0 38 12 46 30 8-18 24-30 46-30 28 0 50 22 50 52 0 44-38 80-96 118Z"
          fill="none"
          stroke="var(--hrt-warm)"
          strokeWidth="2"
          strokeOpacity="0.55"
        />
        <path
          d="M200 300c-58-38-96-74-96-118 0-30 22-52 50-52 22 0 38 12 46 30 8-18 24-30 46-30 28 0 50 22 50 52 0 44-38 80-96 118Z"
          fill="var(--hrt-heart)"
          fillOpacity="0.06"
        />
        <circle cx="200" cy="200" r="150" stroke="var(--text-main)" strokeOpacity="0.06" fill="none" />
      </svg>
    </div>
  )
}

function FjordSilhouette() {
  return (
    <svg
      className="hrt-landing-hero__fjord"
      viewBox="0 0 1440 300"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path d="M0 220 L220 90 L400 190 L620 60 L860 200 L1080 100 L1260 180 L1440 130 L1440 300 L0 300 Z" />
      <path
        className="hrt-landing-hero__fjord-mid"
        d="M0 260 L260 160 L500 240 L760 140 L1000 250 L1250 170 L1440 230 L1440 300 L0 300 Z"
        opacity="0.85"
      />
      <path
        className="hrt-landing-hero__fjord-front"
        d="M0 290 L300 250 L620 290 L940 245 L1260 288 L1440 260 L1440 300 L0 300 Z"
        opacity="0.9"
      />
    </svg>
  )
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

export default function LandingHero({ activeModule }: LandingHeroProps) {
  const { t } = useLanguage()
  const { flags, isLoading } = usePlatformMode()

  const content = resolveHeroContent(activeModule, flags, t)
  const [titleBefore, titleAccent, titleAfter] = splitHeroTitle(content.title, content.titleAccent)

  return (
    <section className="hrt-landing-hero" aria-labelledby="landing-hero-title">
      <div className="hrt-landing-hero__grain" aria-hidden />
      <div className="hrt-landing-hero__blob hrt-landing-hero__blob--indigo" aria-hidden />
      <div className="hrt-landing-hero__blob hrt-landing-hero__blob--teal" aria-hidden />
      <div className="hrt-landing-hero__blob hrt-landing-hero__blob--rose" aria-hidden />
      <HeroMotif />
      <FjordSilhouette />

      {isLoading ? (
        <HeroSkeleton />
      ) : (
        <div className="hrt-landing-hero__content">
          <p className="hrt-landing-hero__eyebrow">
            <span className="hrt-landing-hero__eyebrow-dot" aria-hidden />
            <span key={content.eyebrow}>{content.eyebrow}</span>
          </p>

          <h1 id="landing-hero-title" className="hrt-landing-hero__title">
            <span key={content.title}>
              {titleAccent ? (
                <>
                  {titleBefore}
                  <span className="hrt-landing-hero__title-accent">{titleAccent}</span>
                  {titleAfter}
                </>
              ) : (
                content.title
              )}
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
