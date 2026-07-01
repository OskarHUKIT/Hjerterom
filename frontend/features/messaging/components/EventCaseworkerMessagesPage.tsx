'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '@/app/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { useToast } from '@/app/components/design-system'
import LoadingPlaceholder from '@/app/components/LoadingPlaceholder'
import { channelBadgeEmoji } from '@/app/lib/messageChannelLabels'
import { formatDateTimeNo } from '@/app/lib/dateFormat'
import { useEventStaffAccess } from '@/features/auth/hooks/useEventStaffAccess'
import ChatComposer from '@/features/messaging/components/ChatComposer'
import ChatMessageBubble from '@/features/messaging/components/ChatMessageBubble'
import MessageQuickRepliesPanel from '@/features/messaging/components/MessageQuickRepliesPanel'
import { sendEventCaseworkerDirect } from '@/features/messaging/lib/chatSend'
import { fetchDisplayNamesBatch } from '@/features/messaging/hooks/useDisplayNamesBatch'

type ThreadRow = {
  landlordId: string
  eventId: string
  eventName: string
  landlordName: string
  lastPreview: string
  lastAt: string
}

type Msg = {
  id: string
  sender_id: string
  content: string
  created_at: string
  image_urls?: string[]
}

export default function EventCaseworkerMessagesPage() {
  const { t } = useLanguage()
  const toast = useToast()
  const searchParams = useSearchParams()
  const { data: access, isPending: accessPending } = useEventStaffAccess({
    loginRedirect: '/nav/event/messages',
    redirectForbidden: true,
  })
  const withLandlordId = searchParams.get('landlord')
  const withEventId = searchParams.get('event')
  const [threads, setThreads] = useState<ThreadRow[]>([])
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [senderLabels, setSenderLabels] = useState<Record<string, string>>({})
  const bottomRef = useRef<HTMLDivElement>(null)
  const userId = access?.kind === 'ok' ? access.userId : null
  const ready = access?.kind === 'ok'

  const loadThreads = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_event_landlord_thread_summaries')
    if (error) {
      toast(error.message, 'error')
      return
    }
    const rows = (data ?? []) as Array<{
      landlord_id: string
      event_id: string
      event_name: string
      last_preview: string | null
      last_at: string | null
    }>
    const ids = [...new Set(rows.map((r) => r.landlord_id))]
    const names = await fetchDisplayNamesBatch(ids, t('unknownUser'))
    setThreads(
      rows.map((r) => ({
        landlordId: r.landlord_id,
        eventId: r.event_id,
        eventName: r.event_name,
        landlordName: names.get(r.landlord_id) || t('unknownUser'),
        lastPreview: (r.last_preview ?? '').trim(),
        lastAt: r.last_at ?? '',
      }))
    )
  }, [toast, t])

  const loadMessages = useCallback(async () => {
    if (!withLandlordId || !withEventId) {
      setMessages([])
      return
    }
    const { data, error } = await supabase.rpc('get_event_landlord_thread_messages', {
      p_landlord_id: withLandlordId,
      p_event_id: withEventId,
    })
    if (error) {
      toast(error.message, 'error')
      return
    }
    const msgs = (data ?? []) as Msg[]
    setMessages(msgs)
    const ids = [...new Set(msgs.map((m) => m.sender_id))]
    if (ids.length > 0) {
      const nameById = await fetchDisplayNamesBatch(ids, t('landlordLabel'))
      setSenderLabels(Object.fromEntries(nameById))
    }
  }, [withLandlordId, withEventId, toast, t])

  useEffect(() => {
    if (!ready) return
    void loadThreads()
  }, [ready, loadThreads])

  useEffect(() => {
    if (!ready) return
    void loadMessages()
  }, [ready, loadMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!withLandlordId || !withEventId) return
    const channel = supabase
      .channel(`event-chat-${withLandlordId}-${withEventId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        () => void loadMessages()
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [withLandlordId, withEventId, loadMessages])

  const send = async () => {
    const text = input.trim()
    if (!text || !userId || !withLandlordId || !withEventId) return
    setSending(true)
    try {
      await sendEventCaseworkerDirect({
        senderId: userId,
        receiverId: withLandlordId,
        eventId: withEventId,
        content: text,
        notificationTitle: `${channelBadgeEmoji('event_caseworker')} ${t('msgChannelEvent')}`,
      })
      setInput('')
      await loadMessages()
      await loadThreads()
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : String(err), 'error')
    } finally {
      setSending(false)
    }
  }

  if (accessPending || !ready) {
    return (
      <div style={{ padding: 'var(--space-6)' }}>
        <LoadingPlaceholder />
      </div>
    )
  }

  const activeThread = threads.find(
    (th) => th.landlordId === withLandlordId && th.eventId === withEventId
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 320px) 1fr', gap: 16, minHeight: 480 }}>
      <aside className="card" style={{ padding: 'var(--space-3)', overflow: 'auto' }}>
        <h2 style={{ margin: '0 0 12px', fontSize: '1rem' }}>{t('eventNavMessages')}</h2>
        {threads.length === 0 ? (
          <p style={{ opacity: 0.65, fontSize: '0.88rem' }}>{t('noMessagesYet')}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {threads.map((th) => {
              const active = th.landlordId === withLandlordId && th.eventId === withEventId
              return (
                <Link
                  key={`${th.landlordId}-${th.eventId}`}
                  href={`/nav/event/messages?landlord=${th.landlordId}&event=${th.eventId}`}
                  style={{
                    display: 'block',
                    padding: '10px 12px',
                    borderRadius: 10,
                    textDecoration: 'none',
                    color: 'inherit',
                    background: active ? 'rgba(168, 85, 247, 0.12)' : 'rgba(0,0,0,0.03)',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    {channelBadgeEmoji('event_caseworker')} {th.landlordName}
                  </div>
                  <div style={{ fontSize: '0.78rem', opacity: 0.7 }}>{th.eventName}</div>
                  {th.lastPreview ? (
                    <div style={{ fontSize: '0.78rem', opacity: 0.6, marginTop: 4 }}>{th.lastPreview}</div>
                  ) : null}
                </Link>
              )
            })}
          </div>
        )}
      </aside>

      <section className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0, minHeight: 400 }}>
        {!withLandlordId || !withEventId ? (
          <div style={{ padding: 'var(--space-6)', opacity: 0.7 }}>{t('eventMessagesPickThread')}</div>
        ) : (
          <>
            <header
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Link href="/nav/event/messages" style={{ color: 'inherit' }} aria-label={t('back')}>
                <ArrowLeft size={18} />
              </Link>
              <div>
                <div style={{ fontWeight: 700 }}>
                  {channelBadgeEmoji('event_caseworker')} {t('msgChannelEvent')} · {activeThread?.landlordName}
                </div>
                <div style={{ fontSize: '0.82rem', opacity: 0.7 }}>{activeThread?.eventName}</div>
              </div>
            </header>
            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {messages.map((m) => {
                const mine = m.sender_id === userId
                return (
                  <ChatMessageBubble
                    key={m.id}
                    message={m}
                    isMine={mine}
                    variant="event_staff"
                    formatTimestamp={formatDateTimeNo}
                    senderCaption={
                      !mine ? senderLabels[m.sender_id] || t('landlordLabel') : undefined
                    }
                  />
                )
              })}
              <div ref={bottomRef} />
            </div>
            <ChatComposer
              variant="inline"
              value={input}
              onChange={setInput}
              onSend={() => void send()}
              sending={sending}
              showSendIcon
              quickRepliesSlot={
                userId ? (
                  <MessageQuickRepliesPanel
                    userId={userId}
                    channelType="event_caseworker"
                    onInsert={(text) => setInput((prev) => (prev.trim() ? `${prev}\n${text}` : text))}
                  />
                ) : null
              }
            />
          </>
        )}
      </section>
    </div>
  )
}
