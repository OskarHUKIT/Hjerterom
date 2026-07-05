'use client'

import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ChromeRoundButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  pressed?: boolean
  compact?: boolean
}

/** Round icon chrome control — shared hero / shell pattern (theme, language). */
export default function ChromeRoundButton({
  children,
  className,
  pressed,
  compact,
  ...props
}: ChromeRoundButtonProps) {
  return (
    <button
      type="button"
      className={[
        'hrt-chrome-round-btn',
        compact ? 'hrt-chrome-round-btn--compact' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-pressed={pressed}
      {...props}
    >
      {children}
    </button>
  )
}
