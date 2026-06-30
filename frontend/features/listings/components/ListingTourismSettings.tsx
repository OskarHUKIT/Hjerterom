'use client'

import { useState } from 'react'
import { Compass } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { supabase } from '@/app/lib/supabase'
import { Button } from '@/app/components/ui/Button'
import { useToast } from '@/app/components/design-system'

type Props = {
  listingId: string
  initialEnabled: boolean
  initialNightlyPriceCents: number | null
  initialInstantBook?: boolean
  initialCancellationPolicy?: string
  initialCheckInGuide?: string | null
  onUpdated?: (patch: {
    tourism_enabled: boolean
    tourism_nightly_price_cents: number | null
    tourism_instant_book?: boolean
    cancellation_policy?: string
    tourism_check_in_guide?: string | null
  }) => void
}

export default function ListingTourismSettings({
  listingId,
  initialEnabled,
  initialNightlyPriceCents,
  initialInstantBook = false,
  initialCancellationPolicy = 'moderate',
  initialCheckInGuide = null,
  onUpdated,
}: Props) {
  const { t } = useLanguage()
  const toast = useToast()
  const [enabled, setEnabled] = useState(initialEnabled)
  const [priceKr, setPriceKr] = useState(
    initialNightlyPriceCents != null ? String(Math.round(initialNightlyPriceCents / 100)) : ''
  )
  const [instantBook, setInstantBook] = useState(initialInstantBook)
  const [cancellationPolicy, setCancellationPolicy] = useState(initialCancellationPolicy)
  const [checkInGuide, setCheckInGuide] = useState(initialCheckInGuide ?? '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      const cents =
        enabled && priceKr.trim()
          ? Math.max(0, Math.round(Number.parseFloat(priceKr.replace(',', '.')) * 100))
          : null

      if (enabled && (cents == null || Number.isNaN(cents))) {
        toast(t('tourismPriceRequired'), 'error')
        return
      }

      const { error } = await supabase
        .from('listings')
        .update({
          tourism_enabled: enabled,
          tourism_nightly_price_cents: enabled ? cents : null,
          tourism_instant_book: enabled ? instantBook : false,
          cancellation_policy: enabled ? cancellationPolicy : 'moderate',
          tourism_check_in_guide: enabled ? (checkInGuide.trim() || null) : null,
        })
        .eq('id', listingId)

      if (error) throw error

      onUpdated?.({
        tourism_enabled: enabled,
        tourism_nightly_price_cents: enabled ? cents : null,
        tourism_instant_book: enabled ? instantBook : false,
        cancellation_policy: enabled ? cancellationPolicy : 'moderate',
        tourism_check_in_guide: enabled ? (checkInGuide.trim() || null) : null,
      })
      toast(t('tourismSaved'), 'success')
    } catch {
      toast(t('errSaveListing'), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="ds-tourism-settings card" aria-labelledby={`tourism-${listingId}`}>
      <div className="ds-tourism-settings-head">
        <Compass size={22} aria-hidden />
        <h3 id={`tourism-${listingId}`}>{t('tourismSettingsTitle')}</h3>
      </div>
      <p className="text-sm" style={{ color: 'var(--text-muted)', margin: '0 0 var(--space-4)' }}>
        {t('tourismEnabledDesc')}
      </p>
      <label className="ds-check-row">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        <span>{t('tourismEnabled')}</span>
      </label>
      {enabled ? (
        <>
          <div style={{ marginTop: 'var(--space-4)' }}>
            <label className="label" htmlFor={`tourism-price-${listingId}`}>
              {t('tourismNightlyPrice')}
            </label>
            <input
              id={`tourism-price-${listingId}`}
              type="number"
              min={0}
              step={1}
              className="input"
              value={priceKr}
              onChange={(e) => setPriceKr(e.target.value)}
              placeholder="850"
            />
          </div>
          <label className="ds-check-row" style={{ marginTop: 'var(--space-3)' }}>
            <input
              type="checkbox"
              checked={instantBook}
              onChange={(e) => setInstantBook(e.target.checked)}
            />
            <span>{t('tourismInstantBook')}</span>
          </label>
          <p className="text-sm" style={{ color: 'var(--text-muted)', margin: '4px 0 0' }}>
            {t('tourismInstantBookDesc')}
          </p>
          <div style={{ marginTop: 'var(--space-4)' }}>
            <label className="label" htmlFor={`tourism-cancel-${listingId}`}>
              {t('tourismCancellationPolicy')}
            </label>
            <select
              id={`tourism-cancel-${listingId}`}
              className="input"
              value={cancellationPolicy}
              onChange={(e) => setCancellationPolicy(e.target.value)}
            >
              <option value="flexible">{t('finnCancellation_flexible')}</option>
              <option value="moderate">{t('finnCancellation_moderate')}</option>
              <option value="strict">{t('finnCancellation_strict')}</option>
            </select>
          </div>
          <div style={{ marginTop: 'var(--space-4)' }}>
            <label className="label" htmlFor={`tourism-checkin-${listingId}`}>
              {t('checkInGuideTitle')}
            </label>
            <textarea
              id={`tourism-checkin-${listingId}`}
              className="input"
              rows={4}
              value={checkInGuide}
              onChange={(e) => setCheckInGuide(e.target.value)}
              placeholder={t('checkInGuidePlaceholder')}
            />
          </div>
        </>
      ) : null}
      <div style={{ marginTop: 'var(--space-4)' }}>
        <Button type="button" variant="accent" disabled={saving} onClick={() => void save()}>
          {saving ? t('loadingPleaseWait') : t('saveTourismSettings')}
        </Button>
      </div>
    </section>
  )
}
