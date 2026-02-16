import { useState } from 'react'
import { FileText, CheckCircle2, AlertCircle, Save, Send, Camera } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface HandoverReportProps {
  listingId: string
  listingAddress?: string
  ownerName?: string
  reporterType: 'homeowner' | 'tenant'
  onSaved?: () => void
}

export default function HandoverReport({ listingId, listingAddress, ownerName, reporterType, onSaved }: HandoverReportProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    address: listingAddress || '',
    landlord: ownerName || '',
    agreement_period: '',
    inventory: '', // Møbler, hvite-varer og annet innbo
    keys: '', // Nøkler (type og antall)
    condition_description: '', // Tilstandsbeskrivelse
    photos_confirmed: false,
    photos_date: new Date().toISOString().split('T')[0]
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.photos_confirmed) {
      alert('Du må bekrefte at bildene er tatt.')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('handover_reports')
        .insert([{
          listing_id: listingId,
          reporter_type: reporterType,
          content: formData,
          is_finalized: true,
          signed_at: new Date().toISOString()
        }])
      
      if (error) throw error

      // Create notification for Kommune
      await supabase.from('notifications').insert([{
        listing_id: listingId,
        type: 'NEW_REPORT',
        title: `Ny overtakelsesrapport (${reporterType === 'homeowner' ? 'Utleier' : 'Leietaker'})`,
        message: `En ny overtakelsesrapport er sendt inn for boligen på ${formData.address}.`
      }])

      alert('Overtakelsesrapport er lagret og signert!')
      if (onSaved) onSaved()
    } catch (err: any) {
      alert('Feil ved lagring: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card" style={{ padding: 'var(--space-6)', background: 'white', color: '#0f172a', border: '1px solid #e2e8f0' }}>
      <div style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontSize: '1.5rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
          <FileText size={24} style={{ color: 'var(--color-royal-blue)' }} /> Overtakelsesrapport
        </h2>
        <p style={{ margin: '4px 0 0', opacity: 0.6, fontSize: '0.9rem' }}>
          Narvik Kommune - Boligbanken
        </p>
      </div>
      
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 'var(--space-6)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
          <div>
            <label className="label" style={{ color: '#334155', fontWeight: 700 }}>1. Adresse</label>
            <input 
              type="text" 
              className="input" 
              readOnly={!!listingAddress}
              style={{ color: '#0f172a', background: '#f8fafc' }}
              value={formData.address}
              onChange={e => setFormData({...formData, address: e.target.value})}
            />
          </div>
          <div>
            <label className="label" style={{ color: '#334155', fontWeight: 700 }}>2. Utleier</label>
            <input 
              type="text" 
              className="input" 
              readOnly={!!ownerName}
              style={{ color: '#0f172a', background: '#f8fafc' }}
              value={formData.landlord}
              onChange={e => setFormData({...formData, landlord: e.target.value})}
            />
          </div>
        </div>

        <div>
          <label className="label" style={{ color: '#334155', fontWeight: 700 }}>3. Avtaleperiode</label>
          <input 
            type="text" 
            className="input" 
            placeholder="f.eks. 01.01.2026 - 31.03.2026"
            style={{ color: '#0f172a', background: '#f8fafc' }}
            value={formData.agreement_period}
            onChange={e => setFormData({...formData, agreement_period: e.target.value})}
          />
        </div>

        <div>
          <label className="label" style={{ color: '#334155', fontWeight: 700 }}>4. Møbler, hvitevarer og annet innbo</label>
          <textarea 
            className="input" 
            placeholder="List opp inventar..." 
            style={{ color: '#0f172a', background: '#f8fafc', minHeight: '80px' }}
            value={formData.inventory}
            onChange={e => setFormData({...formData, inventory: e.target.value})}
          />
        </div>

        <div>
          <label className="label" style={{ color: '#334155', fontWeight: 700 }}>5. Nøkler (type og antall)</label>
          <input 
            type="text" 
            className="input" 
            placeholder="f.eks. 2 stk systemnøkler, 1 stk postkassenøkkel"
            style={{ color: '#0f172a', background: '#f8fafc' }}
            value={formData.keys}
            onChange={e => setFormData({...formData, keys: e.target.value})}
          />
        </div>

        <div>
          <label className="label" style={{ color: '#334155', fontWeight: 700 }}>6. Tilstandsbeskrivelse</label>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '8px' }}>
            Inkluder eventuelle feil, skader eller mangler. Dette skal også dokumenteres med bilder.
          </p>
          <textarea 
            className="input" 
            placeholder="Beskriv boligens tilstand ved overtakelse..." 
            style={{ color: '#0f172a', background: '#f8fafc', minHeight: '120px' }}
            value={formData.condition_description}
            onChange={e => setFormData({...formData, condition_description: e.target.value})}
          />
        </div>

        <div style={{ padding: 'var(--space-4)', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <label style={{ display: 'flex', gap: '12px', cursor: 'pointer', alignItems: 'center' }}>
            <input 
              type="checkbox" 
              checked={formData.photos_confirmed}
              onChange={e => setFormData({...formData, photos_confirmed: e.target.checked})}
              style={{ width: '20px', height: '20px' }}
            />
            <div style={{ fontSize: '0.9rem', color: '#0f172a' }}>
              <strong>7. Bekreftelse av bilder</strong>
              <br />
              Det bekreftes at bildene er tatt dato: 
              <input 
                type="date" 
                value={formData.photos_date}
                onChange={e => setFormData({...formData, photos_date: e.target.value})}
                style={{ marginLeft: '8px', border: 'none', background: 'transparent', fontWeight: 700, borderBottom: '1px solid #cbd5e1' }}
              />
            </div>
          </label>
        </div>

        <button 
          type="submit" 
          className="button" 
          disabled={loading || !formData.photos_confirmed}
          style={{ width: '100%', padding: 'var(--space-4)', fontSize: '1.1rem', background: 'var(--color-royal-blue)' }}
        >
          {loading ? 'Lagrer...' : (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Send size={18} /> Send inn overtakelsesrapport
            </span>
          )}
        </button>
      </form>
    </div>
  )
}
