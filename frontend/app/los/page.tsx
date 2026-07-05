'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { Button } from '@/app/components/ui/Button'
import { useToast, Stepper } from '@/app/components/design-system'
import { logPlatformEvent } from '@/app/lib/platformEvents'
import { useLosChat } from '@/features/los/useLosChat'

export default function LosChatPage() {
  const { t } = useLanguage()
  const toast = useToast()
  const {
    sessionId,
    anonymousToken,
    messages,
    handedOff,
    busy,
    send,
    setHandedOff,
  } = useLosChat({ autoStart: true, t })
  const [input, setInput] = useState('')
  const [consent, setConsent] = useState(false)
  const [caseReference, setCaseReference] = useState<string | null>(null)
  const [kommuner, setKommuner] = useState<{ slug: string; name: string }[]>([])
  const [kommuneSlug, setKommuneSlug] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [handoffBusy, setHandoffBusy] = useState(false)
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

  const handleSend = async () => {
    const text = input.trim()
    if (!text || handedOff) return
    setInput('')
    await send(text)
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
    setHandoffBusy(true)
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
    setHandoffBusy(false)
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

  const losStep = handedOff ? 2 : messages.some((m) => m.role === 'user') ? 1 : 0
  const isBusy = busy || handoffBusy

  return (
    <>
      <Stepper
        currentStep={losStep}
        steps={[
          { id: 'contact', label: t('losStepContact') },
          { id: 'understand', label: t('losStepUnderstand') },
          { id: 'handoff', label: t('losStepHandoff') },
        ]}
      />
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

      <p className="los-consent" role="note" style={{ marginTop: 0 }}>
        {t('losSensitiveDataNotice')}
      </p>

      <div className="los-messages" role="log" aria-live="polite" aria-relevant="additions">
        {messages.map((m, i) => (
          <div
            key={`${m.at ?? i}-${m.role}`}
            className={`los-bubble los-bubble--${m.role === 'user' ? 'user' : 'assistant'}`}
          >
            {m.content}
          </div>
        ))}
        {busy ? (
          <div className="los-bubble los-bubble--assistant" aria-hidden>
            …
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      {!handedOff && (
        <div className="los-input-row">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('losInputPlaceholder')}
            disabled={isBusy}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void handleSend()
              }
            }}
            aria-label={t('losInputPlaceholder')}
          />
          <Button type="button" variant="accent" disabled={isBusy || !input.trim()} onClick={() => void handleSend()}>
            {t('losSend')}
          </Button>
        </div>
      )}

      {!handedOff && messages.length > 2 && (
        <Button type="button" variant="secondary" disabled={isBusy} onClick={() => void requestHandoff()} style={{ marginTop: 8 }}>
          {t('losHandoffCta')}
        </Button>
      )}
    </>
  )
}
