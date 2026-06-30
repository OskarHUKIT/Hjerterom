'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAuthUserDeduped, supabase } from '@/app/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import OpsShell from '../../components/OpsShell'
import OpsPageHeader from '../../components/OpsPageHeader'
import OpsPanel from '../../components/OpsPanel'
import { useToast } from '@/app/components/design-system'
import { buttonClassName } from '@/app/components/ui/Button'

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export default function OpsEventNewPage() {
  const { t } = useLanguage()
  const toast = useToast()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description_public: '',
    start_date: '',
    end_date: '',
    routing_mode: 'saksbehandler' as 'saksbehandler' | 'turisme',
    arrangement_tag: '',
  })

  const submit = async (publish: boolean) => {
    if (!form.name.trim() || !form.start_date || !form.end_date) {
      toast(t('errSaveListing'), 'error')
      return
    }
    setSaving(true)
    try {
      const slug = form.slug.trim() || slugify(form.name)
      const authUser = await getAuthUserDeduped()
      const { data, error } = await supabase
        .from('central_events')
        .insert([
          {
            name: form.name.trim(),
            slug,
            description_public: form.description_public.trim() || null,
            start_date: form.start_date,
            end_date: form.end_date,
            routing_mode: form.routing_mode,
            arrangement_tag: form.arrangement_tag.trim() || null,
            status: publish ? 'published' : 'draft',
            published_at: publish ? new Date().toISOString() : null,
            created_by: authUser?.id ?? null,
          },
        ])
        .select('slug')
        .single()

      if (error) throw error
      if (publish && authUser?.id) {
        await supabase.from('audit_logs').insert([
          {
            user_id: authUser.id,
            action_type: 'OPS_EVENT_PUBLISHED',
            details: { slug, name: form.name.trim() },
          },
        ])
      }
      toast(t('opsSaved'), 'success')
      router.push(data?.slug ? `/ops/events/${data.slug}` : '/ops/events')
    } catch {
      toast(t('errSaveListing'), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <OpsShell>
      <OpsPageHeader title={t('opsEventNew')} lead={t('opsEventsDesc')} />
      <OpsPanel>
        <div className="ops-form-grid">
          <label className="ops-label">
            Navn
            <input
              className="ops-input"
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value, slug: f.slug || slugify(e.target.value) }))
              }
            />
          </label>
          <label className="ops-label">
            Slug
            <input
              className="ops-input"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
            />
          </label>
          <label className="ops-label">
            {t('fromDate')}
            <input
              type="date"
              className="ops-input"
              value={form.start_date}
              onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
            />
          </label>
          <label className="ops-label">
            {t('toDate')}
            <input
              type="date"
              className="ops-input"
              value={form.end_date}
              onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
            />
          </label>
          <label className="ops-label">
            Routing
            <select
              className="ops-input"
              value={form.routing_mode}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  routing_mode: e.target.value as 'saksbehandler' | 'turisme',
                }))
              }
            >
              <option value="saksbehandler">{t('opsEventRoutingSaksbehandler')}</option>
              <option value="turisme">{t('opsEventRoutingTourism')}</option>
            </select>
          </label>
          <label className="ops-label">
            Tag (valgfritt)
            <input
              className="ops-input"
              value={form.arrangement_tag}
              onChange={(e) => setForm((f) => ({ ...f, arrangement_tag: e.target.value }))}
              placeholder="VM Alpint"
            />
          </label>
          <label className="ops-label" style={{ gridColumn: '1 / -1' }}>
            Offentlig beskrivelse
            <textarea
              className="ops-input"
              rows={4}
              value={form.description_public}
              onChange={(e) => setForm((f) => ({ ...f, description_public: e.target.value }))}
            />
          </label>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
          <button
            type="button"
            className={buttonClassName('secondary')}
            disabled={saving}
            onClick={() => void submit(false)}
          >
            Lagre utkast
          </button>
          <button
            type="button"
            className={buttonClassName('accent')}
            disabled={saving}
            onClick={() => void submit(true)}
          >
            Publiser
          </button>
        </div>
      </OpsPanel>
    </OpsShell>
  )
}
