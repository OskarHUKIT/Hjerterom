'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ShieldCheck, Plus, Trash2, Mail, MapPin } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useLanguage } from '../../../context/LanguageContext'

export default function KommuneAccessPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [entries, setEntries] = useState<{ id: string; email: string; region: string; is_active: boolean }[]>([])
  const [loading, setLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
  const [kommuneCanEdit, setKommuneCanEdit] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newRegion, setNewRegion] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function checkAccess() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      const { data: profile } = await supabase.from('profiles').select('role, kommune_can_edit').eq('id', user.id).maybeSingle()
      const role = user.user_metadata?.role || profile?.role
      if (role !== 'kommune_ansatt') {
        setIsAuthorized(false)
        setLoading(false)
        return
      }
      setIsAuthorized(true)
      setKommuneCanEdit(profile?.kommune_can_edit !== false)
    }
    checkAccess()
  }, [router])

  const fetchEntries = async () => {
    const { data, error: err } = await supabase
      .from('kommune_access_list')
      .select('id, email, region, is_active')
      .order('email')
    if (err) {
      setError(err.message)
      return
    }
    setEntries(data || [])
  }

  useEffect(() => {
    if (isAuthorized && kommuneCanEdit) {
      fetchEntries()
    }
    setLoading(false)
  }, [isAuthorized, kommuneCanEdit])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmail.trim() || !newRegion.trim()) return
    setSaving(true)
    setError(null)
    const { error: err } = await supabase.from('kommune_access_list').insert({
      email: newEmail.trim().toLowerCase(),
      region: newRegion.trim(),
      is_active: true,
    })
    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }
    setNewEmail('')
    setNewRegion('')
    fetchEntries()
    setSaving(false)
  }

  const handleToggle = async (id: string, is_active: boolean) => {
    const { error: err } = await supabase.from('kommune_access_list').update({ is_active, updated_at: new Date().toISOString() }).eq('id', id)
    if (err) {
      setError(err.message)
      return
    }
    fetchEntries()
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('kommuneAccessRemoveConfirm'))) return
    const { error: err } = await supabase.from('kommune_access_list').delete().eq('id', id)
    if (err) {
      setError(err.message)
      return
    }
    fetchEntries()
  }

  if (loading || isAuthorized === null) {
    return <div className="container" style={{ minHeight: '80vh' }} />
  }

  if (!isAuthorized || !kommuneCanEdit) {
    return (
      <main className="container" style={{ textAlign: 'center', padding: '100px 20px' }}>
        <div className="card" style={{ maxWidth: '500px', margin: '0 auto', padding: 'var(--space-10)' }}>
          <ShieldCheck size={64} style={{ color: '#ef4444', margin: '0 auto var(--space-6)' }} />
          <h1 style={{ fontSize: '2rem', marginBottom: 'var(--space-4)' }}>{t('noAccess')}</h1>
          <p style={{ marginBottom: 'var(--space-8)', opacity: 0.8 }}>{t('noAccessDesc')}</p>
          <Link href="/" className="button">{t('goHome')}</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="container">
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <Link href="/" className="nav-link" style={{ marginLeft: '-1rem', marginBottom: 'var(--space-2)', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          ← {t('overview')}
        </Link>
        <h1 style={{ fontSize: '2rem' }}>{t('kommuneAccess')}</h1>
        <p style={{ fontSize: '1rem', opacity: 0.8 }}>{t('kommuneAccessDesc')}</p>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)', background: 'rgba(239, 68, 68, 0.1)', borderColor: '#ef4444' }}>
          {error}
        </div>
      )}

      <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-6)' }}>
        <h3 style={{ marginBottom: 'var(--space-4)' }}>{t('addEmail')}</h3>
        <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 'var(--space-4)', alignItems: 'end' }} className="kommune-access-form">
          <div>
            <label className="label">{t('email')}</label>
            <input
              type="email"
              className="input"
              placeholder={t('emailPlaceholder')}
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              required
              style={{ marginBottom: 0 }}
            />
          </div>
          <div>
            <label className="label">Region</label>
            <input
              type="text"
              className="input"
              placeholder={t('regionPlaceholder')}
              value={newRegion}
              onChange={e => setNewRegion(e.target.value)}
              required
              style={{ marginBottom: 0 }}
            />
          </div>
          <button type="submit" className="button" disabled={saving}>
            <Plus size={18} /> {t('add')}
          </button>
        </form>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(59, 130, 246, 0.1)', textAlign: 'left' }}>
                <th style={{ padding: 'var(--space-4)' }}><Mail size={16} style={{ display: 'inline', marginRight: '6px' }} /> E-post</th>
                <th style={{ padding: 'var(--space-4)' }}><MapPin size={16} style={{ display: 'inline', marginRight: '6px' }} /> Region</th>
                <th style={{ padding: 'var(--space-4)' }}>Status</th>
                <th style={{ padding: 'var(--space-4)' }}></th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Ingen adresser i listen. Legg til e-poster som automatisk får kommune-tilgang.
                  </td>
                </tr>
              ) : (
                entries.map(row => (
                  <tr key={row.id} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: 'var(--space-4)' }}>{row.email}</td>
                    <td style={{ padding: 'var(--space-4)' }}>{row.region}</td>
                    <td style={{ padding: 'var(--space-4)' }}>
                      <button
                        onClick={() => handleToggle(row.id, !row.is_active)}
                        style={{
                          padding: '4px 12px',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          background: row.is_active ? 'rgba(45, 212, 191, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: row.is_active ? 'var(--color-teal)' : '#ef4444',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        {row.is_active ? 'Aktiv' : 'Inaktiv'}
                      </button>
                    </td>
                    <td style={{ padding: 'var(--space-4)' }}>
                      <button
                        onClick={() => handleDelete(row.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
                        title={t('deleteShort')}
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          .kommune-access-form {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  )
}
