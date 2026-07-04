'use client'

import { useCallback, useId, useRef } from 'react'

export type SegmentedButtonOption<T extends string> = {
  value: T
  label: string
  disabled?: boolean
}

type SegmentedButtonGroupProps<T extends string> = {
  value: T
  options: SegmentedButtonOption<T>[]
  onChange: (value: T) => void
  ariaLabel: string
  className?: string
}

/** Two-or-more segment control (ruixen.ui/segmented-button-group → Boly tokens). */
export default function SegmentedButtonGroup<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
}: SegmentedButtonGroupProps<T>) {
  const groupId = useId()
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([])

  const focusSegment = useCallback((index: number) => {
    const len = options.length
    if (len === 0) return
    const next = ((index % len) + len) % len
    buttonRefs.current[next]?.focus()
  }, [options.length])

  const onKeyDown = (index: number, e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      focusSegment(index + 1)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      focusSegment(index - 1)
    } else if (e.key === 'Home') {
      e.preventDefault()
      focusSegment(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      focusSegment(options.length - 1)
    }
  }

  return (
    <div
      id={groupId}
      className={`ds-segmented-group${className ? ` ${className}` : ''}`}
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {options.map((option, index) => {
        const active = value === option.value
        return (
          <button
            key={option.value}
            ref={(el) => {
              buttonRefs.current[index] = el
            }}
            type="button"
            role="radio"
            aria-checked={active}
            aria-pressed={active}
            disabled={option.disabled}
            tabIndex={active ? 0 : -1}
            className={`ds-segmented-group__btn${active ? ' ds-segmented-group__btn--active' : ''}${option.value === 'Tilgjengelig' ? ' ds-segmented-group__btn--open' : ''}${option.value === 'Utilgjengelig' ? ' ds-segmented-group__btn--closed' : ''}`}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => onKeyDown(index, e)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
