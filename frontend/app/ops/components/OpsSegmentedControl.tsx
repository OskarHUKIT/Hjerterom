'use client'

type OpsSegmentedOption = {
  value: string
  label: string
}

export default function OpsSegmentedControl({
  options,
  value,
  onChange,
  columns,
  className,
}: {
  options: OpsSegmentedOption[]
  value: string
  onChange: (value: string) => void
  columns?: number
  className?: string
}) {
  return (
    <div
      className={`ops-segmented${className ? ` ${className}` : ''}`}
      style={columns ? { gridTemplateColumns: `repeat(${columns}, 1fr)` } : undefined}
      role="group"
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className="ops-segment"
          aria-pressed={value === opt.value}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
