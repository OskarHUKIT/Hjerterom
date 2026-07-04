'use client'

import { useState } from 'react'
import { CreditCard } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { useToast } from '@/app/components/design-system'
import { Button } from '@/app/components/ui/Button'

export default function LandlordStripeConnect() {
  const { t } = useLanguage()
  const toast = useToast()
  const [loading, setLoading] = useState(false)

  const startOnboarding = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/connect', { method: 'POST' })
      const data = (await res.json()) as { url?: string; error?: string }
      if (!res.ok) {
        toast(data.error ?? t('stripeConnectError'), 'error')
        return
      }
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      toast(t('stripeConnectError'), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section
      className="card"
      style={{
        marginBottom: 'var(--space-6)',
        padding: 'var(--space-5)',
        borderLeft: '4px solid var(--color-teal)',
      }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <CreditCard size={24} style={{ color: 'var(--color-teal)', flexShrink: 0 }} aria-hidden />
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: '0 0 8px', color: 'var(--text-main)' }}>{t('stripeConnectTitle')}</h3>
          <p style={{ margin: '0 0 16px', color: 'var(--text-body)', lineHeight: 1.55, fontSize: '0.95rem' }}>
            {t('stripeConnectLead')}
          </p>
          <Button type="button" variant="accent" disabled={loading} onClick={() => void startOnboarding()}>
            {loading ? t('stripeConnectLoading') : t('stripeConnectCta')}
          </Button>
        </div>
      </div>
    </section>
  )
}
