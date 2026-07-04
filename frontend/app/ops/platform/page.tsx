'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Building2,
  CalendarDays,
  Compass,
  CreditCard,
  Home,
  MessageCircle,
  Plane,
  RefreshCw,
  Sparkles,
  Users,
} from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { usePlatformMode } from '@/context/PlatformModeContext'
import { useToast } from '@/app/components/design-system'
import { Button } from '@/app/components/ui/Button'
import {
  opsApplyPlatformPreset,
  opsGetPlatformSettings,
  opsSetPlatformSettings,
  type OpsPlatformSettingsPayload,
} from '@/app/lib/opsApi'
import { effectivePlatformFlags } from '@/lib/platformSettings'
import { normalizeModuleSettings } from '@/lib/moduleRegistry'
import { formatDateTimeNo } from '@/app/lib/dateFormat'
import OpsPageHeader from '../components/OpsPageHeader'
import OpsPanel from '../components/OpsPanel'
import OpsBadge from '../components/OpsBadge'
import OpsAlert from '../components/OpsAlert'
import { OpsPageSkeleton } from '../components/OpsSkeleton'

type LocalSettings = {
  socialModuleEnabled: boolean
  finnPortalEnabled: boolean
  losPortalEnabled: boolean
  centralEventsEnabled: boolean
  tourismLaneEnabled: boolean
  stripeBookingsEnabled: boolean
}

function fromPayload(p: OpsPlatformSettingsPayload): LocalSettings {
  return {
    socialModuleEnabled: p.social_module_enabled !== false,
    finnPortalEnabled: Boolean(p.finn_portal_enabled),
    losPortalEnabled: Boolean(p.los_portal_enabled),
    centralEventsEnabled: Boolean(p.central_events_enabled),
    tourismLaneEnabled: Boolean(p.tourism_lane_enabled),
    stripeBookingsEnabled: Boolean(p.stripe_bookings_enabled),
  }
}

export default function OpsPlatformControlPage() {
  const { t } = useLanguage()
  const toast = useToast()
  const { refetch: refetchGlobal } = usePlatformMode()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [settings, setSettings] = useState<LocalSettings>({
    socialModuleEnabled: true,
    finnPortalEnabled: false,
    losPortalEnabled: false,
    centralEventsEnabled: false,
    tourismLaneEnabled: false,
    stripeBookingsEnabled: false,
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await opsGetPlatformSettings()
      setSettings(fromPayload(data))
      setUpdatedAt(data.updated_at ?? null)
    } catch (e) {
      toast(e instanceof Error ? e.message : t('pageLoadStuck'), 'error')
    } finally {
      setLoading(false)
    }
  }, [t, toast])

  useEffect(() => {
    void load()
  }, [load])

  const applyPreset = async (preset: 'social_only' | 'hjerterum_full' | 'hjerterum_pilot') => {
    setSaving(true)
    try {
      const rpcPreset =
        preset === 'social_only' ? 'boly_only' : preset
      const res = await opsApplyPlatformPreset(rpcPreset)
      setSettings(fromPayload(res.settings))
      setUpdatedAt(res.settings.updated_at ?? null)
      refetchGlobal()
      toast(t('opsPlatformSaved'), 'success')
    } catch (e) {
      toast(e instanceof Error ? e.message : t('errorPrefix'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const patchSettings = (patch: Partial<LocalSettings>) => {
    setSettings((s) => normalizeModuleSettings({ ...s, ...patch }))
  }

  const save = async () => {
    setSaving(true)
    try {
      const normalized = normalizeModuleSettings(settings)
      const res = await opsSetPlatformSettings({
        socialModuleEnabled: normalized.socialModuleEnabled,
        finnPortalEnabled: normalized.finnPortalEnabled,
        losPortalEnabled: normalized.losPortalEnabled,
        centralEventsEnabled: normalized.centralEventsEnabled,
        tourismLaneEnabled: normalized.tourismLaneEnabled,
        stripeBookingsEnabled: normalized.stripeBookingsEnabled,
      })
      setSettings(fromPayload(res.settings))
      setUpdatedAt(res.settings.updated_at ?? null)
      refetchGlobal()
      toast(t('opsPlatformSaved'), 'success')
    } catch (e) {
      toast(e instanceof Error ? e.message : t('errorPrefix'), 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <OpsPageSkeleton />

  const flags = effectivePlatformFlags({
    socialModuleEnabled: settings.socialModuleEnabled,
    finnPortalEnabled: settings.finnPortalEnabled,
    losPortalEnabled: settings.losPortalEnabled,
    centralEventsEnabled: settings.centralEventsEnabled,
    tourismLaneEnabled: settings.tourismLaneEnabled,
    stripeBookingsEnabled: settings.stripeBookingsEnabled,
    updatedAt,
  })

  const activeModuleCount = [
    flags.social,
    flags.tourism,
    flags.finn,
    flags.los,
    flags.centralEvents,
    flags.stripeBookings,
  ].filter(Boolean).length

  const featureRows = [
    {
      key: 'social' as const,
      icon: Users,
      label: t('opsPlatformSocialLabel'),
      desc: t('opsPlatformSocialDesc'),
      checked: settings.socialModuleEnabled,
      live: flags.social,
      disabled: false,
      onChange: (v: boolean) => patchSettings({ socialModuleEnabled: v }),
    },
    {
      key: 'tourism' as const,
      icon: Plane,
      label: t('opsPlatformTourismLabel'),
      desc: t('opsPlatformTourismDesc'),
      checked: settings.tourismLaneEnabled,
      live: flags.tourism,
      disabled: false,
      onChange: (v: boolean) =>
        patchSettings({
          tourismLaneEnabled: v,
          ...(v ? { finnPortalEnabled: true } : {}),
        }),
    },
    {
      key: 'finn' as const,
      icon: Compass,
      label: t('opsPlatformFinnLabel'),
      desc: t('opsPlatformFinnDesc'),
      checked: settings.finnPortalEnabled,
      live: flags.finn,
      disabled: !settings.tourismLaneEnabled,
      onChange: (v: boolean) => patchSettings({ finnPortalEnabled: v }),
    },
    {
      key: 'los',
      icon: MessageCircle,
      label: t('opsPlatformLosLabel'),
      desc: t('opsPlatformLosDesc'),
      checked: settings.losPortalEnabled,
      live: flags.los,
      disabled: !settings.socialModuleEnabled,
      onChange: (v: boolean) => patchSettings({ losPortalEnabled: v }),
    },
    {
      key: 'events',
      icon: CalendarDays,
      label: t('opsPlatformEventsLabel'),
      desc: t('opsPlatformEventsDesc'),
      checked: settings.centralEventsEnabled,
      live: flags.centralEvents,
      disabled: false,
      onChange: (v: boolean) => patchSettings({ centralEventsEnabled: v }),
    },
    {
      key: 'stripe',
      icon: CreditCard,
      label: t('opsPlatformStripeLabel'),
      desc: t('opsPlatformStripeDesc'),
      checked: settings.stripeBookingsEnabled,
      live: flags.stripeBookings,
      disabled: !settings.tourismLaneEnabled,
      onChange: (v: boolean) => patchSettings({ stripeBookingsEnabled: v }),
    },
  ]

  return (
    <div className="ops-stack ops-stack--lg">
      <OpsPageHeader
        title={t('opsPlatformTitle')}
        lead={t('opsPlatformLeadModules')}
        actions={
          <Button type="button" variant="secondary" disabled={saving} onClick={() => void load()}>
            <RefreshCw size={16} aria-hidden /> {t('retryLoad')}
          </Button>
        }
      />

      <div className="ops-platform-hero card">
        <div className="ops-platform-hero-main">
          <p className="ops-sidebar-kicker">{t('opsPlatformActiveModules')}</p>
          <h2 className="ops-platform-hero-title">
            {activeModuleCount} {t('opsPlatformModulesActive')}
          </h2>
          <p className="ops-platform-hero-desc">{t('opsPlatformModulesDesc')}</p>
          {updatedAt ? (
            <p className="ops-meta" style={{ marginTop: 'var(--space-2)' }}>
              {t('opsPlatformUpdated')}: {formatDateTimeNo(updatedAt)}
            </p>
          ) : null}
        </div>
        <div className="ops-platform-hero-badges">
          <OpsBadge tone={flags.social ? 'success' : 'neutral'} dot>
            {flags.social ? t('opsPlatformSocialLive') : t('opsPlatformSocialOff')}
          </OpsBadge>
          {flags.tourism ? (
            <OpsBadge tone="info" dot>
              {t('opsPlatformTourismLive')}
            </OpsBadge>
          ) : null}
        </div>
      </div>

      <OpsPanel title={t('opsPlatformPresetsTitle')} description={t('opsPlatformPresetsDesc')}>
        <div className="ops-platform-presets">
          <button
            type="button"
            className="ops-platform-preset card"
            disabled={saving}
            onClick={() => void applyPreset('social_only')}
          >
            <Home size={28} aria-hidden />
            <strong>{t('opsPlatformPresetSocialTitle')}</strong>
            <span>{t('opsPlatformPresetSocialDesc')}</span>
          </button>
          <button
            type="button"
            className="ops-platform-preset card"
            disabled={saving}
            onClick={() => void applyPreset('hjerterum_pilot')}
          >
            <Building2 size={28} aria-hidden />
            <strong>{t('opsPlatformPresetPilotTitle')}</strong>
            <span>{t('opsPlatformPresetPilotDesc')}</span>
          </button>
          <button
            type="button"
            className="ops-platform-preset card"
            disabled={saving}
            onClick={() => void applyPreset('hjerterum_full')}
          >
            <Sparkles size={28} aria-hidden />
            <strong>{t('opsPlatformPresetFullTitle')}</strong>
            <span>{t('opsPlatformPresetFullDesc')}</span>
          </button>
        </div>
      </OpsPanel>

      <OpsPanel title={t('opsPlatformModulesTitle')} description={t('opsPlatformModulesDesc')}>
        {!settings.tourismLaneEnabled ? (
          <OpsAlert tone="info">{t('opsPlatformTourismOffBookingsHint')}</OpsAlert>
        ) : null}
        <div className="ops-platform-modules">
          {featureRows.map((row) => {
            const Icon = row.icon
            return (
              <label key={row.key} className="ops-platform-module card">
                <div className="ops-platform-module-head">
                  <Icon size={22} aria-hidden />
                  <div>
                    <span className="ops-list-card-title">{row.label}</span>
                    <p className="ops-meta">{row.desc}</p>
                  </div>
                  <OpsBadge tone={row.live ? 'success' : 'neutral'}>
                    {row.live ? t('opsPlatformLive') : t('opsPlatformOff')}
                  </OpsBadge>
                </div>
                <input
                  type="checkbox"
                  checked={row.checked}
                  disabled={saving || row.disabled}
                  onChange={(e) => row.onChange(e.target.checked)}
                />
              </label>
            )
          })}
        </div>
      </OpsPanel>

      <div className="ops-actions-row">
        <Button type="button" variant="accent" disabled={saving} onClick={() => void save()}>
          {saving ? t('dbSavingShort') : t('opsPlatformSave')}
        </Button>
        <Link href="/">
          <Button type="button" variant="secondary">
            {t('opsPlatformOpenApp')}
          </Button>
        </Link>
        <Link href="/ops/kommuner">
          <Button type="button" variant="secondary">
            {t('opsNavKommuner')}
          </Button>
        </Link>
      </div>
    </div>
  )
}
