'use client'

import { useState, useRef } from 'react'
import { Send, ImagePlus, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { DateInput } from './DateInput'

interface HandoverReportProps {
  listingId?: string
  listingAddress?: string
  ownerName?: string
  reporterType: 'homeowner' | 'tenant'
  tenantToken?: string
  onSaved?: () => void
}

const ROW_STYLE = { border: '1px solid #b8d4e0', borderCollapse: 'collapse' } as const
const LABEL_BG = '#e0f2f7'
const LABEL_CELL = { padding: '10px 14px', background: LABEL_BG, fontWeight: 600, fontSize: '0.95rem', color: '#0f172a', width: '36px', textAlign: 'center' as const }
const LABEL_TEXT = { padding: '10px 14px', background: LABEL_BG, fontSize: '0.95rem', color: '#0f172a', width: '220px' }
const INPUT_CELL = { padding: 0, background: 'white', border: '1px solid #b8d4e0' }

export default function HandoverReport({ listingId, listingAddress, ownerName, reporterType, tenantToken, onSaved }: HandoverReportProps) {
  const [loading, setLoading] = useState(false)
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploadError(null)
    setSubmitError(null)
    if (!formData.photos_confirmed) {
      setSubmitError('Du må bekrefte at bildene er tatt (kryss av i boksen under bildene).')
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
        <table style={{ width: '100%', ...ROW_STYLE }}>
          <tbody>
            <tr>
              <td style={{ ...LABEL_CELL, ...ROW_STYLE }}>1</td>
              <td style={{ ...LABEL_TEXT, ...ROW_STYLE }}>Adresse</td>
              <td style={{ ...INPUT_CELL, ...ROW_STYLE }}>
                <input
                  type="text"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  readOnly={!!listingAddress}
                  required
                  style={{ ...inputStyle }}
                />
              </td>
            </tr>
            <tr>
              <td style={{ ...LABEL_CELL, ...ROW_STYLE }}>2</td>
              <td style={{ ...LABEL_TEXT, ...ROW_STYLE }}>Utleier</td>
              <td style={{ ...INPUT_CELL, ...ROW_STYLE }}>
                <input
                  type="text"
                  value={formData.landlord}
                  onChange={e => setFormData({ ...formData, landlord: e.target.value })}
                  readOnly={!!ownerName}
                  required
                  style={{ ...inputStyle }}
                />
              </td>
            </tr>
            <tr>
              <td style={{ ...LABEL_CELL, ...ROW_STYLE }}>3</td>
              <td style={{ ...LABEL_TEXT, ...ROW_STYLE }}>Avtaleperiode</td>
              <td style={{ ...INPUT_CELL, ...ROW_STYLE }}>
                <input
                  type="text"
                  placeholder="f.eks. 01.01.2026 - 31.03.2026"
                  value={formData.agreement_period}
                  onChange={e => setFormData({ ...formData, agreement_period: e.target.value })}
                  required
                  style={{ ...inputStyle }}
                />
              </td>
            </tr>
            <tr>
              <td style={{ ...LABEL_CELL, ...ROW_STYLE }}>4</td>
              <td style={{ ...LABEL_TEXT, ...ROW_STYLE }}>Møbler, hvite-varer og annet innbo</td>
              <td style={{ ...INPUT_CELL, ...ROW_STYLE }}>
                <textarea
                  value={formData.inventory}
                  onChange={e => setFormData({ ...formData, inventory: e.target.value })}
                  placeholder="List opp inventar..."
                  rows={3}
                  style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }}
                />
              </td>
            </tr>
            <tr>
              <td style={{ ...LABEL_CELL, ...ROW_STYLE }}>5</td>
              <td style={{ ...LABEL_TEXT, ...ROW_STYLE }}>Nøkler (type og antall)</td>
              <td style={{ ...INPUT_CELL, ...ROW_STYLE }}>
                <textarea
                  value={formData.keys}
                  onChange={e => setFormData({ ...formData, keys: e.target.value })}
                  placeholder="f.eks. 2 stk systemnøkler, 1 stk postkassenøkkel"
                  rows={2}
                  style={{ ...inputStyle, minHeight: '50px', resize: 'vertical' }}
                />
              </td>
            </tr>
            <tr>
              <td style={{ ...LABEL_CELL, ...ROW_STYLE }}>6</td>
              <td style={{ ...LABEL_TEXT, ...ROW_STYLE }}>
                Tilstands-beskrivelse (inkl. eventuelle feil/skader/mangler – skal også dokumenteres med bilder)
              </td>
              <td style={{ ...INPUT_CELL, ...ROW_STYLE }}>
                <textarea
                  value={formData.condition_description}
                  onChange={e => setFormData({ ...formData, condition_description: e.target.value })}
                  placeholder="Beskriv boligens tilstand ved overtakelse..."
                  rows={5}
                  style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }}
                />
              </td>
            </tr>
            <tr>
              <td style={{ ...LABEL_CELL, ...ROW_STYLE }}>7</td>
              <td style={{ ...LABEL_TEXT, ...ROW_STYLE }}>
                Bilder vedleggs dokumentet
              </td>
              <td style={{ padding: '10px 14px', background: 'white', ...ROW_STYLE }}>
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
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.95rem', marginTop: 12 }}>
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
              </td>
            </tr>
          </tbody>
        </table>

        {/* Signature lines */}
        <div style={{ display: 'flex', gap: 'var(--space-8)', marginTop: 'var(--space-8)' }}>
          <div style={{ flex: 1 }}>
            <div style={{ borderBottom: '1px solid #0f172a', height: '28px', marginBottom: '4px' }} />
            <span style={{ fontSize: '0.9rem' }}>Sted/dato</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ borderBottom: '1px solid #0f172a', height: '28px', marginBottom: '4px' }} />
            <span style={{ fontSize: '0.9rem' }}>Signatur</span>
          </div>
        </div>

        <button
          type="submit"
          className="button"
          disabled={loading || !formData.photos_confirmed || submitSuccess}
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
