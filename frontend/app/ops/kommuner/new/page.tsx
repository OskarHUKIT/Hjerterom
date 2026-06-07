'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '../../../../context/LanguageContext'
import OpsGdprBanner from '../../components/OpsGdprBanner'
import { Button } from '../../../components/ui/Button'
import {
  opsUpsertKommune,
  opsBulkWhitelist,
  opsUpsertDpo,
  opsSetKommuneStatus,
} from '../../../lib/opsApi'

type Step = 1 | 2 | 3 | 4 | 5

export default function OpsKommuneNewPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [kommuneId, setKommuneId] = useState<string | null>(null)
  const [slug, setSlug] = useState('')

  const [displayName, setDisplayName] = useState('')
  const [orgNr, setOrgNr] = useState('')
  const [regionKeysRaw, setRegionKeysRaw] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [notes, setNotes] = useState('')

  const [whitelistRaw, setWhitelistRaw] = useState('')
  const [dpoEmail, setDpoEmail] = useState('')
  const [dpoName, setDpoName] = useState('')
  const [dpoPhone, setDpoPhone] = useState('')

  const parseEmails = (raw: string) =>
    raw
      .split(/[\n,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes('@'))

  const parseRegionKeys = (raw: string) =>
    raw
      .split(/[\n,;]+/)
      .map((r) => r.trim())
      .filter(Boolean)

  const slugFromName = (name: string) =>
    name
      .trim()
      .toLowerCase()
      .replace(/æ/g, 'ae')
      .replace(/ø/g, 'o')
      .replace(/å/g, 'a')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

  const createKommune = async () => {
    setBusy(true)
    setError(null)
    try {
      const s = slug || slugFromName(displayName)
      const keys = parseRegionKeys(regionKeysRaw)
      const result = await opsUpsertKommune({
        slug: s,
        displayName: displayName.trim(),
        orgNr: orgNr.trim() || null,
        status: 'draft',
        regionKeys: keys.length > 0 ? keys : [displayName.trim()],
        primaryContactEmail: contactEmail.trim() || null,
        notes: notes.trim() || null,
      })
      setKommuneId(result.id)
      setSlug(result.slug)
      setStep(2)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'error')
    } finally {
      setBusy(false)
    }
  }

  const saveWhitelist = async () => {
    if (!kommuneId) return
    setBusy(true)
    setError(null)
    try {
      const emails = parseEmails(whitelistRaw)
      if (emails.length > 0) {
        await opsBulkWhitelist(kommuneId, emails, 'Onboarding wizard')
      }
      setStep(3)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'error')
    } finally {
      setBusy(false)
    }
  }

  const saveDpo = async () => {
    if (!kommuneId) return
    setBusy(true)
    setError(null)
    try {
      if (dpoEmail.trim()) {
        await opsUpsertDpo(kommuneId, dpoEmail.trim(), dpoName.trim() || null, dpoPhone.trim() || null)
      }
      setStep(4)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'error')
    } finally {
      setBusy(false)
    }
  }

  const launch = async (status: 'pilot' | 'active') => {
    if (!slug) return
    setBusy(true)
    setError(null)
    try {
      await opsSetKommuneStatus(slug, status)
      router.push(`/ops/kommuner/${slug}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'error')
      setBusy(false)
    }
  }

  return (
    <div>
      <p className="ops-meta" style={{ marginBottom: 'var(--space-2)' }}>
        <Link href="/ops/kommuner" className="ops-link">{t('opsNavKommuner')}</Link>
      </p>
      <h1 className="ops-page-title">{t('opsKommuneNew')}</h1>
      <p className="ops-page-lead">{t('opsKommuneNewLead')}</p>
      <OpsGdprBanner />

      <div className="ops-wizard-steps">
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={`ops-wizard-step${step === n ? ' ops-wizard-step--active' : step > n ? ' ops-wizard-step--done' : ''}`}>
            {n}
          </span>
        ))}
      </div>

      {error ? <p style={{ color: '#ef4444', marginBottom: 'var(--space-4)' }}>{error}</p> : null}

      {step === 1 ? (
        <section className="card" style={{ padding: 'var(--space-5)' }}>
          <h2 style={{ marginTop: 0, fontSize: '1rem' }}>{t('opsWizardStep1')}</h2>
          <div className="ops-form-stack">
            <label>
              {t('opsKommuneName')}
              <input className="ops-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </label>
            <label>
              {t('opsKommuneSlug')}
              <input className="ops-input" value={slug} placeholder={slugFromName(displayName) || 'narvik'} onChange={(e) => setSlug(e.target.value)} />
            </label>
            <label>
              {t('opsKommuneOrgNr')}
              <input className="ops-input" value={orgNr} onChange={(e) => setOrgNr(e.target.value)} />
            </label>
            <label>
              {t('opsKommuneRegionKeys')}
              <textarea className="ops-input" rows={3} value={regionKeysRaw} onChange={(e) => setRegionKeysRaw(e.target.value)} placeholder="narvik, gratan" />
            </label>
            <label>
              {t('opsKommuneContactEmail')}
              <input className="ops-input" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
            </label>
            <label>
              {t('opsKommuneNotes')}
              <textarea className="ops-input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
          </div>
          <div style={{ marginTop: 'var(--space-4)' }}>
            <Button variant="primary" disabled={busy || !displayName.trim()} onClick={() => void createKommune()}>
              {t('opsWizardNext')}
            </Button>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="card" style={{ padding: 'var(--space-5)' }}>
          <h2 style={{ marginTop: 0, fontSize: '1rem' }}>{t('opsWizardStep2')}</h2>
          <p className="ops-meta">{t('opsWizardWhitelistHint')}</p>
          <textarea className="ops-input" rows={5} value={whitelistRaw} onChange={(e) => setWhitelistRaw(e.target.value)} placeholder="ansatt@kommune.no" />
          <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)' }}>
            <Button variant="secondary" onClick={() => setStep(3)}>{t('opsWizardSkip')}</Button>
            <Button variant="primary" disabled={busy} onClick={() => void saveWhitelist()}>{t('opsWizardNext')}</Button>
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="card" style={{ padding: 'var(--space-5)' }}>
          <h2 style={{ marginTop: 0, fontSize: '1rem' }}>{t('opsWizardStep3')}</h2>
          <div className="ops-form-stack">
            <label>
              {t('opsDpoEmail')}
              <input className="ops-input" type="email" value={dpoEmail} onChange={(e) => setDpoEmail(e.target.value)} />
            </label>
            <label>
              {t('opsDpoName')}
              <input className="ops-input" value={dpoName} onChange={(e) => setDpoName(e.target.value)} />
            </label>
            <label>
              {t('opsDpoPhone')}
              <input className="ops-input" value={dpoPhone} onChange={(e) => setDpoPhone(e.target.value)} />
            </label>
          </div>
          <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)' }}>
            <Button variant="secondary" onClick={() => setStep(4)}>{t('opsWizardSkip')}</Button>
            <Button variant="primary" disabled={busy} onClick={() => void saveDpo()}>{t('opsWizardNext')}</Button>
          </div>
        </section>
      ) : null}

      {step === 4 ? (
        <section className="card" style={{ padding: 'var(--space-5)' }}>
          <h2 style={{ marginTop: 0, fontSize: '1rem' }}>{t('opsWizardStep4')}</h2>
          <p className="ops-meta">{t('opsWizardTermsHint')}</p>
          <Link href="/ops/terms" className="ops-link">{t('opsGoTermsQueue')}</Link>
          <div style={{ marginTop: 'var(--space-4)' }}>
            <Button variant="primary" onClick={() => setStep(5)}>{t('opsWizardNext')}</Button>
          </div>
        </section>
      ) : null}

      {step === 5 ? (
        <section className="card" style={{ padding: 'var(--space-5)' }}>
          <h2 style={{ marginTop: 0, fontSize: '1rem' }}>{t('opsWizardStep5')}</h2>
          <p className="ops-meta">{t('opsWizardLaunchHint')}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
            <Button variant="secondary" disabled={busy} onClick={() => void launch('pilot')}>{t('opsKommuneMarkPilot')}</Button>
            <Button variant="primary" disabled={busy} onClick={() => void launch('active')}>{t('opsKommuneMarkActive')}</Button>
          </div>
        </section>
      ) : null}
    </div>
  )
}
