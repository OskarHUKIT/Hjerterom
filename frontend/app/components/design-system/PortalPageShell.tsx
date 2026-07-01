'use client'

import type { ReactNode } from 'react'
import PageSkeleton from './PageSkeleton'

type PortalPageShellProps = {
  loading?: boolean
  error?: ReactNode
  empty?: ReactNode
  children?: ReactNode
  loadingFallback?: ReactNode
  className?: string
}

/**
 * Portal layout shell with loading / error / empty slots before main content.
 */
export default function PortalPageShell({
  loading,
  error,
  empty,
  children,
  loadingFallback,
  className,
}: PortalPageShellProps) {
  if (loading) {
    return <>{loadingFallback ?? <PageSkeleton minHeight={400} className={className} />}</>
  }
  if (error) {
    return <div className={className ?? 'container'}>{error}</div>
  }
  if (empty) {
    return <div className={className ?? 'container'}>{empty}</div>
  }
  return <>{children}</>
}
