'use client'

import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Download, Shield, Info, Mail, ExternalLink } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useLanguage } from '../../../context/LanguageContext'
import { useAuthSession } from '../../../context/AuthSessionContext'
import { logError } from '@/app/lib/appLogger'
import { fetchHeaderBundle, headerBundleQueryKey } from '../../lib/queries/headerBundleQuery'
import { getOverviewBackLink } from '../../lib/overviewBackNav'

type DpoContact = {
  region: string | null
  dpo_name: string | null
  dpo_email: string | null
  dpo_phone: string | null
}

const card: CSSProperties = {
  padding: 'var(--space-6)',
  borderRadius: 'var(--radius-lg)',
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border-subtle)',
  marginBottom: 'var(--space-4)',
}

const sectionHeader: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-3)',
  marginBottom: 'var(--space-3)',
}

const sectionIcon: CSSProperties = {
  flexShrink: 0,
  width: 40,
  height: 40,
  borderRadius: 'var(--radius-md)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'var(--bg-accent-subtle)',
  color: 'var(--color-accent)',
}

const sectionTitle: CSSProperties = {
  color: 'var(--text-main)',
  fontSize: 'clamp(1.05rem, 1rem + 0.3vw, 1.2rem)',
  fontWeight: 600,
  margin: 0,
  lineHeight: 1.3,
}

const sectionBadge: CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 500,
  color: 'var(--text-muted)',
  letterSpacing: '0.02em',
  textTransform: 'uppercase',
}

const sectionDesc: CSSProperties = {
  color: 'var(--text-body)',
  fontSize: '0.95rem',
  lineHeight: 1.6,
  marginBottom: 'var(--space-4)',
}

const primaryButton: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
  padding: 'var(--space-3) var(--space-5)',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--color-accent)',
  color: 'var(--bg-main)',
  border: 'none',
  fontSize: '0.95rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'opacity 0.15s ease',
}

const secondaryButton: CSSProperties = {
  ...primaryButton,
  backgroundColor: 'transparent',
  color: 'var(--text-main)',
  border: '1px solid var(--border-subtle)',
}

const disabledButton: CSSProperties = {
  ...primaryButton,
  opacity: 0.5,
  cursor: 'not-allowed',
  backgroundColor: 'var(--bg-muted)',
  color: 'var(--text-muted)',
}

const errorText: CSSProperties = {
  color: 'var(--color-danger, #dc2626)',
  fontSize: '0.9rem',
  marginTop: 'var(--space-2)',
}

const listItem: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
  padding: 'var(--space-2) 0',
  color: 'var(--text-body)',
  fontSize: '0.95rem',
}

type DownloadState = 'idle' | 'loading' | 'error'

export default function PrivacySettingsPage() {
  const { t } = useLanguage()
  const { user, isReady } = useAuthSession()
  const router = useRouter()
  const pathname = usePathname()
  const [downloadState, setDownloadState] = useState<DownloadState>('idle')
  const [dpo, setDpo] = useState<DpoContact | null>(null)

  const { data: headerBundle } = useQuery({
    queryKey: user?.id ? headerBundleQueryKey(user.id) : ['header', 'bundle', '__'],
    queryFn: () =>
      fetchHeaderBundle(user!.id, user?.user_metadata ?? null, user?.email ?? null),
    enabled: !!user?.id,
    staleTime: 60_000,
  })

  const backNav =
    getOverviewBackLink(pathname, headerBundle?.role ?? null, t) ?? {
      href: '/',
      label: t('overview'),
    }

  useEffect(() => {
    if (!isReady) return
    if (!user) {
      router.replace('/login')
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const { data, error } = await supabase.rpc('get_dpo_contact_for_user', {
          p_user_id: user.id,
        })
        if (cancelled) return
        if (error) {
          logError(`dpo lookup: ${error.message}`)
          return
        }
        if (Array.isArray(data) && data.length > 0) {
          setDpo(data[0] as DpoContact)
        }
      } catch (e) {
        logError(`dpo lookup threw: ${e instanceof Error ? e.message : String(e)}`)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isReady, user, router])

  const handleDownload = useCallback(async () => {
    setDownloadState('loading')
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) {
        setDownloadState('error')
        return
      }
      const res = await fetch('/api/user/export', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        setDownloadState('error')
        return
      }
      const blob = await res.blob()
      const filename =
        res.headers
          .get('Content-Disposition')
          ?.match(/filename="([^"]+)"/)?.[1] ||
        `boly-personopplysninger-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.json`

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setDownloadState('idle')
    } catch (e) {
      logError(`privacy export failed: ${e instanceof Error ? e.message : String(e)}`)
      setDownloadState('error')
    }
  }, [])

  const erasureHref = dpo?.dpo_email
    ? `mailto:${dpo.dpo_email}?subject=${encodeURIComponent(
        'Forespørsel om sletting av personopplysninger (GDPR art. 17)'
      )}&body=${encodeURIComponent(
        `Hei,\n\nJeg ønsker å be om sletting av mine personopplysninger i Boly iht. GDPR art. 17.\n\nBruker-ID: ${user?.id ?? ''}\nE-post: ${user?.email ?? ''}\n\nMvh\n`
      )}`
    : 'mailto:info@bolynorge.no?subject=GDPR%20art.%2017'

  if (!isReady) {
    return (
      <main className="container" style={{ paddingBottom: 'var(--space-12)' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto', padding: 'var(--space-8) 0' }}>
          <div style={{ color: 'var(--text-muted)' }}>Laster …</div>
        </div>
      </main>
    )
  }

  return (
    <main className="container" style={{ paddingBottom: 'var(--space-12)' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        <div style={{ marginBottom: 'var(--space-6)', paddingTop: 'var(--space-4)' }}>
          <Link
            prefetch={false}
            href={backNav.href}
            className="nav-link"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              marginBottom: 'var(--space-4)',
              color: 'var(--text-muted)',
              textDecoration: 'none',
              fontSize: '0.9rem',
            }}
          >
            ← {backNav.label}
          </Link>
          <h1
            style={{
              fontSize: 'clamp(1.6rem, 1.2rem + 1.5vw, 2.25rem)',
              fontWeight: 700,
              color: 'var(--text-main)',
              marginBottom: 'var(--space-2)',
              lineHeight: 1.2,
            }}
          >
            {t('privacyCenterTitle')}
          </h1>
          <p
            style={{
              fontSize: '1rem',
              color: 'var(--text-body)',
              lineHeight: 1.6,
              marginBottom: 0,
            }}
          >
            {t('privacyCenterSubtitle')}
          </p>
        </div>

        <section style={card} aria-labelledby="section-access">
          <header style={sectionHeader}>
            <div style={sectionIcon} aria-hidden="true">
              <Download size={20} />
            </div>
            <div>
              <h2 id="section-access" style={sectionTitle}>
                {t('privacyCenterSectionAccessTitle')}
              </h2>
              <span style={sectionBadge}>{t('privacyCenterSectionAccessLegal')}</span>
            </div>
          </header>
          <p style={sectionDesc}>{t('privacyCenterSectionAccessDesc')}</p>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloadState === 'loading'}
            style={downloadState === 'loading' ? disabledButton : primaryButton}
            aria-busy={downloadState === 'loading'}
          >
            <Download size={18} aria-hidden="true" />
            {downloadState === 'loading'
              ? t('privacyCenterDownloading')
              : t('privacyCenterDownloadButton')}
          </button>
          {downloadState === 'error' ? (
            <div style={errorText} role="alert">
              {t('privacyCenterDownloadError')}
            </div>
          ) : null}
        </section>

        <section style={card} aria-labelledby="section-account">
          <header style={sectionHeader}>
            <div style={sectionIcon} aria-hidden="true">
              <Info size={20} />
            </div>
            <div>
              <h2 id="section-account" style={sectionTitle}>
                {t('privacyCenterSectionAccountTitle')}
              </h2>
              <span style={sectionBadge}>{t('privacyCenterDeleteAccountComingSoon')}</span>
            </div>
          </header>
          <p style={sectionDesc}>{t('privacyCenterSectionAccountDesc')}</p>
          <a href="#section-erasure" style={secondaryButton}>
            <Shield size={18} aria-hidden="true" />
            {t('privacyCenterDeleteAccountContactCtaLabel')}
          </a>
        </section>

        <section style={card} aria-labelledby="section-erasure">
          <header style={sectionHeader}>
            <div style={sectionIcon} aria-hidden="true">
              <Shield size={20} />
            </div>
            <div>
              <h2 id="section-erasure" style={sectionTitle}>
                {t('privacyCenterSectionErasureTitle')}
              </h2>
              <span style={sectionBadge}>{t('privacyCenterSectionErasureLegal')}</span>
            </div>
          </header>
          <p style={sectionDesc}>{t('privacyCenterSectionErasureDesc')}</p>
          {dpo?.dpo_email ? (
            <div
              style={{
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                marginBottom: 'var(--space-4)',
                fontSize: '0.9rem',
                color: 'var(--text-body)',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 'var(--space-1)' }}>
                {dpo.dpo_name || dpo.region}
              </div>
              <div style={{ color: 'var(--text-muted)' }}>{dpo.dpo_email}</div>
            </div>
          ) : null}
          <a
            href={erasureHref}
            style={secondaryButton}
          >
            <Mail size={18} aria-hidden="true" />
            {dpo?.dpo_email
              ? t('privacyCenterErasureContactLabel')
              : t('privacyCenterErasureGenericFallback')}
          </a>
        </section>

        <section style={card} aria-labelledby="section-other">
          <header style={sectionHeader}>
            <div style={sectionIcon} aria-hidden="true">
              <ExternalLink size={20} />
            </div>
            <h2 id="section-other" style={sectionTitle}>
              {t('privacyCenterSectionOtherTitle')}
            </h2>
          </header>
          <div role="list">
            <div style={listItem} role="listitem">
              <Mail size={16} aria-hidden="true" style={{ color: 'var(--text-muted)' }} />
              <a href={erasureHref} style={{ color: 'var(--text-body)' }}>
                {t('privacyCenterOtherRectification')}
              </a>
            </div>
            <div style={listItem} role="listitem">
              <Mail size={16} aria-hidden="true" style={{ color: 'var(--text-muted)' }} />
              <a href={erasureHref} style={{ color: 'var(--text-body)' }}>
                {t('privacyCenterOtherRestriction')}
              </a>
            </div>
            <div style={listItem} role="listitem">
              <Mail size={16} aria-hidden="true" style={{ color: 'var(--text-muted)' }} />
              <a href={erasureHref} style={{ color: 'var(--text-body)' }}>
                {t('privacyCenterOtherObjection')}
              </a>
            </div>
            <div style={listItem} role="listitem">
              <ExternalLink
                size={16}
                aria-hidden="true"
                style={{ color: 'var(--text-muted)' }}
              />
              <a
                href="https://www.datatilsynet.no"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--text-body)' }}
              >
                {t('privacyCenterOtherDatatilsynet')}
              </a>
            </div>
            <div style={listItem} role="listitem">
              <Shield
                size={16}
                aria-hidden="true"
                style={{ color: 'var(--text-muted)' }}
              />
              <Link prefetch={false} href="/personvern" style={{ color: 'var(--text-body)' }}>
                {t('privacyCenterReadPolicy')}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
