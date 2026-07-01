'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { useToast } from '@/app/components/design-system'
import { channelBadgeEmoji } from '@/app/lib/messageChannelLabels'
import { formatDateTimeNo } from '@/app/lib/dateFormat'
import ChatComposer from '@/features/messaging/components/ChatComposer'
import ChatMessageBubble from '@/features/messaging/components/ChatMessageBubble'
import MessageQuickRepliesPanel from '@/features/messaging/components/MessageQuickRepliesPanel'
import { sendGuestBookingMessage } from '@/features/messaging/lib/chatSend'

type Msg = {
  id: string
  sender_id: string
  content: string
  created_at: string
}

type Props = {
  bookingId: string
  /** Compact embed in finn-mine vs full panel */
  compact?: boolean
}

export default function GuestBookingChatPanel({ bookingId, compact }: Props) {
  const { t } = useLanguage()
  const toast = useToast()
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: auth } = await supabase.auth.getUser()
    setUserId(auth.user?.id ?? null)
    const { data, error } = await supabase.rpc('get_booking_messages', {
      p_booking_id: bookingId,
    })
    if (error) {
      toast(error.message, 'error')
      setLoading(false)
      return
    }
    setMessages((data ?? []) as Msg[])
    setLoading(false)
  }, [bookingId, toast])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const channel = supabase
      .channel(`booking-chat-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `booking_id=eq.${bookingId}`,
        },
        () => {
          void load()
        }
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [bookingId, load])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text) return
    setBusy(true)
    const result = await sendGuestBookingMessage({ bookingId, content: text })
    setBusy(false)
    if (!result.ok) {
      const code = result.error
      const msg =
        code === 'no_receiver'
          ? t('bookingChatNoReceiver')
          : code === 'forbidden'
            ? t('bookingChatForbidden')
            : code || t('errSaveListing')
      toast(msg, 'error')
      return
    }
    setInput('')
    void load()
  }

  return (
    <div
      className={compact ? undefined : 'finn-card'}
      style={{
        padding: compact ? 'var(--space-3) 0 0' : 'var(--space-4)',
        marginTop: compact ? 12 : 0,
        borderTop: compact ? '1px solid var(--finn-border, rgba(0,0,0,0.08))' : undefined,
      }}
    >
      <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: '0.9rem' }}>
        {channelBadgeEmoji('guest_booking')} {t('msgChannelGuest')}
      </p>
      {loading ? (
        <p style={{ opacity: 0.6, fontSize: '0.85rem' }}>{t('loadingPleaseWait')}</p>
      ) : (
        <div
          style={{
            maxHeight: compact ? 160 : 280,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            marginBottom: 8,
          }}
        >
          {messages.length === 0 ? (
            <p style={{ opacity: 0.6, fontSize: '0.85rem', margin: 0 }}>{t('bookingChatEmpty')}</p>
          ) : (
            messages.map((m) => (
              <ChatMessageBubble
                key={m.id}
                message={m}
                isMine={m.sender_id === userId}
                variant="guest"
                formatTimestamp={formatDateTimeNo}
              />
            ))
          )}
          <div ref={bottomRef} />
        </div>
      )}
      <ChatComposer
        variant="inline"
        value={input}
        onChange={setInput}
        onSend={() => void send()}
        disabled={busy}
        sending={busy}
        style={{ padding: 0, borderTop: 'none' }}
        quickRepliesSlot={
          userId ? (
            <MessageQuickRepliesPanel
              userId={userId}
              channelType="guest_booking"
              onInsert={(text) => setInput((prev) => (prev.trim() ? `${prev}\n${text}` : text))}
            />
          ) : null
        }
      />
    </div>
  )
}
