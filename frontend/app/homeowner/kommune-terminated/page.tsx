'use client'

import { useToast } from '@/app/components/design-system'
import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ShieldAlert, MessageSquare, Loader2, Send } from 'lucide-react'
import { supabase, getAuthUserDeduped } from '../../lib/supabase'
import { useLanguage } from '../../../context/LanguageContext'
import { isKommuneStaffRole } from '../../lib/kommuneRoles'
import type { TranslationKey } from '../../../lib/translations'

type ResignRow = {
  id: string
  status: string
  created_at: string
  reviewed_at: string | null
}

function rpcResignMessage(t: (k: TranslationKey) => string, code?: string): string {
  if (!code) return t('landlordResignRpcGeneric')
  const k = ('landlordResignRpc_' + code) as TranslationKey
  const out = t(k)
  return out === k ? t('landlordResignRpcGeneric') : out
}

function KommuneTerminatedContent() {
  const { t } = useLanguage()
  const toast = useToast()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [eligible, setEligible] = useState(false)
  const [requests, setRequests] = useState<ResignRow[]>([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    ;(async () => {
      const user = await getAuthUserDeduped()
      if (!user) {
        router.replace('/login')
        return
      }
      const [{ data: profile }, { data: ua }] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
        supabase
          .from('user_agreements')
          .select('is_terminated, terminated_by_kommune')
          .eq('user_id', user.id)
          .maybeSingle(),
      ])
      if (isKommuneStaffRole(profile?.role)) {
        router.replace('/nav/database')
        return
      }

      if (!ua?.is_terminated || !ua.terminated_by_kommune) {
        router.replace('/homeowner/manage')
        return
      }

      setEligible(true)

      const { data: rows } = await supabase
        .from('landlord_resign_requests')
        .select('id, status, created_at, reviewed_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      setRequests((rows as ResignRow[]) || [])
      setLoading(false)
    })()
  }, [router])

  const pending = requests.find((r) => r.status === 'pending')

  const submitRequest = async () => {
    setBusy(true)
    try {
      const { data, error } = await supabase.rpc('request_landlord_resign_after_kommune', {
        p_message: message.trim() || null,
      })
      if (error) throw error
      const r = data as { ok?: boolean; error?: string }
      if (!r?.ok) {
        toast(rpcResignMessage(t, r?.error), 'error')
        return
      }
      setMessage('')
      const user = await getAuthUserDeduped()
      if (!user) return
      const { data: rows } = await supabase
        .from('landlord_resign_requests')
        .select('id, status, created_at, reviewed_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)
      setRequests((rows as ResignRow[]) || [])
    } catch (e: unknown) {
      toast((e as Error)?.message || t('landlordResignRpcGeneric'), 'error')
    } finally {
      setBusy(false)
    }
  }

  if (loading || !eligible) {
    return (
      <main className="container" style={{ minHeight: '60vh', padding: 'var(--space-8)' }}>
        <p style={{ color: 'var(--text-muted)' }}>{t('loadingPleaseWait')}</p>
      </main>
    )
  }

  return (
    <main className="container" style={{ maxWidth: 640, padding: 'var(--space-8)' }}>
      <style jsx global>{`
        @keyframes app-spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
      <div
        className="card"
        style={{
          padding: 'var(--space-8)',
          border: '1px solid rgba(248, 113, 113, 0.35)',
          background: 'rgba(239, 68, 68, 0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'var(--space-4)' }}>
          <ShieldAlert size={32} style={{ color: '#f87171', flexShrink: 0 }} />
          <h1 style={{ margin: 0, fontSize: '1.65rem', color: 'var(--text-main)' }}>
            {t('kommuneTerminatedTitle')}
          </h1>
        </div>
        <p style={{ color: 'var(--text-body)', lineHeight: 1.65, marginBottom: 'var(--space-4)' }}>
          {t('kommuneTerminatedLead')}
        </p>
        <p style={{ color: 'var(--text-body)', lineHeight: 1.65, marginBottom: 'var(--space-4)' }}>
          {t('kommuneTerminatedExpiredHint')}
        </p>
        <p style={{ color: 'var(--text-body)', lineHeight: 1.65, marginBottom: 'var(--space-6)' }}>
          {t('kommuneTerminatedResignExplain')}
        </p>

        {pending ? (
          <div
            style={{
              padding: 'var(--space-4)',
              borderRadius: 10,
              background: 'var(--bg-app)',
              border: '1px solid var(--border-subtle)',
              marginBottom: 'var(--space-4)',
            }}
          >
            <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-main)' }}>
              {t('landlordResignPendingTitle')}
            </p>
            <p style={{ margin: '8px 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              {t('landlordResignPendingBody')}
            </p>
          </div>
        ) : (
          <>
            <label className="label" style={{ display: 'block', marginBottom: 8 }}>
              {t('landlordResignMessageOptional')}
            </label>
            <textarea
              className="input"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('landlordResignMessagePlaceholder')}
              style={{
                width: '100%',
                marginBottom: 'var(--space-4)',
                resize: 'vertical',
              }}
            />
            <button
              type="button"
              className="button"
              disabled={busy}
              onClick={() => void submitRequest()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              {busy ? (
                <Loader2 size={18} style={{ animation: 'app-spin 0.9s linear infinite' }} />
              ) : (
                <Send size={18} />
              )}
              {t('landlordResignSubmitRequest')}
            </button>
          </>
        )}

        <div style={{ marginTop: 'var(--space-8)', paddingTop: 'var(--space-6)', borderTop: '1px solid var(--border-subtle)' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
            {t('kommuneTerminatedMessageHint')}
          </p>
          <Link
            href="/nav/messages"
            className="button"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'transparent',
              border: '1px solid var(--border-medium)',
              color: 'var(--text-main)',
            }}
          >
            <MessageSquare size={18} /> {t('openChat')}
          </Link>
        </div>
      </div>
    </main>
  )
}

export default function KommuneTerminatedPage() {
  return (
    <Suspense
      fallback={
        <main className="container" style={{ padding: 'var(--space-8)' }}>
          <p>…</p>
        </main>
      }
    >
      <KommuneTerminatedContent />
    </Suspense>
  )
}
