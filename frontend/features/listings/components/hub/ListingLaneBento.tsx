'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, CalendarDays, Compass } from 'lucide-react'
import { supabase } from '@/app/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import IdentityVerificationDialog from '@/app/components/design-system/IdentityVerificationDialog'
import { useToast } from '@/app/components/design-system'
import { buttonClassName } from '@/app/components/ui/Button'

export type ListingLaneBentoProps = {
  listingId: string
  city: string
  socialKommuneActive: boolean
  hasActiveAgreement: boolean
  tourismEnabled: boolean
  tourismTermsSigned: boolean
  tourismPriceCents: number | null
  showTourism: boolean
  showEvents: boolean
  activeEventCount: number
  onListingUpdated: (patch: { tourism_enabled?: boolean }) => void
  onOpenTourismSettings: () => void
  onOpenEventOptIn: () => void
}

function LaneSwitch({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean
  disabled?: boolean
  label: string
  onChange: (next: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`listing-lane-bento__switch${checked ? ' listing-lane-bento__switch--on' : ''}`}
      onClick={(e) => {
        e.stopPropagation()
        onChange(!checked)
      }}
    >
      <span className="listing-lane-bento__switch-thumb" aria-hidden />
    </button>
  )
}

/** Three-lane bento row for Listing Hub (kokonutd/bento-grid → Boly tokens). */
export default function ListingLaneBento({
  listingId,
  city,
  socialKommuneActive,
  hasActiveAgreement,
  tourismEnabled,
  tourismTermsSigned,
  tourismPriceCents,
  showTourism,
  showEvents,
  activeEventCount,
  onListingUpdated,
  onOpenTourismSettings,
  onOpenEventOptIn,
}: ListingLaneBentoProps) {
  const { t } = useLanguage()
  const toast = useToast()
  const router = useRouter()
  const [tourismBusy, setTourismBusy] = useState(false)
  const [identityOpen, setIdentityOpen] = useState(false)
  const [tourismTermsDocId, setTourismTermsDocId] = useState<string | null>(null)
  const [pendingTourismEnable, setPendingTourismEnable] = useState(false)

  useEffect(() => {
    if (!showTourism) return
    let cancelled = false
    void (async () => {
      const { data: doc } = await supabase
        .from('terms_documents')
        .select('id')
        .eq('scope', 'turisme')
        .eq('approved_for_utleier_signing', true)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!cancelled) setTourismTermsDocId(doc?.id ?? null)
    })()
    return () => {
      cancelled = true
    }
  }, [showTourism])

  const socialActive = socialKommuneActive && hasActiveAgreement
  const tourismLive =
    tourismEnabled && tourismTermsSigned && typeof tourismPriceCents === 'number' && tourismPriceCents > 0

  const handleSosialClick = () => {
    if (!hasActiveAgreement) {
      router.push('/homeowner/agreements')
      return
    }
    document.getElementById('hub-calendar-heading')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const disableTourism = async () => {
    setTourismBusy(true)
    try {
      const { error } = await supabase
        .from('listings')
        .update({ tourism_enabled: false, tourism_nightly_price_cents: null })
        .eq('id', listingId)
      if (error) throw error
      onListingUpdated({ tourism_enabled: false })
      toast(t('tourismSaved'), 'success')
    } catch {
      toast(t('errSaveListing'), 'error')
    } finally {
      setTourismBusy(false)
    }
  }

  const continueTourismEnable = useCallback(() => {
    setPendingTourismEnable(false)
    if (!tourismTermsSigned) {
      if (tourismTermsDocId) {
        router.push(
          `/homeowner/sign-terms?doc=${tourismTermsDocId}&returnTo=${encodeURIComponent(
            `/homeowner/listings/${listingId}?section=tourism`
          )}`
        )
      } else {
        router.push('/homeowner/sign-terms')
      }
      return
    }
    onOpenTourismSettings()
  }, [listingId, onOpenTourismSettings, router, tourismTermsDocId, tourismTermsSigned])

  const handleTourismToggle = (next: boolean) => {
    if (tourismBusy) return
    if (!next) {
      void disableTourism()
      return
    }
    if (!tourismTermsSigned) {
      setPendingTourismEnable(true)
      setIdentityOpen(true)
      return
    }
    onOpenTourismSettings()
  }

  const handleIdentityConfirm = () => {
    setIdentityOpen(false)
    continueTourismEnable()
  }

  const tileCount = 1 + (showTourism ? 1 : 0) + (showEvents ? 1 : 0)

  return (
    <>
      <div
        className={`listing-lane-bento ds-bento-grid ds-bento-grid--${tileCount}`}
        aria-label={t('listingHubBentoAria')}
      >
        <article className="listing-lane-bento__tile listing-lane-bento__tile--social">
          <button type="button" className="listing-lane-bento__surface" onClick={handleSosialClick}>
            <div className="listing-lane-bento__head">
              <span className="listing-lane-bento__icon" aria-hidden>
                <Building2 size={22} />
              </span>
              <span className="listing-lane-bento__lane">{t('laneSosial')}</span>
            </div>
            <p className="listing-lane-bento__meta">{city.trim() || t('laneSocialMeta')}</p>
            <span
              className={`listing-lane-bento__tag${socialActive ? ' listing-lane-bento__tag--active' : ''}`}
            >
              {socialActive ? t('listingHubLaneOn') : t('laneNeedsAgreement')}
            </span>
            <p className="listing-lane-bento__desc">{t('laneSocialDescShort')}</p>
            {!hasActiveAgreement ? (
              <span className="listing-lane-bento__cta listing-lane-bento__cta--link">
                {t('homeownerNavAgreements')}
              </span>
            ) : null}
          </button>
        </article>

        {showTourism ? (
          <article className="listing-lane-bento__tile listing-lane-bento__tile--finn">
            <div className="listing-lane-bento__surface listing-lane-bento__surface--static">
              <div className="listing-lane-bento__head">
                <span className="listing-lane-bento__icon" aria-hidden>
                  <Compass size={22} />
                </span>
                <span className="listing-lane-bento__lane">{t('laneTourism')}</span>
              </div>
              <p className="listing-lane-bento__meta">{t('laneTourismMeta')}</p>
              <span
                className={`listing-lane-bento__tag${tourismLive ? ' listing-lane-bento__tag--active' : ''}`}
              >
                {tourismLive ? t('laneTourismLive') : t('laneTourismOff')}
              </span>
              <p className="listing-lane-bento__desc">{t('laneTourismDescShort')}</p>
              <div className="listing-lane-bento__actions">
                <LaneSwitch
                  checked={tourismEnabled}
                  disabled={tourismBusy}
                  label={t('tourismEnabled')}
                  onChange={handleTourismToggle}
                />
                {tourismEnabled || tourismTermsSigned ? (
                  <button
                    type="button"
                    className={buttonClassName('secondary', 'listing-lane-bento__configure')}
                    onClick={onOpenTourismSettings}
                  >
                    {t('laneTourismConfigure')}
                  </button>
                ) : null}
              </div>
            </div>
          </article>
        ) : null}

        {showEvents ? (
          <article className="listing-lane-bento__tile listing-lane-bento__tile--event">
            <button type="button" className="listing-lane-bento__surface" onClick={onOpenEventOptIn}>
              <div className="listing-lane-bento__head">
                <span className="listing-lane-bento__icon" aria-hidden>
                  <CalendarDays size={22} />
                </span>
                <span className="listing-lane-bento__lane">{t('laneEvent')}</span>
              </div>
              <p className="listing-lane-bento__meta">
                {t('laneEventActiveMeta').replace('{n}', String(activeEventCount))}
              </p>
              <span
                className={`listing-lane-bento__tag${activeEventCount > 0 ? ' listing-lane-bento__tag--active' : ''}`}
              >
                {activeEventCount > 0 ? t('listingHubLaneOn') : t('listingHubLaneOff')}
              </span>
              <p className="listing-lane-bento__desc">{t('laneEventDescShort')}</p>
              <span className="listing-lane-bento__cta">{t('laneEventOptInCta')}</span>
            </button>
          </article>
        ) : null}
      </div>

      <IdentityVerificationDialog
        open={identityOpen}
        onClose={() => {
          setIdentityOpen(false)
          setPendingTourismEnable(false)
        }}
        onConfirm={handleIdentityConfirm}
        title={t('signTermsIdentityDialogTitle')}
        body={t('signTermsIdentityDialogBody')}
        confirmLabel={t('signTermsIdentityDialogConfirm')}
        cancelLabel={t('signTermsIdentityDialogCancel')}
        busy={pendingTourismEnable && tourismBusy}
      />
    </>
  )
}
