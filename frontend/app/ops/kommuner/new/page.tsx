'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useLanguage } from '../../../../context/LanguageContext'
import OpsGdprBanner from '../../components/OpsGdprBanner'
import OpsPageHeader from '../../components/OpsPageHeader'
import OpsPanel from '../../components/OpsPanel'
import OpsAlert from '../../components/OpsAlert'
import { OpsWizardProgress } from '../../components/OpsChecklist'
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

  const wizardLabels = [
    t('opsWizardLabel1'),
    t('opsWizardLabel2'),
    t('opsWizardLabel3'),
    t('opsWizardLabel4'),
    t('opsWizardLabel5'),
  ]

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
    <div className="ops-stack ops-stack--lg">
      <OpsPageHeader
        breadcrumb={
          <Link href="/ops/kommuner" className="ops-link ops-breadcrumb-link">
            <ArrowLeft size={14} aria-hidden className="ops-icon-inline" />
            {t('opsNavKommuner')}
          </Link>
        }
        title={t('opsKommuneNew')}
        lead={t('opsKommuneNewLead')}
      />
      <OpsGdprBanner />
      <OpsWizardProgress steps={5} current={step} labels={wizardLabels} />
      {error ? <OpsAlert tone="error">{error}</OpsAlert> : null}

      {step === 1 ? (
        <OpsPanel title={t('opsWizardStep1')}>
          <div className="ops-form-stack">
            <label className="ops-field">
              {t('opsKommuneName')}
              <input className="ops-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </label>
            <label className="ops-field">
              {t('opsKommuneSlug')}
              <input
                className="ops-input"
                value={slug}
                placeholder={slugFromName(displayName) || 'narvik'}
                onChange={(e) => setSlug(e.target.value)}
              />
            </label>
            <label className="ops-field">
              {t('opsKommuneOrgNr')}
              <input className="ops-input" value={orgNr} onChange={(e) => setOrgNr(e.target.value)} />
            </label>
            <label className="ops-field">
              {t('opsKommuneRegionKeys')}
              <textarea
                className="ops-input"
                rows={3}
                value={regionKeysRaw}
                onChange={(e) => setRegionKeysRaw(e.target.value)}
                placeholder="narvik, gratan"
              />
            </label>
            <label className="ops-field">
              {t('opsKommuneContactEmail')}
              <input className="ops-input" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
            </label>
            <label className="ops-field">
              {t('opsKommuneNotes')}
              <textarea className="ops-input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
          </div>
          <div className="ops-inline-actions ops-panel-footer">
            <Button variant="primary" disabled={busy || !displayName.trim()} onClick={() => void createKommune()}>
              {t('opsWizardNext')}
            </Button>
          </div>
        </OpsPanel>
      ) : null}

      {step === 2 ? (
        <OpsPanel title={t('opsWizardStep2')} description={t('opsWizardWhitelistHint')}>
          <textarea
            className="ops-input"
            rows={5}
            value={whitelistRaw}
            onChange={(e) => setWhitelistRaw(e.target.value)}
            placeholder="ansatt@kommune.no"
          />
          <div className="ops-inline-actions ops-panel-footer">
            <Button variant="secondary" onClick={() => setStep(3)}>
              {t('opsWizardSkip')}
            </Button>
            <Button variant="primary" disabled={busy} onClick={() => void saveWhitelist()}>
              {t('opsWizardNext')}
            </Button>
          </div>
        </OpsPanel>
      ) : null}

      {step === 3 ? (
        <OpsPanel title={t('opsWizardStep3')}>
          <div className="ops-form-stack">
            <label className="ops-field">
              {t('opsDpoEmail')}
              <input className="ops-input" type="email" value={dpoEmail} onChange={(e) => setDpoEmail(e.target.value)} />
            </label>
            <label className="ops-field">
              {t('opsDpoName')}
              <input className="ops-input" value={dpoName} onChange={(e) => setDpoName(e.target.value)} />
            </label>
            <label className="ops-field">
              {t('opsDpoPhone')}
              <input className="ops-input" value={dpoPhone} onChange={(e) => setDpoPhone(e.target.value)} />
            </label>
          </div>
          <div className="ops-inline-actions ops-panel-footer">
            <Button variant="secondary" onClick={() => setStep(4)}>
              {t('opsWizardSkip')}
            </Button>
            <Button variant="primary" disabled={busy} onClick={() => void saveDpo()}>
              {t('opsWizardNext')}
            </Button>
          </div>
        </OpsPanel>
      ) : null}

      {step === 4 ? (
        <OpsPanel title={t('opsWizardStep4')} description={t('opsWizardTermsHint')}>
          <Link href="/ops/terms" className="ops-link">
            {t('opsGoTermsQueue')}
          </Link>
          <div className="ops-inline-actions ops-panel-footer">
            <Button variant="primary" onClick={() => setStep(5)}>
              {t('opsWizardNext')}
            </Button>
          </div>
        </OpsPanel>
      ) : null}

      {step === 5 ? (
        <OpsPanel title={t('opsWizardStep5')} description={t('opsWizardLaunchHint')}>
          <div className="ops-inline-actions ops-panel-footer">
            <Button variant="secondary" disabled={busy} onClick={() => void launch('pilot')}>
              {t('opsKommuneMarkPilot')}
            </Button>
            <Button variant="primary" disabled={busy} onClick={() => void launch('active')}>
              {t('opsKommuneMarkActive')}
            </Button>
          </div>
        </OpsPanel>
      ) : null}
    </div>
  )
}
