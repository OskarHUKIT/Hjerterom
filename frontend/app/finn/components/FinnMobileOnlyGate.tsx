'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useFinnMobileLayout } from '../hooks/useFinnMobileLayout'

type Props = {
  children: React.ReactNode
  desktopRedirect: string
}

/** Mobile-only Finn routes redirect to the desktop equivalent on wide viewports. */
export default function FinnMobileOnlyGate({ children, desktopRedirect }: Props) {
  const mobile = useFinnMobileLayout()
  const router = useRouter()

  useEffect(() => {
    if (!mobile) router.replace(desktopRedirect)
  }, [mobile, router, desktopRedirect])

  if (!mobile) return null
  return <>{children}</>
}
