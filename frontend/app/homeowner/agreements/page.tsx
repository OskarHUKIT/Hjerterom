'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FileText, ShieldCheck } from 'lucide-react'
import { supabase, getAuthUserDeduped } from '@/app/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { PageSkeleton } from '@/app/components/design-system'
import LoadingPlaceholder from '@/app/components/LoadingPlaceholder'

type AgreementRow = {
  id: string
  title: string
  scope: string
  event_id: string | null
  version: number
  signed: boolean
  central_events?: { name: string } | null
}

export default function LandlordAgreementsPage() {
  const { t } = useLanguage()
  const [rows, setRows] = useState<AgreementRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      const user = await getAuthUserDeduped()
      if (!user) return
      const { data: docs } = await supabase
        .from('terms_documents')
        .select('id, title, scope, event_id, version, central_events(name)')
        .eq('approved_for_utleier_signing', true)
        .in('scope', ['kommune', 'event', 'turisme'])
        .order('scope')
        .order('version', { ascending: false })

      const { data: signed } = await supabase
        .from('user_terms_acceptances')
        .select('terms_document_id')
        .eq('user_id', user.id)
        .eq('status', 'active')

      const signedSet = new Set((signed ?? []).map((s) => s.terms_document_id))
      const seen = new Set<string>()
      const list: AgreementRow[] = []
      for (const doc of docs ?? []) {
        const key =
          doc.scope === 'event' && doc.event_id
            ? `event:${doc.event_id}`
            : doc.scope === 'turisme'
              ? 'turisme'
              : `kommune:${doc.id}`
        if (seen.has(key)) continue
        seen.add(key)
        list.push({
          id: doc.id,
          title: doc.title,
          scope: doc.scope,
          event_id: doc.event_id,
          version: doc.version,
          signed: signedSet.has(doc.id),
          central_events: Array.isArray(doc.central_events) ? doc.central_events[0] ?? null : doc.central_events,
        })
      }
      setRows(list)
      setLoading(false)
    })()
  }, [])

  if (loading) return <PageSkeleton minHeight={320} />

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 'var(--space-4)' }}>
      <h1 style={{ margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <ShieldCheck size={28} aria-hidden />
        {t('landlordAgreementsTitle')}
      </h1>
      <p style={{ margin: '0 0 24px', opacity: 0.8, lineHeight: 1.55 }}>{t('landlordAgreementsLead')}</p>

      {rows.length === 0 ? (
        <p style={{ opacity: 0.7 }}>{t('landlordAgreementsEmpty')}</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rows.map((row) => {
            const eventName = row.central_events?.name
            const scopeLabel =
              row.scope === 'turisme'
                ? t('agreementScopeTourism')
                : row.scope === 'event'
                  ? `${t('agreementScopeEvent')}${eventName ? `: ${eventName}` : ''}`
                  : t('agreementScopeKommune')
            return (
              <li key={row.id} className="card" style={{ padding: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{row.title}</div>
                    <div style={{ fontSize: '0.85rem', opacity: 0.75, marginTop: 4 }}>{scopeLabel}</div>
                  </div>
                  <span
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      padding: '4px 10px',
                      borderRadius: 999,
                      background: row.signed ? 'rgba(34, 197, 94, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                      color: row.signed ? '#15803d' : '#b45309',
                    }}
                  >
                    {row.signed ? t('agreementSigned') : t('agreementPending')}
                  </span>
                </div>
                {!row.signed ? (
                  <Link
                    href={`/homeowner/sign-terms?doc=${row.id}`}
                    className="button button-accent"
                    style={{
                      marginTop: 12,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      textDecoration: 'none',
                    }}
                  >
                    <FileText size={18} aria-hidden />
                    {t('agreementSignCta')}
                  </Link>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
