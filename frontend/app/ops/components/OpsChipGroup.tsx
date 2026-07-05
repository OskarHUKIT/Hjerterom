'use client'

type OpsChipOption = {
  value: string
  label: string
}

type OpsChipGroupProps = {
  options: OpsChipOption[]
  value: string
  onChange: (value: string) => void
  /** When true, chips toggle independently (multi-select) */
  multi?: boolean
  selected?: string[]
  onMultiChange?: (values: string[]) => void
  className?: string
}

export default function OpsChipGroup({
  options,
  value,
  onChange,
  multi,
  selected,
  onMultiChange,
  className,
}: OpsChipGroupProps) {
  if (multi && selected && onMultiChange) {
    return (
      <div className={`ops-chip-row${className ? ` ${className}` : ''}`}>
        {options.map((opt) => {
          const pressed = selected.includes(opt.value)
          return (
            <button
              key={opt.value}
              type="button"
              className="ops-chip"
              aria-pressed={pressed}
              onClick={() => {
                onMultiChange(
                  pressed ? selected.filter((v) => v !== opt.value) : [...selected, opt.value],
                )
              }}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className={`ops-chip-row${className ? ` ${className}` : ''}`}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className="ops-chip"
          aria-pressed={value === opt.value}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
