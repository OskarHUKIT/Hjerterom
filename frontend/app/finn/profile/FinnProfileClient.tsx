'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, HelpCircle, LogOut, Shield, SlidersHorizontal, User } from 'lucide-react'
import { supabase, getAuthUserDeduped } from '@/app/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { PageSkeleton, ShellChromeControls, useToast } from '@/app/components/design-system'
import { buttonClassName } from '@/app/components/ui/Button'

export default function FinnProfileClient() {
  const { t } = useLanguage()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const user = await getAuthUserDeduped()
      if (user?.email) {
        setEmail(user.email)
        const meta = user.user_metadata
        const name =
          typeof meta?.full_name === 'string'
            ? meta.full_name
            : typeof meta?.name === 'string'
              ? meta.name
              : user.email.split('@')[0]
        setDisplayName(name)
      }
      setLoading(false)
    })()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    toast(t('finnProfileLoggedOut'), 'success')
    window.location.href = '/finn'
  }

  if (loading) return <PageSkeleton minHeight={240} />

  if (!email) {
    return (
      <div style={{ paddingTop: 16 }}>
        <h2 className="finn-page-title">{t('finnProfileTitle')}</h2>
        <p className="finn-page-lead">{t('finnProfileGuestLead')}</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href="/finn/login?redirect=/finn/profile" className={buttonClassName('accent')}>
            {t('finnMineLoginCta')}
          </Link>
          <Link href="/finn/login?redirect=/finn/profile&signup=1" className={buttonClassName('secondary')}>
            {t('finnLoginCreateAccount')}
          </Link>
        </div>
      </div>
    )
  }

  const initial = (displayName ?? email).charAt(0).toUpperCase()

  const menuItems: Array<{
    icon: typeof User
    title: string
    desc: string
    href?: string
  }> = [
    { icon: User, title: t('finnProfilePersonal'), desc: t('finnProfilePersonalDesc'), href: '/finn/mine' },
    { icon: SlidersHorizontal, title: t('finnProfilePreferences'), desc: t('finnProfilePreferencesDesc') },
    { icon: Shield, title: t('finnProfileSafety'), desc: t('finnProfileSafetyDesc') },
    { icon: HelpCircle, title: t('finnProfileHelp'), desc: t('finnProfileHelpDesc'), href: '/finn/vilkar' },
  ]

  return (
    <div style={{ paddingTop: 16 }}>
      <div className="finn-anim-fade-up finn-stagger-1" style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <span className="finn-avatar" style={{ width: 64, height: 64, fontSize: '1.5rem' }} aria-hidden>
          {initial}
        </span>
        <div>
          <h2 className="finn-page-title" style={{ marginBottom: 2 }}>
            {displayName}
          </h2>
          <p className="finn-page-lead" style={{ marginBottom: 0 }}>
            {t('finnProfileMemberSince')}
          </p>
        </div>
      </div>

      <div className="finn-anim-fade-up finn-stagger-2" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {menuItems.map(({ icon: Icon, title, desc, href }) => {
          const inner = (
            <>
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: 'var(--finn-bg-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon size={18} style={{ color: 'var(--finn-text-secondary)' }} aria-hidden />
              </span>
              <span style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>{title}</p>
                <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--finn-text-muted)' }}>{desc}</p>
              </span>
              <ChevronRight size={16} style={{ color: 'var(--finn-text-muted)' }} aria-hidden />
            </>
          )
          if (href) {
            return (
              <Link key={title} href={href} className="finn-profile-row">
                {inner}
              </Link>
            )
          }
          return (
            <button key={title} type="button" className="finn-profile-row">
              {inner}
            </button>
          )
        })}
      </div>

      <div style={{ marginTop: 24 }}>
        <ShellChromeControls variant="menu" />
      </div>

      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <button
          type="button"
          className={buttonClassName('ghost')}
          style={{ color: 'var(--ds-danger)' }}
          onClick={() => void signOut()}
        >
          <LogOut size={16} aria-hidden /> {t('finnProfileLogout')}
        </button>
      </div>
    </div>
  )
}
