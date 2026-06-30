'use client'

import Link from 'next/link'
import { Mail } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { buttonClassName } from '@/app/components/ui/Button'

/** Guest session placeholder — magic link auth in Phase 3.7 */
export default function FinnMinePage() {
  const { t } = useLanguage()

  return (
    <section className="finn-hero">
      <h1>{t('finnMineTitle')}</h1>
      <p>{t('finnMineLead')}</p>
      <div
        className="finn-card"
        style={{ maxWidth: 480, marginTop: 'var(--space-6)', padding: 'var(--space-6)' }}
      >
        <Mail size={32} style={{ color: '#2563eb', marginBottom: 'var(--space-3)' }} aria-hidden />
        <p style={{ lineHeight: 1.6, margin: '0 0 var(--space-4)' }}>{t('finnMineComingSoon')}</p>
        <Link href="/login" className={buttonClassName('accent')}>
          {t('finnMineLoginCta')}
        </Link>
      </div>
    </section>
  )
}
