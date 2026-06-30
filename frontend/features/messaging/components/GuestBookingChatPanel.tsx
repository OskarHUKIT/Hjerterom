'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { useToast } from '@/app/components/design-system'
import { Button } from '@/app/components/ui/Button'
import { channelBadgeEmoji } from '@/app/lib/messageChannelLabels'
import { formatDateTimeNo } from '@/app/lib/dateFormat'

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
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text) return
    setBusy(true)
    const { data, error } = await supabase.rpc('send_booking_message', {
      p_booking_id: bookingId,
      p_content: text,
    })
    setBusy(false)
    if (error || data?.ok === false) {
      toast(error?.message ?? t('errSaveListing'), 'error')
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
            messages.map((m) => {
              const mine = m.sender_id === userId
              return (
                <div
                  key={m.id}
                  style={{
                    alignSelf: mine ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    padding: '8px 12px',
                    borderRadius: 12,
                    background: mine ? 'rgba(59, 130, 246, 0.15)' : 'rgba(0,0,0,0.05)',
                    fontSize: '0.88rem',
                  }}
                >
                  <div>{m.content}</div>
                  <div style={{ fontSize: '0.72rem', opacity: 0.55, marginTop: 4 }}>
                    {formatDateTimeNo(m.created_at)}
                  </div>
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('finnInquiryMessage')}
          disabled={busy}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void send()
            }
          }}
          style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)' }}
        />
        <Button type="button" variant="accent" disabled={busy || !input.trim()} onClick={() => void send()}>
          {t('losSend')}
        </Button>
      </div>
    </div>
  )
}
