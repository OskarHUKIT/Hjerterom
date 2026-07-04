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
import { UserCheck, ArrowRight, CheckCircle } from 'lucide-react'

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
  assigned_profile_id: string | null
  central_events: { name: string; slug: string } | { name: string; slug: string }[] | null
}

const STATUS_KEYS: Record<string, string> = {
  new: 'navEventInquiriesStatusNew',
  assigned: 'navEventInquiriesStatusAssigned',
  mediated: 'navEventInquiriesStatusMediated',
  closed: 'navEventInquiriesStatusClosed',
}

export default function NavEventInquiriesPage() {
  const { t } = useLanguage()
  const pathname = usePathname()
  const [rows, setRows] = useState<InquiryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  const load = async () => {
    const { data: auth } = await supabase.auth.getUser()
    setUserId(auth.user?.id ?? null)
    const { data, error } = await supabase
      .from('event_inquiries')
      .select(
        'id, created_at, contact_name, contact_email, contact_phone, message, date_from, date_to, status, assigned_profile_id, central_events(name, slug)'
      )
      .order('created_at', { ascending: false })
      .limit(50)
    if (!error) setRows((data ?? []) as unknown as InquiryRow[])
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  const overviewBack = getOverviewBackLink(pathname, 'kommune_ansatt', t)

  const updateStatus = async (id: string, status: string, assignToSelf = false) => {
    await supabase.rpc('kommune_update_event_inquiry', {
      p_inquiry_id: id,
      p_status: status,
      p_assign_to_self: assignToSelf,
    })
    void load()
  }

  const eventName = (row: InquiryRow) => {
    const ev = row.central_events
    if (!ev) return ''
    return Array.isArray(ev) ? ev[0]?.name ?? '' : ev.name ?? ''
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
          {t('navEventInquiriesTitle')}
        </h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: 1.55, maxWidth: '60ch' }}>
          {t('navEventInquiriesLead')}
        </p>
      </header>

      {loading ? (
        <PageSkeleton minHeight={200} />
      ) : rows.length === 0 ? (
        <div
          className="card"
          style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}
        >
          {t('navEventInquiriesEmpty')}
        </div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'var(--space-4)' }}>
          {rows.map((row) => {
            const statusKey = STATUS_KEYS[row.status] ?? 'navEventInquiriesStatusNew'
            const isMine = row.assigned_profile_id === userId
            return (
              <li key={row.id} className="card" style={{ padding: 'var(--space-5)' }}>
                <p style={{ margin: '0 0 4px', fontWeight: 700, color: 'var(--text-main)' }}>
                  {row.contact_name} · {row.contact_email}
                  {row.contact_phone ? ` · ${row.contact_phone}` : ''}
                </p>
                <p style={{ margin: '0 0 8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {formatDateTimeNo(row.created_at)}
                  {eventName(row) ? ` · ${eventName(row)}` : ''}
                  {' · '}
                  {t(statusKey as import('@/lib/translations').TranslationKey)}
                </p>
                {row.date_from && row.date_to ? (
                  <p style={{ margin: '0 0 8px', fontSize: '0.9rem', color: 'var(--text-body)' }}>
                    {row.date_from} – {row.date_to}
                  </p>
                ) : null}
                {row.message ? (
                  <p style={{ margin: '0 0 var(--space-4)', lineHeight: 1.55, color: 'var(--text-body)' }}>
                    {row.message}
                  </p>
                ) : null}

                {row.status !== 'closed' ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                    {row.status === 'new' ? (
                      <Button
                        type="button"
                        variant="accent"
                        onClick={() => void updateStatus(row.id, 'assigned', true)}
                      >
                        <UserCheck size={18} aria-hidden /> {t('navEventInquiriesAssign')}
                      </Button>
                    ) : null}
                    {(isMine || row.status === 'assigned') && row.status !== 'mediated' ? (
                      <>
                        <Link
                          href="/nav/database?filter=arrangement"
                          className="button button-primary"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                        >
                          {t('navEventInquiriesToMediation')}{' '}
                          <ArrowRight size={16} aria-hidden />
                        </Link>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => void updateStatus(row.id, 'mediated', false)}
                        >
                          <CheckCircle size={18} aria-hidden /> {t('navEventInquiriesMarkMediated')}
                        </Button>
                      </>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => void updateStatus(row.id, 'closed', false)}
                    >
                      {t('navEventInquiriesClose')}
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
