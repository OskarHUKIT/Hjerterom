'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

const COLLAPSE_KEY = 'boly-homeowner-sidebar-collapsed'

export function useHomeownerSidebarState() {
  const pathname = usePathname()
  const [collapsed, setCollapsedState] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(COLLAPSE_KEY)
      if (stored === '1') setCollapsedState(true)
    } catch {
      /* ignore */
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!mobileOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mobileOpen])

  const setCollapsed = useCallback((next: boolean) => {
    setCollapsedState(next)
    try {
      localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [])

  const toggleCollapsed = useCallback(() => {
    setCollapsed(!collapsed)
  }, [collapsed, setCollapsed])

  return {
    collapsed,
    toggleCollapsed,
    hydrated,
    mobileOpen,
    setMobileOpen,
    closeMobile: () => setMobileOpen(false),
    openMobile: () => setMobileOpen(true),
  }
}
