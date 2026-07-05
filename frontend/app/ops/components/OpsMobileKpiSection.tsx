'use client'

import Link from 'next/link'

type KpiItem = {
  label: string
  value: number | string
  delta?: string
  deltaTone?: 'success' | 'muted' | 'warning'
  href?: string
  valueTone?: 'warning' | 'default'
}

function KpiCard({ item }: { item: KpiItem }) {
  const card = (
    <div className="ops-mobile-kpi-card">
      <p className="ops-label-uc">{item.label}</p>
      <p
        className={`ops-mobile-kpi-value${item.valueTone === 'warning' ? ' ops-mobile-kpi-value--warning' : ''}`}
      >
        {typeof item.value === 'number' ? item.value.toLocaleString('nb-NO') : item.value}
      </p>
      {item.delta ? (
        <p className={`ops-mobile-kpi-delta ops-mobile-kpi-delta--${item.deltaTone ?? 'success'}`}>
          {item.delta}
        </p>
      ) : null}
    </div>
  )

  if (item.href) {
    return (
      <Link href={item.href} className="ops-mobile-kpi-link">
        {card}
      </Link>
    )
  }

  return card
}

export default function OpsMobileKpiSection({
  primary,
  secondary,
}: {
  primary: KpiItem[]
  secondary?: KpiItem[]
}) {
  return (
    <>
      <div className="ops-mobile-kpi-grid">
        {primary.map((item) => (
          <KpiCard key={item.label} item={item} />
        ))}
      </div>
      {secondary && secondary.length > 0 ? (
        <div className="ops-mobile-kpi-secondary">
          <div className="ops-panel ops-panel--pad-md">
            <div className="ops-mobile-kpi-secondary-grid">
              {secondary.map((item) => (
                <div key={item.label}>
                  <p className="ops-label-uc">{item.label}</p>
                  <p
                    className={`ops-mobile-kpi-secondary-value${
                      item.valueTone === 'warning' ? ' ops-mobile-kpi-value--warning' : ''
                    }`}
                  >
                    {typeof item.value === 'number' ? item.value.toLocaleString('nb-NO') : item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
