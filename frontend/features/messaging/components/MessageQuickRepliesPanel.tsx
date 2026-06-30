'use client'

import { useEffect, useState } from 'react'
import { Zap } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { supabase } from '@/app/lib/supabase'
import { Button } from '@/app/components/ui/Button'
import { useToast } from '@/app/components/design-system'
import type { MessageChannelType } from '@/app/lib/messageChannelLabels'

type QuickReply = {
  id: string
  label: string
  body: string
  channel_type: MessageChannelType | null
}

type Props = {
  userId: string
  channelType?: MessageChannelType | null
  onInsert: (text: string) => void
}

export default function MessageQuickRepliesPanel({ userId, channelType, onInsert }: Props) {
  const { t } = useLanguage()
  const toast = useToast()
  const [items, setItems] = useState<QuickReply[]>([])
  const [label, setLabel] = useState('')
  const [body, setBody] = useState('')
  const [open, setOpen] = useState(false)

  const load = async () => {
    let q = supabase
      .from('message_quick_replies')
      .select('id, label, body, channel_type')
      .eq('owner_id', userId)
      .order('sort_order', { ascending: true })
    if (channelType) {
      q = q.or(`channel_type.is.null,channel_type.eq.${channelType}`)
    }
    const { data } = await q
    setItems((data ?? []) as QuickReply[])
  }

  useEffect(() => {
    void load()
  }, [userId, channelType])

  const save = async () => {
    if (!label.trim() || !body.trim()) return
    const { error } = await supabase.from('message_quick_replies').insert([
      {
        owner_id: userId,
        label: label.trim(),
        body: body.trim(),
        channel_type: channelType ?? null,
      },
    ])
    if (error) {
      toast(error.message, 'error')
      return
    }
    setLabel('')
    setBody('')
    void load()
  }

  const remove = async (id: string) => {
    await supabase.from('message_quick_replies').delete().eq('id', id)
    void load()
  }

  if (items.length === 0 && !open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--color-sky-blue)',
          cursor: 'pointer',
          fontSize: '0.8rem',
          padding: '4px 0',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <Zap size={14} /> {t('quickRepliesAddFirst')}
      </button>
    )
  }

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: open ? 8 : 0 }}>
        {items.map((item) => (
          <span key={item.id} style={{ display: 'inline-flex', gap: 4 }}>
            <button
              type="button"
              className="button"
              style={{ fontSize: '0.75rem', padding: '4px 10px' }}
              onClick={() => onInsert(item.body)}
            >
              {item.label}
            </button>
            <button type="button" aria-label={t('delete')} onClick={() => void remove(item.id)} style={{ background: 'none', border: 'none', opacity: 0.5, cursor: 'pointer' }}>
              ×
            </button>
          </span>
        ))}
        <button type="button" onClick={() => setOpen((v) => !v)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}>
          {open ? t('close') : `+ ${t('quickRepliesNew')}`}
        </button>
      </div>
      {open ? (
        <div style={{ display: 'grid', gap: 6, padding: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
          <input className="input" style={{ marginBottom: 0 }} placeholder={t('quickRepliesLabel')} value={label} onChange={(e) => setLabel(e.target.value)} />
          <textarea className="input" style={{ marginBottom: 0 }} rows={2} placeholder={t('quickRepliesBody')} value={body} onChange={(e) => setBody(e.target.value)} />
          <Button type="button" variant="secondary" onClick={() => void save()}>
            {t('save')}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
