'use client'

import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'boly-app-sidebar-collapsed'

export function useSidebarCollapsed() {
  const [collapsed, setCollapsedState] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === '1') setCollapsedState(true)
    } catch {
      /* ignore */
    }
    setHydrated(true)
  }, [])

  const setCollapsed = useCallback((next: boolean) => {
    setCollapsedState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [])

  const toggleCollapsed = useCallback(() => {
    setCollapsed(!collapsed)
  }, [collapsed, setCollapsed])

  return { collapsed, setCollapsed, toggleCollapsed, hydrated }
}
