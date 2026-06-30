'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { Button } from '@/app/components/ui/Button'
import { useToast } from '@/app/components/design-system'
import { logPlatformEvent } from '@/app/lib/platformEvents'

type ChatMessage = { role: string; content: string; at?: string }

const TOKEN_STORAGE_KEY = 'hjerterum_los_anonymous_token'

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
  const [anonymousToken, setAnonymousToken] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [consent, setConsent] = useState(false)
  const [handedOff, setHandedOff] = useState(false)
  const [caseReference, setCaseReference] = useState<string | null>(null)
  const [kommuner, setKommuner] = useState<{ slug: string; name: string }[]>([])
  const [kommuneSlug, setKommuneSlug] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.rpc('list_los_enabled_kommuner')
      if (Array.isArray(data)) setKommuner(data as { slug: string; name: string }[])
    })()
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_STORAGE_KEY) : null

      if (storedToken) {
        const { data: resumeData } = await supabase.rpc('los_resume_session', {
          p_anonymous_token: storedToken,
        })
        const resume = resumeData as {
          ok?: boolean
          session_id?: string
          messages?: ChatMessage[]
          handed_off_at?: string | null
        } | null
        if (!cancelled && resume?.ok && resume.session_id) {
          setSessionId(resume.session_id)
          setAnonymousToken(storedToken)
          setMessages((resume.messages as ChatMessage[]) ?? [])
          setHandedOff(Boolean(resume.handed_off_at))
          return
        }
        localStorage.removeItem(TOKEN_STORAGE_KEY)
      }

      const { data: startData, error } = await supabase.rpc('los_start_session')
      const start = startData as { ok?: boolean; session_id?: string; anonymous_token?: string } | null
      if (!cancelled && !error && start?.ok && start.session_id && start.anonymous_token) {
        setSessionId(start.session_id)
        setAnonymousToken(start.anonymous_token)
        localStorage.setItem(TOKEN_STORAGE_KEY, start.anonymous_token)
        const welcome: ChatMessage[] = [{ role: 'assistant', content: t('losWelcome') }]
        setMessages(welcome)
        await supabase.rpc('los_append_message', {
          p_session_id: start.session_id,
          p_role: 'assistant',
          p_content: t('losWelcome'),
          p_anonymous_token: start.anonymous_token,
        })
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
    await supabase.rpc('los_append_message', {
      p_session_id: sessionId,
      p_role: 'user',
      p_content: text,
      p_anonymous_token: anonymousToken,
    })
    const reply = await fetchLosReply(text, t)
    const botMsg: ChatMessage = { role: 'assistant', content: reply, at: new Date().toISOString() }
    setMessages([...next, botMsg])
    await supabase.rpc('los_append_message', {
      p_session_id: sessionId,
      p_role: 'assistant',
      p_content: reply,
      p_anonymous_token: anonymousToken,
    })
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
    if (kommuner.length > 0 && !kommuneSlug) {
      toast(t('losKommuneRequired'), 'error')
      return
    }
    if (!contactName.trim()) {
      toast(t('losContactNameRequired'), 'error')
      return
    }
    setBusy(true)
    const summary = messages.map((m) => `${m.role}: ${m.content}`).join('\n').slice(0, 4000)
    const { data, error } = await supabase.rpc('los_create_handoff', {
      p_session_id: sessionId,
      p_summary: summary,
      p_kommune_slug: kommuneSlug || null,
      p_contact_name: contactName.trim(),
      p_contact_phone: contactPhone.trim() || null,
      p_contact_email: contactEmail.trim() || null,
      p_anonymous_token: anonymousToken,
    })
    setBusy(false)
    if (error) {
      toast(error.message, 'error')
      return
    }
    const handoff = data as { ok?: boolean; case_reference?: string } | null
    if (handoff?.case_reference) {
      setCaseReference(handoff.case_reference)
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
          {caseReference ? (
            <p style={{ margin: '0 0 8px', fontWeight: 700 }}>
              {t('losCaseReference')}: {caseReference}
            </p>
          ) : null}
          {t('losHandoffBanner')}
        </div>
      ) : (
        <div className="los-consent">
          {kommuner.length > 0 ? (
            <label style={{ display: 'block', marginBottom: 'var(--space-3)' }}>
              <span style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: '0.85rem' }}>
                {t('losKommuneLabel')}
              </span>
              <select
                value={kommuneSlug}
                onChange={(e) => setKommuneSlug(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: 'var(--touch-target, 44px)',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid rgba(148, 163, 184, 0.35)',
                  background: 'var(--los-bg-panel, #fff)',
                  color: 'var(--los-text, inherit)',
                  font: 'inherit',
                }}
              >
                <option value="">{t('losKommunePlaceholder')}</option>
                {kommuner.map((k) => (
                  <option key={k.slug} value={k.slug}>
                    {k.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label>
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>{t('losConsentLabel')}</span>
          </label>
          {messages.length > 2 ? (
            <div style={{ marginTop: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ display: 'block' }}>
                <span style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: '0.85rem' }}>
                  {t('losContactNameLabel')} *
                </span>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  autoComplete="name"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1px solid rgba(148, 163, 184, 0.35)',
                  }}
                />
              </label>
              <label style={{ display: 'block' }}>
                <span style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: '0.85rem' }}>
                  {t('losContactEmailLabel')}
                </span>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  autoComplete="email"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1px solid rgba(148, 163, 184, 0.35)',
                  }}
                />
              </label>
              <label style={{ display: 'block' }}>
                <span style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: '0.85rem' }}>
                  {t('losContactPhoneLabel')}
                </span>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  autoComplete="tel"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1px solid rgba(148, 163, 184, 0.35)',
                  }}
                />
              </label>
            </div>
          ) : null}
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
