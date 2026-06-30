'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { PageSkeleton } from '@/app/components/design-system'
import { formatDateTimeNo } from '@/app/lib/dateFormat'
import { getOverviewBackLink } from '@/app/lib/overviewBackNav'
import { buttonClassName } from '@/app/components/ui/Button'

type InquiryRow = {
  id: string
  created_at: string
  contact_name: string
  contact_email: string
  contact_phone: string | null
  message: string | null
  date_from: string | null
  date_to: string | null
  status: string
  central_events: { name: string; slug: string } | { name: string; slug: string }[] | null
}

export default function NavEventInquiriesPage() {
  const { t } = useLanguage()
  const pathname = usePathname()
  const [rows, setRows] = useState<InquiryRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const { data, error } = await supabase
        .from('event_inquiries')
        .select('id, created_at, contact_name, contact_email, contact_phone, message, date_from, date_to, status, central_events(name, slug)')
        .order('created_at', { ascending: false })
        .limit(50)
      if (!cancelled) {
        if (!error) setRows((data ?? []) as unknown as InquiryRow[])
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const overviewBack = getOverviewBackLink(pathname, 'kommune_ansatt', t)

  return (
    <main className="container" style={{ maxWidth: 900, padding: 'var(--space-8) var(--space-4)' }}>
      {overviewBack && (
        <Link href={overviewBack.href} className="nav-link" style={{ marginBottom: 'var(--space-4)', display: 'inline-block' }}>
          ← {overviewBack.label}
        </Link>
      )}
      <h1 style={{ margin: '0 0 var(--space-2)', color: 'var(--text-main)' }}>{t('navEventInquiriesTitle')}</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-6)' }}>{t('navEventInquiriesLead')}</p>

      {loading ? (
        <PageSkeleton minHeight={200} />
      ) : rows.length === 0 ? (
        <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}>
          {t('navEventInquiriesEmpty')}
        </div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'var(--space-4)' }}>
          {rows.map((row) => (
            <li key={row.id} className="card" style={{ padding: 'var(--space-5)' }}>
              <p style={{ margin: '0 0 4px', fontWeight: 700, color: 'var(--text-main)' }}>
                {row.contact_name} · {row.contact_email}
              </p>
              <p style={{ margin: '0 0 8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {formatDateTimeNo(row.created_at)}
                {row.central_events
                  ? ` · ${(Array.isArray(row.central_events) ? row.central_events[0]?.name : row.central_events?.name) ?? ''}`
                  : ''}
              </p>
              {row.date_from && row.date_to ? (
                <p style={{ margin: '0 0 8px', fontSize: '0.9rem', color: 'var(--text-body)' }}>
                  {row.date_from} – {row.date_to}
                </p>
              ) : null}
              {row.message ? (
                <p style={{ margin: 0, lineHeight: 1.55, color: 'var(--text-body)' }}>{row.message}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
