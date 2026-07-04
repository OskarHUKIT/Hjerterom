'use client'

import LoadingPlaceholder from '../LoadingPlaceholder'

type Props = {
  minHeight?: number
  className?: string
}

/** Full-page or section skeleton — wraps LoadingPlaceholder for consistency. */
export default function PageSkeleton({ minHeight = 320, className }: Props) {
  return (
    <main
      className={className ?? 'container'}
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-6) 0',
      }}
    >
      <LoadingPlaceholder minHeight={minHeight} />
    </main>
  )
}
