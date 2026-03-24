'use client'

import { useState, useRef, useEffect, type CSSProperties } from 'react'
import { Send, ImagePlus, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { DateInput } from './DateInput'
import { formatDateNo } from '../lib/dateFormat'

interface HandoverReportProps {
  listingId?: string
  listingAddress?: string
  ownerName?: string
  reporterType: 'homeowner' | 'tenant'
  tenantToken?: string
  onSaved?: () => void
}

const LABEL_BG = '#e0f2f7'
const SECTION_STYLE: CSSProperties = {
  border: '1px solid #b8d4e0',
  borderRadius: 10,
  overflow: 'hidden',
  marginBottom: 'var(--space-4)'
}
const sectionHeader = (num: string, title: string) => (
  <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, background: LABEL_BG, borderBottom: '1px solid #b8d4e0' }}>
    <span style={{ padding: '10px 14px', fontWeight: 700, background: LABEL_BG, color: '#0f172a', minWidth: 40, textAlign: 'center' }}>{num}</span>
    <h2 style={{ margin: 0, padding: '10px 14px', fontSize: '0.95rem', fontWeight: 600, color: '#0f172a', flex: 1 }}>{title}</h2>
  </div>
)

export default function HandoverReport({ listingId, listingAddress, ownerName, reporterType, tenantToken, onSaved }: HandoverReportProps) {
  const [loading, setLoading] = useState(false)
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submissionConfirmed, setSubmissionConfirmed] = useState(false)
  const [reporterName, setReporterName] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({
    address: listingAddress || '',
    landlord: ownerName || '',
    agreement_period: '',
    inventory: '',
    keys: '',
    condition_description: '',
    photos_confirmed: false,
    photos_date: new Date().toISOString().split('T')[0]
  })

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    setUploadingPhotos(true)
    try {
      const prefix = `photos/${listingId || tenantToken || 'anon'}_${Date.now()}`
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (!file.type.startsWith('image/')) continue
        const ext = file.name.split('.').pop() || 'jpg'
        const filePath = `${prefix}/${Date.now()}_${i}.${ext}`
        const { error } = await supabase.storage.from('handover-reports').upload(filePath, file, { upsert: true })
        if (error) throw error
        const { data: { publicUrl } } = supabase.storage.from('handover-reports').getPublicUrl(filePath)
        setPhotoUrls(prev => [...prev, publicUrl])
      }
    } catch (err: any) {
      setUploadError(err?.message || 'Feil ved opplasting')
      alert('Feil ved opplasting: ' + err.message)
    } finally {
      setUploadingPhotos(false)
      e.target.value = ''
    }
  }

  const removePhoto = (url: string) => {
    setPhotoUrls(prev => prev.filter(u => u !== url))
  }

  useEffect(() => {
    if (reporterType !== 'homeowner') return
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const name = user?.user_metadata?.full_name?.trim() || user?.email || 'Utleier'
      setReporterName(name)
    }
    load()
  }, [reporterType])

  /** Prefyll pkt. 3 fra Nav-formidlet periode (listing_availability, status Formidla). */
  useEffect(() => {
    if (!listingId || reporterType !== 'homeowner') return
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase
        .from('listing_availability')
        .select('start_date, end_date')
        .eq('listing_id', listingId)
        .eq('status', 'Formidla')
        .order('end_date', { ascending: false })
      if (cancelled || error || !data?.length) return
      const today = new Date().toISOString().slice(0, 10)
      const active = data.find(p => p.start_date <= today && p.end_date >= today)
      const chosen = active || data[0]
      const periodLabel = `${formatDateNo(chosen.start_date)} – ${formatDateNo(chosen.end_date)}`
      setFormData(prev => {
        if (prev.agreement_period.trim() !== '') return prev
        return { ...prev, agreement_period: periodLabel }
      })
    })()
    return () => {
      cancelled = true
    }
  }, [listingId, reporterType])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploadError(null)
    setSubmitError(null)
    if (!formData.photos_confirmed) {
      setSubmitError('Du må bekrefte at bildene er tatt (kryss av i boksen under bildene).')
      return
    }
    if (reporterType === 'homeowner' && !submissionConfirmed) {
      setSubmitError('Du må bekrefte at du sender inn rapporten (kryss av i bekreftelsesboksen).')
      return
    }

    setLoading(true)
    try {
      const content = { ...formData, photo_urls: photoUrls }
      if (tenantToken && reporterType === 'tenant') {
        const { error } = await supabase.rpc('submit_tenant_handover_report', {
          p_token: tenantToken,
          p_content: content
        })
        if (error) throw error
      } else if (listingId) {
        if (reporterType === 'homeowner') {
          const { data: reportId, error } = await supabase.rpc('submit_homeowner_handover_report', {
            p_listing_id: listingId,
            p_content: content
          })
          if (error) throw error
        } else {
          const { error } = await supabase
            .from('handover_reports')
            .insert([{
              listing_id: listingId,
              reporter_type: reporterType,
              content: content,
              is_finalized: true,
              signed_at: new Date().toISOString()
            }])
          if (error) throw error
        }
      } else {
        throw new Error('Manglende data')
      }

      setSubmitSuccess(true)
      setSubmitError(null)
      setTimeout(() => {
        if (onSaved) onSaved()
      }, 1200)
    } catch (err: any) {
      const msg = err?.message || 'Feil ved lagring'
      setSubmitError(msg)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%',
    border: 'none',
    padding: '10px 14px',
    fontSize: '0.95rem',
    color: '#0f172a',
    background: 'white',
    outline: 'none'
  }

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', background: 'white', padding: 'var(--space-8)', color: '#0f172a', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Title */}
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, textAlign: 'center', marginBottom: 'var(--space-4)' }}>
        Overtakelsesrapport
      </h1>

      {/* Introductory text */}
      <p style={{ fontSize: '0.95rem', lineHeight: 1.6, marginBottom: 'var(--space-6)', color: '#0f172a' }}>
        Ved formidling av bolig gjennom bo.ly, plikter utleier å dokumentere boligens tilstand. Overtakelsesrapporten skal være utfylt og innsendt senest samme dag som utleie starter. Boligutleier må legge ved bilder som ikke er eldre enn tre måneder og må være tatt etter siste leietaker.
      </p>

      {submitSuccess && (
        <div style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)', background: '#d1fae5', border: '1px solid #10b981', borderRadius: 12, color: '#065f46', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Send size={24} />
          <span style={{ fontWeight: 600 }}>Rapporten er sendt inn. Du kan lukke skjemaet.</span>
        </div>
      )}

      {submitError && (
        <div style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)', background: '#fef2f2', border: '1px solid #ef4444', borderRadius: 12, color: '#991b1b', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 600 }}>{submitError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gap: 0 }}>
          <section style={SECTION_STYLE} aria-labelledby="hr-field-1">
            {sectionHeader('1', 'Adresse')}
            <div style={{ padding: '12px 14px', background: 'white' }}>
              <input
                id="hr-field-1"
                type="text"
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                readOnly={!!listingAddress}
                required
                style={{ ...inputStyle }}
              />
            </div>
          </section>

          <section style={SECTION_STYLE}>
            {sectionHeader('2', 'Utleier')}
            <div style={{ padding: '12px 14px', background: 'white' }}>
              <input
                type="text"
                value={formData.landlord}
                onChange={e => setFormData({ ...formData, landlord: e.target.value })}
                readOnly={!!ownerName}
                required
                style={{ ...inputStyle }}
              />
            </div>
          </section>

          <section style={SECTION_STYLE}>
            {sectionHeader('3', 'Avtaleperiode')}
            <div style={{ padding: '12px 14px', background: 'white' }}>
              <input
                type="text"
                placeholder="f.eks. 01.01.2026 - 31.03.2026"
                value={formData.agreement_period}
                onChange={e => setFormData({ ...formData, agreement_period: e.target.value })}
                required
                style={{ ...inputStyle }}
              />
            </div>
          </section>

          <section style={SECTION_STYLE}>
            {sectionHeader('4', 'Møbler, hvite-varer og annet innbo')}
            <div style={{ padding: '12px 14px', background: 'white' }}>
              <textarea
                value={formData.inventory}
                onChange={e => setFormData({ ...formData, inventory: e.target.value })}
                placeholder="List opp inventar..."
                rows={3}
                style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }}
              />
            </div>
          </section>

          <section style={SECTION_STYLE}>
            {sectionHeader('5', 'Nøkler (type og antall)')}
            <div style={{ padding: '12px 14px', background: 'white' }}>
              <textarea
                value={formData.keys}
                onChange={e => setFormData({ ...formData, keys: e.target.value })}
                placeholder="f.eks. 2 stk systemnøkler, 1 stk postkassenøkkel"
                rows={2}
                style={{ ...inputStyle, minHeight: '50px', resize: 'vertical' }}
              />
            </div>
          </section>

          <section style={SECTION_STYLE}>
            {sectionHeader('6', 'Tilstands-beskrivelse (inkl. eventuelle feil/skader/mangler – skal også dokumenteres med bilder)')}
            <div style={{ padding: '12px 14px', background: 'white' }}>
              <textarea
                value={formData.condition_description}
                onChange={e => setFormData({ ...formData, condition_description: e.target.value })}
                placeholder="Beskriv boligens tilstand ved overtakelse..."
                rows={5}
                style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }}
              />
            </div>
          </section>

          <section style={SECTION_STYLE}>
            {sectionHeader('7', 'Bilder vedleggs dokumentet')}
            <div style={{ padding: '12px 14px', background: 'white' }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                style={{ display: 'none' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => { fileInputRef.current?.click(); setUploadError(null) }}
                  disabled={uploadingPhotos}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 16px',
                    background: LABEL_BG, border: '1px solid #b8d4e0', borderRadius: 8, cursor: uploadingPhotos ? 'wait' : 'pointer',
                    fontSize: '0.95rem', fontWeight: 600, color: '#0f172a'
                  }}
                >
                  <ImagePlus size={20} />
                  {uploadingPhotos ? 'Laster opp...' : 'Legg ved bilder'}
                </button>
                <span style={{ fontSize: '0.95rem', fontWeight: 600, color: photoUrls.length > 0 ? '#0d9488' : '#64748b' }}>
                  {photoUrls.length === 0 ? 'Ingen bilder lagt ved ennå' : `${photoUrls.length} bilder lastet opp`}
                </span>
              </div>
              {uploadError && (
                <p style={{ margin: '8px 0 0', fontSize: '0.9rem', color: '#dc2626' }}>{uploadError}</p>
              )}
              {photoUrls.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                  {photoUrls.map(url => (
                    <div key={url} style={{ position: 'relative' }}>
                      <img src={url} alt="Vedlegg" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6, border: '1px solid #b8d4e0' }} />
                      <button
                        type="button"
                        onClick={() => removePhoto(url)}
                        style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: '50%', background: '#ef4444', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.95rem', marginTop: 12, flexWrap: 'wrap' }}>
                <input
                  type="checkbox"
                  checked={formData.photos_confirmed}
                  onChange={e => setFormData({ ...formData, photos_confirmed: e.target.checked })}
                  style={{ width: '18px', height: '18px' }}
                />
                <span>Det bekreftes at bildene er tatt dato:</span>
                <DateInput
                  value={formData.photos_date}
                  onChange={v => setFormData({ ...formData, photos_date: v })}
                  placeholder="DD.MM.ÅÅÅÅ"
                  style={{ border: 'none', borderBottom: '1px solid #0f172a', background: 'transparent', padding: '2px 6px', fontWeight: 600, fontSize: '0.95rem' }}
                />
              </label>
            </div>
          </section>
        </div>

        {/* Bekreftelse for utleier – knapp/avkryssing som bildebekreftelsen */}
        {reporterType === 'homeowner' && (
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              fontSize: '0.95rem',
              marginTop: 'var(--space-8)',
              padding: 'var(--space-3) var(--space-4)',
              background: submissionConfirmed ? '#e0f2f7' : 'transparent',
              border: '1px solid #b8d4e0',
              borderRadius: 8,
            }}
          >
            <input
              type="checkbox"
              checked={submissionConfirmed}
              onChange={e => setSubmissionConfirmed(e.target.checked)}
              style={{ width: '18px', height: '18px', flexShrink: 0 }}
            />
            <span style={{ fontWeight: 500, color: '#0f172a' }}>
              Jeg ({reporterName || '…'}) bekrefter at jeg sender inn overtakelsesrapport ({formatDateNo(formData.photos_date || new Date().toISOString().split('T')[0])}).
            </span>
          </label>
        )}
        {reporterType === 'tenant' && (
          <p style={{ fontSize: '0.9rem', color: '#64748b', marginTop: 'var(--space-6)' }}>
            Du trenger ikke skrive navn eller signere. Rapporten sendes inn uten å lagre hvem som fylte den ut.
          </p>
        )}

        <button
          type="submit"
          className="button"
          disabled={loading || !formData.photos_confirmed || (reporterType === 'homeowner' && !submissionConfirmed) || submitSuccess}
          style={{ marginTop: 'var(--space-8)', padding: 'var(--space-4)', width: '100%', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
        >
          {loading ? 'Sender inn...' : submitSuccess ? 'Sendt inn!' : (
            <>
              <Send size={20} /> Send inn overtakelsesrapport {photoUrls.length > 0 && `(${photoUrls.length} bilder)`}
            </>
          )}
        </button>
      </form>
    </div>
  )
}
