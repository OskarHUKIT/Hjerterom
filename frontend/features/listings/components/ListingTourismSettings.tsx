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
  onUpdated?: (patch: { tourism_enabled: boolean; tourism_nightly_price_cents: number | null }) => void
}

export default function ListingTourismSettings({
  listingId,
  initialEnabled,
  initialNightlyPriceCents,
  onUpdated,
}: Props) {
  const { t } = useLanguage()
  const toast = useToast()
  const [enabled, setEnabled] = useState(initialEnabled)
  const [priceKr, setPriceKr] = useState(
    initialNightlyPriceCents != null ? String(Math.round(initialNightlyPriceCents / 100)) : ''
  )
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
        })
        .eq('id', listingId)

      if (error) throw error

      onUpdated?.({ tourism_enabled: enabled, tourism_nightly_price_cents: enabled ? cents : null })
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
      ) : null}
      <div style={{ marginTop: 'var(--space-4)' }}>
        <Button type="button" variant="accent" disabled={saving} onClick={() => void save()}>
          {saving ? t('loadingPleaseWait') : t('saveTourismSettings')}
        </Button>
      </div>
    </section>
  )
}
