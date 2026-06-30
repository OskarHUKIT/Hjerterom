'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { PageSkeleton } from '@/app/components/design-system'
import { formatDateTimeNo } from '@/app/lib/dateFormat'
import { getOverviewBackLink } from '@/app/lib/overviewBackNav'

type HandoffRow = {
  id: string
  created_at: string
  summary_text: string
  status: string
}

export default function NavLosInboxPage() {
  const { t } = useLanguage()
  const pathname = usePathname()
  const [rows, setRows] = useState<HandoffRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const { data, error } = await supabase
        .from('los_handoffs')
        .select('id, created_at, summary_text, status')
        .order('created_at', { ascending: false })
        .limit(40)
      if (!cancelled) {
        if (!error) setRows((data ?? []) as HandoffRow[])
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const overviewBack = getOverviewBackLink(pathname, 'kommune_ansatt', t)

  const closeHandoff = async (id: string) => {
    await supabase.from('los_handoffs').update({ status: 'closed' }).eq('id', id)
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'closed' } : r)))
  }

  return (
    <main className="container" style={{ maxWidth: 900, padding: 'var(--space-8) var(--space-4)' }}>
      {overviewBack && (
        <Link href={overviewBack.href} className="nav-link" style={{ marginBottom: 'var(--space-4)', display: 'inline-block' }}>
          ← {overviewBack.label}
        </Link>
      )}
      <h1 style={{ margin: '0 0 var(--space-2)', color: 'var(--text-main)' }}>{t('navLosInboxTitle')}</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-6)' }}>{t('navLosInboxLead')}</p>

      {loading ? (
        <PageSkeleton minHeight={200} />
      ) : rows.length === 0 ? (
        <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}>
          {t('navLosInboxEmpty')}
        </div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'var(--space-4)' }}>
          {rows.map((row) => (
            <li key={row.id} className="card" style={{ padding: 'var(--space-5)' }}>
              <p style={{ margin: '0 0 8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {formatDateTimeNo(row.created_at)} · {row.status}
              </p>
              <pre
                style={{
                  margin: '0 0 12px',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'inherit',
                  fontSize: '0.9rem',
                  lineHeight: 1.55,
                  color: 'var(--text-body)',
                }}
              >
                {row.summary_text}
              </pre>
              {row.status !== 'closed' && (
                <button type="button" className="button button-secondary" onClick={() => void closeHandoff(row.id)}>
                  {t('navLosInboxClose')}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
