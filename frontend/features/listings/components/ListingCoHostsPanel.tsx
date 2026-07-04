'use client'

import { useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { supabase } from '@/app/lib/supabase'
import { Button } from '@/app/components/ui/Button'
import { useToast } from '@/app/components/design-system'

type CoHostRow = {
  id: string
  cohost_user_id: string
  display_name: string | null
  email: string | null
}

type Props = {
  listingId: string
}

export default function ListingCoHostsPanel({ listingId }: Props) {
  const { t } = useLanguage()
  const toast = useToast()
  const [rows, setRows] = useState<CoHostRow[]>([])
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const { data } = await supabase.rpc('list_listing_cohosts', { p_listing_id: listingId })
    setRows((data ?? []) as CoHostRow[])
  }

  useEffect(() => {
    void load()
  }, [listingId])

  const addCoHost = async () => {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return
    setBusy(true)
    const { data, error } = await supabase.rpc('add_listing_cohost_by_email', {
      p_listing_id: listingId,
      p_email: trimmed,
    })
    setBusy(false)
    if (error || data?.ok === false) {
      toast(data?.error === 'user_not_found' ? t('cohostUserNotFound') : error?.message ?? t('errSaveListing'), 'error')
      return
    }
    setEmail('')
    toast(t('cohostAdded'), 'success')
    void load()
  }

  const remove = async (id: string) => {
    const { error } = await supabase.from('listing_cohosts').delete().eq('id', id)
    if (error) {
      toast(error.message, 'error')
      return
    }
    void load()
  }

  return (
    <section className="card" style={{ marginTop: 'var(--space-4)', padding: 'var(--space-4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Users size={20} aria-hidden />
        <h3 style={{ margin: 0 }}>{t('cohostTitle')}</h3>
      </div>
      <p className="text-sm" style={{ color: 'var(--text-muted)', margin: '0 0 var(--space-3)' }}>
        {t('cohostLead')}
      </p>
      {rows.length > 0 ? (
        <ul style={{ margin: '0 0 var(--space-3)', padding: 0, listStyle: 'none' }}>
          {rows.map((r) => (
            <li
              key={r.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 0',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <span>{r.display_name?.trim() || r.email || r.cohost_user_id.slice(0, 8)}</span>
              <button type="button" onClick={() => void remove(r.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                {t('delete')}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          className="input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('cohostEmailPlaceholder')}
          style={{ flex: 1, minWidth: 200, marginBottom: 0 }}
        />
        <Button type="button" variant="secondary" disabled={busy} onClick={() => void addCoHost()}>
          {t('cohostAdd')}
        </Button>
      </div>
    </section>
  )
}
