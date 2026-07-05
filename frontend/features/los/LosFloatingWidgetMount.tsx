'use client'

import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import { usePlatformMode } from '@/context/PlatformModeContext'
import { useLosChat } from '@/features/los/useLosChat'
import '@/features/los/los-widget.css'

const FloatingChatWidget = dynamic(
  () =>
    import('@/components/ui/floating-chat-widget-shadcnui').then((m) => m.FloatingChatWidget),
  { ssr: false }
)

const PROTECTED_PREFIXES = ['/homeowner', '/nav', '/documents', '/settings', '/ops'] as const

function isProtectedDashboard(pathname: string | null): boolean {
  if (!pathname) return false
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

function isPublicLosWidgetRoute(pathname: string | null): boolean {
  if (!pathname) return false
  if (pathname === '/') return true
  if (pathname === '/finn' || pathname.startsWith('/finn/')) return true
  return false
}

function isLosFullPage(pathname: string | null): boolean {
  if (!pathname) return false
  return pathname === '/los' || pathname.startsWith('/los/')
}

export default function LosFloatingWidgetMount() {
  const pathname = usePathname()
  const { t } = useLanguage()
  const { flags, isLoading } = usePlatformMode()
  const [isOpen, setIsOpen] = useState(false)

  const chat = useLosChat({
    autoStart: false,
    welcomeKey: 'losWidgetWelcome',
    t,
  })
  const { initSession, sessionReady, messages, busy, isInitializing, send } = chat

  const visible =
    !isLoading &&
    flags.los &&
    isPublicLosWidgetRoute(pathname) &&
    !isProtectedDashboard(pathname) &&
    !isLosFullPage(pathname)

  useEffect(() => {
    if (isOpen && visible) void initSession()
  }, [isOpen, visible, initSession])

  const labels = useMemo(
    () => ({
      title: t('losTitle'),
      subtitle: t('losSubtitle'),
      launcherLabel: t('losWidgetLabel'),
      closeLabel: t('losWidgetClose'),
      inputPlaceholder: t('losInputPlaceholder'),
      sendLabel: t('losSend'),
      businessHoursNotice: t('losWidgetBusinessHours'),
      privacyNotice: t('losSensitiveDataNotice'),
      privacyLink: t('losPrivacyLink'),
      privacyHref: '/los/personvern',
      loading: t('loadingPleaseWait'),
    }),
    [t]
  )

  const handleSend = useCallback(
    async (text: string) => {
      if (!sessionReady) await initSession()
      return send(text)
    },
    [initSession, send, sessionReady]
  )

  if (!visible) return null

  return (
    <FloatingChatWidget
      labels={labels}
      messages={messages}
      busy={busy}
      isInitializing={isInitializing}
      onSend={handleSend}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
    />
  )
}
