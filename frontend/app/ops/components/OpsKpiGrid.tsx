'use client'

type Kpi = { label: string; value: number | string; hint?: string }

export default function OpsKpiGrid({ items }: { items: Kpi[] }) {
  return (
    <div className="ops-kpi-grid">
      {items.map((item) => (
        <div key={item.label} className="ops-kpi-card">
          <p className="ops-kpi-label">{item.label}</p>
          <p className="ops-kpi-value">{item.value}</p>
          {item.hint ? <p className="ops-kpi-hint">{item.hint}</p> : null}
        </div>
      ))}
    </div>
  )
}
