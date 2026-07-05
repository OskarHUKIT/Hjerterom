'use client'

import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { supabase } from '@/app/lib/supabase'
import { devInfo, logError } from '@/app/lib/appLogger'
import { useLanguage } from '@/context/LanguageContext'
import ChromeRoundButton from './ChromeRoundButton'

type ShellLogoutButtonProps = {
  compact?: boolean
  className?: string
}

export default function ShellLogoutButton({ compact, className }: ShellLogoutButtonProps) {
  const { t } = useLanguage()
  const [logoutPending, setLogoutPending] = useState(false)

  const handleLogout = () => {
    setLogoutPending(true)
    devInfo('[Boly/auth] logout: local signOut + redirect')
    void (async () => {
      try {
        await supabase.auth.signOut({ scope: 'local' })
      } catch (e) {
        logError('signOut:', e)
      }
      window.location.assign('/')
    })()
  }

  return (
    <>
      <ChromeRoundButton
        compact={compact}
        className={className}
        onClick={() => void handleLogout()}
        aria-label={t('logOut')}
        title={t('logOut')}
      >
        <LogOut size={compact ? 14 : 16} aria-hidden />
      </ChromeRoundButton>
      {logoutPending ? (
        <div className="hrt-logout-overlay" role="status" aria-live="assertive" aria-busy="true">
          <div className="card hrt-logout-card">{t('logoutRedirecting')}</div>
        </div>
      ) : null}
    </>
  )
}
