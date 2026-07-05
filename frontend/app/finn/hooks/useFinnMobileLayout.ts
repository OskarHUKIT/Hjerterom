'use client'

import { useEffect, useState } from 'react'

const FINN_MOBILE_MQ = '(max-width: 768px)'

/** True when Finn should use the mobile app shell (≤768px). */
export function useFinnMobileLayout(): boolean {
  const [mobile, setMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(FINN_MOBILE_MQ)
    const sync = () => setMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return mobile
}
