'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { supabase, getAuthUserDeduped } from '@/app/lib/supabase'
import { mergeUniqueById } from '@/app/lib/mergeUniqueById'
import { useLanguage } from '@/context/LanguageContext'
import { EmptyState, PageSkeleton } from '@/app/components/design-system'
import { buttonClassName } from '@/app/components/ui/Button'
import GuestBookingChatPanel from '@/features/messaging/components/GuestBookingChatPanel'
import FinnSheet from '../components/FinnSheet'

type ThreadRow = {
  bookingId: string
  title: string
  preview: string
  when: string
  unread: boolean
}

const FINN_INBOX_ACTIVE_STATUSES = ['pending', 'accepted', 'paid', 'completed']
const FINN_INBOX_SELECT = 'id, check_in, updated_at, listings(address, city)'
const FINN_INBOX_LIMIT = 20

// Two `.eq()` queries run in parallel instead of a single `.or()` with an interpolated
// email — see app/lib/mergeUniqueById.ts for why the merge below reproduces the exact
// same top-20 a single OR query would have returned.
async function fetchInboxThreads(userId: string, email: string): Promise<ThreadRow[]> {
  const base = () =>
    supabase
      .from('bookings')
      .select(FINN_INBOX_SELECT)
      .in('status', FINN_INBOX_ACTIVE_STATUSES)
      .order('updated_at', { ascending: false })
      .limit(FINN_INBOX_LIMIT)

  const [{ data: byUser }, { data: byEmail }] = await Promise.all([
    base().eq('guest_user_id', userId),
    base().eq('guest_email', email),
  ])

  const bookings = mergeUniqueById(
    byUser ?? [],
    byEmail ?? [],
    (x, y) => new Date(y.updated_at).getTime() - new Date(x.updated_at).getTime(),
    FINN_INBOX_LIMIT
  )

  const rows: ThreadRow[] = []
  for (const b of bookings ?? []) {
    const listing = Array.isArray(b.listings) ? b.listings[0] : b.listings
    const title = listing?.address ?? '—'
    const { data: msgs } = await supabase.rpc('get_booking_messages', { p_booking_id: b.id })
    const messages = (msgs ?? []) as { content: string; created_at: string; sender_id: string }[]
    const last = messages[messages.length - 1]
    rows.push({
      bookingId: b.id,
      title,
      preview: last?.content ?? '',
      when: last?.created_at ?? b.check_in,
      unread: Boolean(last && last.sender_id !== userId),
    })
  }
  return rows
}

export default function FinnInboxClient() {
  const { t } = useLanguage()
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null)
  const [activeTitle, setActiveTitle] = useState('')

  useEffect(() => {
    void (async () => {
      const user = await getAuthUserDeduped()
      if (user?.id && user.email) {
        setUserId(user.id)
        setUserEmail(user.email)
      }
      setAuthLoading(false)
    })()
  }, [])

  const { data: threads = [], isPending } = useQuery({
    queryKey: ['finn', 'inbox', userId, userEmail],
    queryFn: () => fetchInboxThreads(userId!, userEmail!),
    enabled: Boolean(userId && userEmail),
    staleTime: 20_000,
  })

  if (authLoading || (userId && isPending)) {
    return <PageSkeleton minHeight={240} />
  }

  if (!userEmail) {
    return (
      <div style={{ paddingTop: 16 }}>
        <h2 className="finn-page-title">{t('finnInboxTitle')}</h2>
        <p className="finn-page-lead">{t('finnInboxLead')}</p>
        <EmptyState
          title={t('finnGuestAccountRequired')}
          description={t('finnInboxLoginDesc')}
          action={
            <Link href="/finn/login?redirect=/finn/inbox" className={buttonClassName('accent')}>
              {t('finnMineLoginCta')}
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div style={{ paddingTop: 16 }}>
      <h2 className="finn-page-title">{t('finnInboxTitle')}</h2>
      <p className="finn-page-lead">{t('finnInboxLead')}</p>

      {threads.length === 0 ? (
        <EmptyState title={t('finnInboxEmptyTitle')} description={t('finnInboxEmptyDesc')} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {threads.map((thread, i) => (
            <button
              key={thread.bookingId}
              type="button"
              className={`finn-inbox-row finn-anim-fade-up finn-stagger-${Math.min(i + 1, 3)}`}
              onClick={() => {
                setActiveBookingId(thread.bookingId)
                setActiveTitle(thread.title)
              }}
            >
              <span className="finn-avatar" aria-hidden>
                {thread.title.charAt(0).toUpperCase()}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <strong style={{ fontSize: '0.875rem' }}>{thread.title}</strong>
                  <span style={{ fontSize: '0.625rem', color: 'var(--finn-text-muted)', flexShrink: 0 }}>
                    {new Date(thread.when).toLocaleDateString()}
                  </span>
                </span>
                <p
                  style={{
                    margin: '2px 0 0',
                    fontSize: '0.75rem',
                    color: 'var(--finn-text-secondary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {thread.preview || t('bookingChatEmpty')}
                </p>
              </span>
              {thread.unread ? (
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 999,
                    background: 'var(--finn-lane)',
                    color: 'var(--color-dark-navy)',
                    fontSize: '0.625rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  1
                </span>
              ) : null}
            </button>
          ))}
        </div>
      )}

      <FinnSheet
        open={Boolean(activeBookingId)}
        onClose={() => setActiveBookingId(null)}
        tall
      >
        <h3 className="finn-sheet__title">{activeTitle}</h3>
        <p style={{ margin: '0 0 12px', fontSize: '0.6875rem', color: 'var(--finn-text-muted)' }}>
          {t('finnInboxResponseHint')}
        </p>
        {activeBookingId ? <GuestBookingChatPanel bookingId={activeBookingId} compact /> : null}
      </FinnSheet>
    </div>
  )
}
