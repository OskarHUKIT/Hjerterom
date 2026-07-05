'use client'

import type { ButtonHTMLAttributes, ReactNode } from 'react'

type LandingRoundButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  pressed?: boolean
}

/** Sketch-style round chrome control (theme, language). */
export default function LandingRoundButton({
  children,
  className,
  pressed,
  ...props
}: LandingRoundButtonProps) {
  return (
    <button
      type="button"
      className={['landing-round-btn', className].filter(Boolean).join(' ')}
      aria-pressed={pressed}
      {...props}
    >
      {children}
    </button>
  )
}
