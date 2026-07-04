'use client'

import type { LucideIcon } from 'lucide-react'

export type FeatureTile = {
  icon: LucideIcon
  title: string
  description: string
}

type FeatureSectionProps = {
  title: string
  lead: string
  items: FeatureTile[]
}

/** Four-lane feature grid with optional hover (NPD-5 #4). */
export default function FeatureSection({ title, lead, items }: FeatureSectionProps) {
  return (
    <section className="ds-feature-section" aria-labelledby="home-features-title">
      <h2 id="home-features-title" className="ds-feature-section__title">
        {title}
      </h2>
      <p className="ds-feature-section__lead">{lead}</p>
      <div className="ds-feature-grid">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <article key={item.title} className="ds-feature-tile">
              <div className="ds-feature-tile__icon" aria-hidden>
                <Icon size={22} />
              </div>
              <h3 className="ds-feature-tile__title">{item.title}</h3>
              <p className="ds-feature-tile__desc">{item.description}</p>
            </article>
          )
        })}
      </div>
    </section>
  )
}
