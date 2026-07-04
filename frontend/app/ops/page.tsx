'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Users,
  Home,
  FileCheck,
  Shield,
  SlidersHorizontal,
  Megaphone,
  Building2,
  HeartPulse,
  FileText,
} from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { usePlatformMode } from '../../context/PlatformModeContext'
import OpsGdprBanner from './components/OpsGdprBanner'
import OpsStatCard from './components/OpsStatCard'
import OpsQuickActionGrid from './components/OpsQuickActionGrid'
import OpsActivityFeed from './components/OpsActivityFeed'
import OpsAlert from './components/OpsAlert'
import { OpsPageSkeleton } from './components/OpsSkeleton'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  opsGetDashboardStats,
  opsGetSecuritySnapshot,
  opsListAuditEvents,
  type OpsDashboardStats,
  type OpsAuditItem,
} from '../lib/opsApi'

export default function OpsDashboardPage() {
  const { t } = useLanguage()
  const { flags } = usePlatformMode()
  const [stats, setStats] = useState<OpsDashboardStats | null>(null)
  const [securityStatus, setSecurityStatus] = useState<'ok' | 'warning' | 'critical'>('ok')
  const [recent, setRecent] = useState<OpsAuditItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const [s, sec, audit] = await Promise.all([
          opsGetDashboardStats(),
          opsGetSecuritySnapshot(),
          opsListAuditEvents('OPS_', new Date(Date.now() - 7 * 86400000).toISOString(), 8, 0),
        ])
        if (cancelled) return
        setStats(s)
        setSecurityStatus(sec.status)
        const signAudit = await opsListAuditEvents(
          'SIGN_',
          new Date(Date.now() - 7 * 86400000).toISOString(),
          5,
          0,
        )
        if (!cancelled) {
          setRecent(
            [...audit.items, ...signAudit.items]
              .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
              .slice(0, 8),
          )
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return <OpsPageSkeleton />
  if (error || !stats) {
    return <OpsAlert tone="error">{error || t('pageLoadStuck')}</OpsAlert>
  }

  const securityBadgeVariant =
    securityStatus === 'ok' ? 'default' : securityStatus === 'warning' ? 'secondary' : 'destructive'

  return (
    <div className="ops-stack ops-stack--lg ops-dashboard">
      <OpsGdprBanner />

      <Card className="ops-dashboard-hero">
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{t('opsConsoleKicker')}</Badge>
            <Badge variant={securityBadgeVariant}>{t(`opsSecurityStatus_${securityStatus}`)}</Badge>
            {stats.terms_pending > 0 ? (
              <Link href="/ops/terms">
                <Badge variant="destructive">
                  {t('opsPendingTermsCount').replace('{count}', String(stats.terms_pending))}
                </Badge>
              </Link>
            ) : null}
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight md:text-3xl">
            {t('opsDashboardHeroTitle')}
          </CardTitle>
          <CardDescription className="max-w-2xl text-base">{t('opsDashboardLead')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 pt-0">
          <Badge variant="secondary">
            {flags.isHjerterumMode ? t('opsPlatformModulesActive') : t('opsPlatformSocialLive')}
          </Badge>
          <Badge variant="outline">
            {t('opsKpiOperators')}: {stats.operators_active}
          </Badge>
        </CardContent>
      </Card>

      <section aria-labelledby="ops-dashboard-kpis">
        <h2 id="ops-dashboard-kpis" className="ops-section-title">
          {t('opsDashboardKpiSection')}
        </h2>
        <div className="ops-stat-grid">
          <OpsStatCard
            label={t('opsKpiUsers')}
            value={stats.users_total}
            icon={Users}
            href="/ops/accounts"
            accent="primary"
          />
          <OpsStatCard
            label={t('opsKpiListings')}
            value={stats.listings_total}
            icon={Home}
            href="/ops/kommuner"
            accent="info"
          />
          <OpsStatCard
            label={t('opsKpiActiveAgreements')}
            value={stats.agreements_active}
            icon={FileCheck}
            accent="success"
          />
          <OpsStatCard
            label={t('opsKpiSign7d')}
            value={stats.sign_events_7d}
            delta={stats.sign_events_7d > 0 ? stats.sign_events_7d : null}
            href="/ops/stats"
            accent="warning"
          />
        </div>
        <div className="ops-stat-grid ops-stat-grid--secondary">
          <OpsStatCard label={t('opsKpiLandlords')} value={stats.users_homeowner} accent="default" />
          <OpsStatCard label={t('opsKpiKommuneStaff')} value={stats.users_kommune_staff} accent="default" />
          <OpsStatCard
            label={t('opsKpiPendingTerms')}
            value={stats.terms_pending}
            href="/ops/terms"
            accent={stats.terms_pending > 0 ? 'warning' : 'default'}
          />
          <OpsStatCard
            label={t('opsKpiOperators')}
            value={stats.operators_active}
            icon={Shield}
            accent="default"
          />
        </div>
      </section>

      <section aria-labelledby="ops-dashboard-actions">
        <h2 id="ops-dashboard-actions" className="ops-section-title">
          {t('opsQuickActions')}
        </h2>
        <OpsQuickActionGrid
          actions={[
            {
              href: '/ops/platform',
              label: t('opsNavPlatform'),
              description: t('opsQuickActionPlatformDesc'),
              icon: SlidersHorizontal,
              accent: 'primary',
            },
            {
              href: '/ops/broadcasts/new',
              label: t('opsBroadcastNew'),
              description: t('opsQuickActionBroadcastDesc'),
              icon: Megaphone,
              accent: 'default',
            },
            {
              href: '/ops/terms',
              label: t('opsGoTermsQueue'),
              description: t('opsQuickActionTermsDesc'),
              icon: FileText,
              accent: stats.terms_pending > 0 ? 'warning' : 'default',
            },
            {
              href: '/ops/kommuner',
              label: t('opsNavKommuner'),
              description: t('opsQuickActionKommuneDesc'),
              icon: Building2,
              accent: 'default',
            },
            {
              href: '/ops/health',
              label: t('opsNavHealth'),
              description: t('opsQuickActionHealthDesc'),
              icon: HeartPulse,
              accent: 'success',
            },
            {
              href: '/ops/security',
              label: t('opsGoSecurity'),
              description: t('opsQuickActionSecurityDesc'),
              icon: Shield,
              accent: 'default',
            },
          ]}
        />
      </section>

      <OpsActivityFeed
        items={recent}
        title={t('opsAuditTrail')}
        viewAllHref="/ops/security"
        viewAllLabel={t('opsViewAllActivity')}
        emptyLabel={t('opsActivityEmpty')}
      />
    </div>
  )
}
