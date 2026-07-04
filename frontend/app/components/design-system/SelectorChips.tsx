'use client'

export type SelectorChipOption<T extends string = string> = {
  id: T
  label: string
}

type SelectorChipsProps<T extends string> = {
  value: T
  options: SelectorChipOption<T>[]
  onChange: (value: T) => void
  ariaLabel: string
  className?: string
}

/**
 * Single-select chip group (hextaui/selector-chips pattern, Boly tokens).
 */
export default function SelectorChips<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
}: SelectorChipsProps<T>) {
  return (
    <div
      className={`ds-selector-chips${className ? ` ${className}` : ''}`}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map(({ id, label }) => {
        const selected = value === id
        return (
          <button
            key={id}
            type="button"
            className={`ds-selector-chip${selected ? ' ds-selector-chip--selected' : ''}`}
            aria-pressed={selected}
            onClick={() => onChange(id)}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
