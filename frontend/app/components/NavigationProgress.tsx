'use client'

import { Suspense, useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

function NavigationProgressInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [active, setActive] = useState(false)
  const routeKey = `${pathname}?${searchParams?.toString() ?? ''}`

  useEffect(() => {
    setActive(false)
  }, [routeKey])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const t = e.target as HTMLElement | null
      const a = t?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!a) return
      if (a.getAttribute('aria-disabled') === 'true') return
      const href = a.getAttribute('href')
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return
      if (a.target === '_blank' || a.hasAttribute('download')) return
      try {
        const u = new URL(href, window.location.origin)
        if (u.origin !== window.location.origin) return
        const next = `${u.pathname}${u.search}`
        const cur = `${window.location.pathname}${window.location.search}`
        if (next === cur) return
        setActive(true)
      } catch {
        /* ignore */
      }
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  if (!active) return null

  return (
    <div
      className="navigation-progress-bar"
      aria-hidden
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        zIndex: 101,
        pointerEvents: 'none',
      }}
    />
  )
}

export default function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressInner />
    </Suspense>
  )
}
