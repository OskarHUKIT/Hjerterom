'use client'

import { CheckCircle2 } from 'lucide-react'

export default function OpsChecklist({ items }: { items: string[] }) {
  return (
    <ul className="ops-checklist">
      {items.map((item) => (
        <li key={item} className="ops-checklist-item">
          <CheckCircle2 size={18} className="ops-checklist-icon" aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export function OpsWizardProgress({
  steps,
  current,
  labels,
}: {
  steps: number
  current: number
  labels?: string[]
}) {
  return (
    <div className="ops-wizard" aria-label="Progress">
      <div className="ops-wizard-steps">
        {Array.from({ length: steps }, (_, i) => i + 1).map((n) => (
          <div key={n} className="ops-wizard-step-wrap">
            <span
              className={`ops-wizard-step${current === n ? ' ops-wizard-step--active' : current > n ? ' ops-wizard-step--done' : ''}`}
            >
              {current > n ? '✓' : n}
            </span>
            {labels?.[n - 1] ? (
              <span className={`ops-wizard-step-label${current === n ? ' ops-wizard-step-label--active' : ''}`}>
                {labels[n - 1]}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
