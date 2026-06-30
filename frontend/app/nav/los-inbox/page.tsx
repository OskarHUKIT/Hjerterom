'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { PageSkeleton } from '@/app/components/design-system'
import { Button } from '@/app/components/ui/Button'
import { formatDateTimeNo } from '@/app/lib/dateFormat'
import { getOverviewBackLink } from '@/app/lib/overviewBackNav'
import { UserCheck, ArrowRight, Database } from 'lucide-react'

type HandoffRow = {
  id: string
  created_at: string
  summary_text: string
  status: string
  case_reference: string | null
  contact_name: string | null
  contact_phone: string | null
  assigned_profile_id: string | null
  kommune_id: string | null
  kommuner: { name: string } | { name: string }[] | null
}

const STATUS_LABEL: Record<string, string> = {
  new: 'navLosInboxStatusNew',
  assigned: 'navLosInboxStatusAssigned',
  in_progress: 'navLosInboxStatusInProgress',
  closed: 'navLosInboxStatusClosed',
}

export default function NavLosInboxPage() {
  const { t } = useLanguage()
  const pathname = usePathname()
  const [rows, setRows] = useState<HandoffRow[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  const load = async () => {
    const { data: auth } = await supabase.auth.getUser()
    setUserId(auth.user?.id ?? null)
    const { data, error } = await supabase
      .from('los_handoffs')
      .select(
        'id, created_at, summary_text, status, case_reference, contact_name, contact_phone, assigned_profile_id, kommune_id, kommuner(name)'
      )
      .order('created_at', { ascending: false })
      .limit(50)
    if (!error) setRows((data ?? []) as HandoffRow[])
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  const overviewBack = getOverviewBackLink(pathname, 'kommune_ansatt', t)

  const assignToMe = async (id: string) => {
    const { data } = await supabase.rpc('kommune_assign_los_handoff', { p_handoff_id: id })
    const ok = (data as { ok?: boolean })?.ok
    if (ok) void load()
  }

  const startMediation = async (id: string) => {
    await supabase.rpc('kommune_progress_los_handoff', { p_handoff_id: id })
    void load()
  }

  const closeHandoff = async (id: string) => {
    await supabase.from('los_handoffs').update({ status: 'closed' }).eq('id', id)
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'closed' } : r)))
  }

  const kommuneName = (row: HandoffRow) => {
    const k = row.kommuner
    if (!k) return null
    return Array.isArray(k) ? k[0]?.name : k.name
  }

  return (
    <main className="container" style={{ maxWidth: 960, padding: 'var(--space-8) var(--space-4)' }}>
      {overviewBack ? (
        <Link
          href={overviewBack.href}
          className="nav-link"
          style={{ marginBottom: 'var(--space-4)', display: 'inline-block' }}
        >
          ← {overviewBack.label}
        </Link>
      ) : null}

      <header style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ margin: '0 0 var(--space-2)', color: 'var(--text-main)' }}>
          {t('navLosInboxTitle')}
        </h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: 1.55, maxWidth: '60ch' }}>
          {t('navLosInboxLead')}
        </p>
      </header>

      <div
        className="card"
        style={{
          padding: 'var(--space-4)',
          marginBottom: 'var(--space-6)',
          background: 'rgba(45, 212, 191, 0.08)',
          borderColor: 'rgba(45, 212, 191, 0.25)',
        }}
      >
        <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.55, color: 'var(--text-body)' }}>
          {t('navLosInboxFlowHint')}
        </p>
      </div>

      {loading ? (
        <PageSkeleton minHeight={200} />
      ) : rows.length === 0 ? (
        <div
          className="card"
          style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}
        >
          {t('navLosInboxEmpty')}
        </div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'var(--space-4)' }}>
          {rows.map((row) => {
            const statusKey = STATUS_LABEL[row.status] ?? 'navLosInboxStatusNew'
            const isMine = row.assigned_profile_id === userId
            return (
              <li key={row.id} className="card" style={{ padding: 'var(--space-5)' }}>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 'var(--space-2)',
                    alignItems: 'center',
                    marginBottom: 'var(--space-3)',
                  }}
                >
                  {row.case_reference ? (
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        padding: '4px 10px',
                        borderRadius: 999,
                        background: 'var(--color-accent)',
                        color: '#fff',
                      }}
                    >
                      {row.case_reference}
                    </span>
                  ) : null}
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {formatDateTimeNo(row.created_at)}
                  </span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-body)' }}>
                    {t(statusKey as import('@/lib/translations').TranslationKey)}
                  </span>
                  {kommuneName(row) ? (
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      · {kommuneName(row)}
                    </span>
                  ) : null}
                </div>

                {row.contact_name ? (
                  <p style={{ margin: '0 0 8px', fontSize: '0.9rem' }}>
                    <strong>{row.contact_name}</strong>
                    {row.contact_phone ? (
                      <span style={{ opacity: 0.8 }}> · {row.contact_phone}</span>
                    ) : null}
                  </p>
                ) : null}

                <pre
                  style={{
                    margin: '0 0 var(--space-4)',
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'inherit',
                    fontSize: '0.9rem',
                    lineHeight: 1.55,
                    color: 'var(--text-body)',
                    maxHeight: 200,
                    overflow: 'auto',
                  }}
                >
                  {row.summary_text}
                </pre>

                {row.status !== 'closed' ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                    {!row.assigned_profile_id ? (
                      <Button type="button" variant="accent" onClick={() => void assignToMe(row.id)}>
                        <UserCheck size={18} aria-hidden /> {t('navLosInboxAssign')}
                      </Button>
                    ) : isMine && row.status !== 'in_progress' ? (
                      <Button
                        type="button"
                        variant="primary"
                        onClick={() => void startMediation(row.id)}
                      >
                        <Database size={18} aria-hidden /> {t('navLosInboxStartMediation')}
                      </Button>
                    ) : null}
                    {(isMine || row.status === 'in_progress') && (
                      <Link
                        href="/nav/database"
                        className="button button-secondary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                      >
                        {t('navLosInboxOpenBoligbank')} <ArrowRight size={16} aria-hidden />
                      </Link>
                    )}
                    <Button type="button" variant="secondary" onClick={() => void closeHandoff(row.id)}>
                      {t('navLosInboxClose')}
                    </Button>
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
