'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { Button } from '@/app/components/ui/Button'
import { useToast } from '@/app/components/design-system'
import { logPlatformEvent } from '@/app/lib/platformEvents'

type ChatMessage = { role: string; content: string; at?: string }

const STORAGE_KEY = 'hjerterum_los_session_id'

function botReply(userText: string, t: (key: import('@/lib/translations').TranslationKey) => string): string {
  const lower = userText.toLowerCase()
  if (/bolig|hus|leie|sove/.test(lower)) return t('losReplyHousing')
  if (/hjelp|krise|redd/.test(lower)) return t('losReplyCrisis')
  if (/hei|hallo|hello/.test(lower)) return t('losReplyHello')
  return t('losReplyDefault')
}

async function fetchLosReply(userText: string, t: (key: import('@/lib/translations').TranslationKey) => string): Promise<string> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (url && anon) {
    try {
      const res = await fetch(`${url}/functions/v1/los-chat`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${anon}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userText }),
      })
      if (res.ok) {
        const data = (await res.json()) as { reply?: string }
        if (data.reply?.trim()) return data.reply.trim()
      }
    } catch {
      /* fallback below */
    }
  }
  return botReply(userText, t)
}

export default function LosChatPage() {
  const { t } = useLanguage()
  const toast = useToast()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [consent, setConsent] = useState(false)
  const [handedOff, setHandedOff] = useState(false)
  const [busy, setBusy] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
      if (stored) {
        const { data } = await supabase.from('los_sessions').select('id, messages, handed_off_at').eq('id', stored).maybeSingle()
        if (!cancelled && data) {
          setSessionId(data.id)
          setMessages((data.messages as ChatMessage[]) ?? [])
          setHandedOff(Boolean(data.handed_off_at))
          return
        }
      }
      const { data, error } = await supabase
        .from('los_sessions')
        .insert([{ consent_level: 'anonymous' }])
        .select('id, messages')
        .single()
      if (!cancelled && !error && data) {
        setSessionId(data.id)
        localStorage.setItem(STORAGE_KEY, data.id)
        const welcome: ChatMessage[] = [{ role: 'assistant', content: t('losWelcome') }]
        setMessages(welcome)
        await supabase.from('los_sessions').update({ messages: welcome }).eq('id', data.id)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [t])

  const send = async () => {
    const text = input.trim()
    if (!text || !sessionId || handedOff) return
    setInput('')
    setBusy(true)
    const userMsg: ChatMessage = { role: 'user', content: text, at: new Date().toISOString() }
    const next = [...messages, userMsg]
    setMessages(next)
    await supabase.rpc('los_append_message', { p_session_id: sessionId, p_role: 'user', p_content: text })
    const reply = await fetchLosReply(text, t)
    const botMsg: ChatMessage = { role: 'assistant', content: reply, at: new Date().toISOString() }
    setMessages([...next, botMsg])
    await supabase.rpc('los_append_message', { p_session_id: sessionId, p_role: 'assistant', p_content: reply })
    void logPlatformEvent({
      source: 'los',
      code: 'chat_turn',
      message: 'Los chat turn completed',
      metadata: { session_id: sessionId },
    })
    setBusy(false)
  }

  const requestHandoff = async () => {
    if (!sessionId || !consent) {
      toast(t('losConsentRequired'), 'error')
      return
    }
    setBusy(true)
    const summary = messages.map((m) => `${m.role}: ${m.content}`).join('\n').slice(0, 4000)
    const { error } = await supabase.rpc('los_create_handoff', {
      p_session_id: sessionId,
      p_summary: summary,
    })
    setBusy(false)
    if (error) {
      toast(error.message, 'error')
      return
    }
    setHandedOff(true)
    toast(t('losHandoffSent'), 'success')
    void logPlatformEvent({
      source: 'los',
      code: 'handoff_created',
      message: 'Los handoff to saksbehandler',
      metadata: { session_id: sessionId },
    })
  }

  return (
    <>
      {handedOff ? (
        <div className="los-handoff-banner" role="status">
          {t('losHandoffBanner')}
        </div>
      ) : (
        <div className="los-consent">
          <label>
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>{t('losConsentLabel')}</span>
          </label>
        </div>
      )}

      <div className="los-messages" aria-live="polite">
        {messages.map((m, i) => (
          <div
            key={`${m.at ?? i}-${m.role}`}
            className={`los-bubble los-bubble--${m.role === 'user' ? 'user' : 'assistant'}`}
          >
            {m.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {!handedOff && (
        <div className="los-input-row">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('losInputPlaceholder')}
            disabled={busy}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void send()
              }
            }}
            aria-label={t('losInputPlaceholder')}
          />
          <Button type="button" variant="accent" disabled={busy || !input.trim()} onClick={() => void send()}>
            {t('losSend')}
          </Button>
        </div>
      )}

      {!handedOff && messages.length > 2 && (
        <Button type="button" variant="secondary" disabled={busy} onClick={() => void requestHandoff()} style={{ marginTop: 8 }}>
          {t('losHandoffCta')}
        </Button>
      )}
    </>
  )
}
