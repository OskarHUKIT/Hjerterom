'use client'

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { ArrowRight } from 'lucide-react'
import type { LandingHeroModule } from '@/lib/landingHeroContent'

export type FeatureTile = {
  icon: LucideIcon
  title: string
  description: string
  href: string
  ctaLabel: string
  moduleId: LandingHeroModule
  iconTone?: 'primary' | 'teal' | 'warm'
}

type FeatureSectionProps = {
  eyebrow: string
  title: string
  lead: string
  items: FeatureTile[]
  onModuleActivate: (module: LandingHeroModule) => void
  onModuleDeactivate: () => void
}

export default function FeatureSection({
  eyebrow,
  title,
  lead,
  items,
  onModuleActivate,
  onModuleDeactivate,
}: FeatureSectionProps) {
  return (
    <section className="ds-feature-section hrt-landing-features" aria-labelledby="home-features-title">
      <p className="hrt-landing-features__eyebrow">{eyebrow}</p>
      <h2 id="home-features-title" className="ds-feature-section__title">
        {title}
      </h2>
      <p className="ds-feature-section__lead">{lead}</p>
      <div className="ds-feature-grid">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <article
              key={item.moduleId}
              className="ds-feature-tile hrt-feature-tile"
              tabIndex={0}
              onMouseEnter={() => onModuleActivate(item.moduleId)}
              onMouseLeave={onModuleDeactivate}
              onFocus={() => onModuleActivate(item.moduleId)}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  onModuleDeactivate()
                }
              }}
            >
              <div
                className={`ds-feature-tile__icon hrt-feature-tile__icon hrt-feature-tile__icon--${item.iconTone ?? 'primary'}`}
                aria-hidden
              >
                <Icon size={22} />
              </div>
              <h3 className="ds-feature-tile__title">{item.title}</h3>
              <p className="ds-feature-tile__desc">{item.description}</p>
              <Link href={item.href} className="hrt-feature-go" prefetch={false}>
                {item.ctaLabel}
                <ArrowRight size={14} aria-hidden />
              </Link>
            </article>
          )
        })}
      </div>
    </section>
  )
}
