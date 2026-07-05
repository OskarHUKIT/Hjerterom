'use client'

// mobile-decision: 150ms fade/slide on route change — skipped when prefers-reduced-motion.
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { useIsMobileShellViewport } from '@/components/layout/mobile-shell'

type MobilePageTransitionProps = {
  children: ReactNode
  className?: string
  /** When false, children render without transition wrapper (desktop). */
  enabled?: boolean
}

export default function MobilePageTransition({
  children,
  className = '',
  enabled = true,
}: MobilePageTransitionProps) {
  const pathname = usePathname()
  const isMobile = useIsMobileShellViewport()

  if (!enabled || !isMobile) {
    return <>{children}</>
  }

  return (
    <div key={pathname} className={`mobile-page-transition${className ? ` ${className}` : ''}`}>
      {children}
    </div>
  )
}
