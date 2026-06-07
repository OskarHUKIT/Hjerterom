'use client'

export type OpsTabItem<T extends string> = {
  id: T
  label: string
  badge?: string | number
}

export default function OpsTabs<T extends string>({
  tabs,
  active,
  onChange,
  ariaLabel,
}: {
  tabs: OpsTabItem<T>[]
  active: T
  onChange: (id: T) => void
  ariaLabel?: string
}) {
  return (
    <div className="ops-tabs" role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          className={`ops-tab${active === tab.id ? ' ops-tab--active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
          {tab.badge !== undefined && tab.badge !== 0 ? (
            <span className="ops-tab-badge">{tab.badge}</span>
          ) : null}
        </button>
      ))}
    </div>
  )
}
