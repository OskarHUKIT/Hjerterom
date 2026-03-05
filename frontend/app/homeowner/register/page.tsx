'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, Save, MapPin, Bed, Tag, FileText, Camera, 
  Home as HomeIcon, Info, Users, Ruler, Building, CheckCircle2, 
  Wifi, Zap, Tv, ShieldCheck, Phone, User
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> }

export default function HomeownerRegister(props: PageProps) {
  use(props.searchParams ?? Promise.resolve({}))
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [hasSignedTerms, setHasSignedTerms] = useState<boolean | null>(null)
  
  const [formData, setFormData] = useState({
    owner_name: '',
    contact_phone: '',
    address: '',
    city: '',
    postal_code: '',
    type: 'Leilighet',
    size_sqm: '',
    bedrooms: '',
    floor_number: '',
    accessibility: [] as string[],
    floor_detail: [] as string[],
    furnishing: 'Umøblert',
    price_daily: '',
    price_weekly: '',
    price_monthly_short: '',
    price_monthly_long: '',
    includes: [] as string[],
    deposit_amount: '',
    deposit_guarantee: [] as string[],
    parking_info: '',
    max_occupants: '',
    additional_info: '',
    latitude: null as number | null,
    longitude: null as number | null,
    has_insurance: false
  })

  useEffect(() => {
    const checkTerms = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('user_agreements')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_terminated', false)
        .maybeSingle()

      if (!data) {
        setHasSignedTerms(false)
        router.push('/homeowner/sign-terms')
      } else {
        setHasSignedTerms(true)
      }
    }
    checkTerms()
  }, [router])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      setImageFiles([...imageFiles, ...files])
      
      const newPreviews = files.map(file => URL.createObjectURL(file))
      setImagePreviews([...imagePreviews, ...newPreviews])
    }
  }

  const removeImage = (index: number) => {
    const newFiles = [...imageFiles]
    newFiles.splice(index, 1)
    setImageFiles(newFiles)

    const newPreviews = [...imagePreviews]
    newPreviews.splice(index, 1)
    setImagePreviews(newPreviews)
  }

  const toggleMultiSelect = (field: string, value: string) => {
    setFormData(prev => {
      const current = (prev as any)[field] as string[]
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter(v => v !== value) }
      } else {
        return { ...prev, [field]: [...current, value] }
      }
    })
  }

  const uploadImages = async (files: File[]) => {
    const urls = []
    for (const file of files) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `listing-images/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('listings')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('listings')
        .getPublicUrl(filePath)
      
      urls.push(publicUrl)
    }
    return urls
  }

  const geocodeAddress = async () => {
    if (!formData.address || formData.address.trim().length < 3) return

    try {
      const query = `${formData.address.trim()}, Norway`
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(query)}&limit=1`,
        { headers: { 'Accept-Language': 'no' } }
      )
      const data = await response.json()

      if (data && data.length > 0) {
        const hit = data[0]
        const addr = hit.address || {}
        const postcode = (addr.postcode || '').toString().replace(/\s/g, '').slice(0, 4)
        const rawCity =
          addr.city ||
          addr.town ||
          addr.village ||
          addr.municipality ||
          ''
        // Bruk kommunenavn fra geokoding (ingen "Annet") – tillatelsesområder for kommune er basert på kommune
        const city = (rawCity || '').trim()
        setFormData(prev => ({
          ...prev,
          latitude: parseFloat(hit.lat),
          longitude: parseFloat(hit.lon),
          ...(postcode && { postal_code: postcode }),
          ...(city && { city })
        }))
      }
    } catch (err) {
      console.error('Geocoding error:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      let imageUrls: string[] = []
      if (imageFiles.length > 0) {
        imageUrls = await uploadImages(imageFiles)
      }

      const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))
      const sizeSqm = clamp(parseFloat(String(formData.size_sqm)) || 0, 1, 9999)
      const bedroomsVal = clamp(parseInt(String(formData.bedrooms), 10) || 0, 0, 20)
      const maxOcc = clamp(parseInt(String(formData.max_occupants), 10) || 1, 1, 50)
      const priceMin = 0
      const priceMax = 999999
      const priceDaily = clamp(parseFloat(String(formData.price_daily)) || 0, priceMin, priceMax)
      const priceWeekly = clamp(parseFloat(String(formData.price_weekly)) || 0, priceMin, priceMax)
      const priceShort = clamp(parseFloat(String(formData.price_monthly_short)) || 0, priceMin, priceMax)
      const priceLong = formData.price_monthly_long ? clamp(parseFloat(String(formData.price_monthly_long)), priceMin, priceMax) : null
      const deposit = formData.deposit_amount ? clamp(parseFloat(String(formData.deposit_amount)), 0, 9999999) : null
      const floorNumber = formData.floor_detail?.length ? formData.floor_detail.join(', ') : ''

      const { has_insurance: _skip, ...listingFields } = formData
      const { data, error } = await supabase
        .from('listings')
        .insert([
          {
            ...listingFields,
            owner_id: user.id,
            floor_number: floorNumber,
            image_url: imageUrls[0] ?? null, // Hovedbilde
            image_urls: imageUrls, // Hele galleriet
            is_available: true,
            status: 'Tilgjengelig',
            size_sqm: sizeSqm,
            bedrooms: bedroomsVal,
            max_occupants: maxOcc,
            price_daily: priceDaily,
            price_per_night: priceDaily, // backward compatibility
            price_weekly: priceWeekly,
            price_monthly_short: priceShort,
            price_monthly_long: priceLong,
            deposit_amount: deposit,
            latitude: formData.latitude,
            longitude: formData.longitude
          }
        ])
        .select('id')

      if (error) {
        const msg = [error.message, error.details, error.hint].filter(Boolean).join(' · ')
        throw new Error(msg || JSON.stringify(error))
      }

      const inserted = Array.isArray(data) && data.length > 0 ? data[0] : null
      const listingId = inserted?.id
      if (!listingId) {
        throw new Error('Lagring fullført, men kunne ikke hente ID for den nye boligen. Sjekk at du har tilgang til å opprette boliger.')
      }

      // Logg handling inkl. viktige bekreftelser (forsikring akseptert ved publisering)
      await supabase.from('audit_logs').insert([{
        user_id: user.id,
        action_type: 'CREATE_LISTING',
        listing_id: listingId,
        listing_address: formData.address,
        details: {
          address: formData.address,
          city: formData.city,
          postal_code: formData.postal_code || null,
          has_insurance_accepted: true,
        }
      }])

      // Varsle kun kommune – ikke utleier som registrerte
      const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'En utleier'
      const { data: kommuneProfiles } = await supabase.from('profiles').select('id').eq('role', 'kommune_ansatt')
      const rows = (kommuneProfiles || []).map((p: { id: string }) => ({
        listing_id: listingId,
        owner_id: p.id,
        type: 'NEW_LISTING',
        title: 'Ny bolig registrert',
        message: `${userName} har registrert en ny bolig i ${formData.city}: ${formData.address}`,
        municipality: formData.city
      }))
      if (rows.length > 0) {
        await supabase.from('notifications').insert(rows)
      }

      alert('Bolig registrert!')
      router.push('/homeowner/manage')
    } catch (err: any) {
      const message = err?.message ?? err?.error_description ?? (typeof err === 'string' ? err : JSON.stringify(err))
      console.error('Error saving listing:', message, err)
      alert('Feil ved lagring: ' + (message || 'Ukjent feil'))
    } finally {
      setLoading(false)
    }
  }

  if (hasSignedTerms === null) return <div className="container" style={{ minHeight: '80vh' }} />

  return (
    <main className="container">
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <Link href="/homeowner/manage" className="nav-link" style={{ marginLeft: '-1rem', marginBottom: 'var(--space-2)', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <ArrowLeft size={18} /> Tilbake til mine boliger
        </Link>
        <h1 style={{ fontSize: '2.75rem' }}>Registrer ny bolig</h1>
        <p style={{ maxWidth: '700px', opacity: 0.8 }}>Fyll ut alle detaljer om boligen. Denne informasjonen er grunnlaget for kommunens vurdering av boligen.</p>
      </div>

      <form onSubmit={handleSubmit} className="register-form" style={{ display: 'grid', gap: 'var(--space-6)' }}>
        <div className="register-form-columns" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 'var(--space-8)', alignItems: 'start' }}>
          
          <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
            {/* Section 1: Basic Info & Kontakt */}
            <section className="form-section">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-5)', color: 'var(--color-sky-blue)' }}>
                <User size={20} /> Kontaktinformasjon
              </h3>
              <div className="form-grid">
                <div>
                  <label className="label">Utleier / Firma</label>
                  <input type="text" className="input" placeholder="Fullt navn eller firmanavn" required 
                    value={formData.owner_name} onChange={e => setFormData({...formData, owner_name: e.target.value})} />
                </div>
                <div>
                  <label className="label">Telefonnummer</label>
                  <input type="tel" className="input" placeholder="Mobil eller fasttelefon" required 
                    value={formData.contact_phone} onChange={e => setFormData({...formData, contact_phone: e.target.value})} />
                </div>
              </div>
              <div style={{ marginTop: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="label">Gateadresse</label>
                  {formData.latitude && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-teal)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={12} /> Posisjon funnet
                    </span>
                  )}
                </div>
                <input type="text" className="input" placeholder="F.eks. Storgata 1" required 
                  value={formData.address} 
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  onBlur={geocodeAddress} />
              </div>
              <div className="form-grid">
                <div>
                  <label className="label">Kommune</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Fylles fra adresse eller skriv kommune"
                    value={formData.city}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label">Postnummer</label>
                  <input type="text" className="input" placeholder="4 siffer" maxLength={4} required 
                    value={formData.postal_code} onChange={e => setFormData({...formData, postal_code: e.target.value})} />
                </div>
              </div>
            </section>

            {/* Section 2: Boligdetaljer */}
            <section className="form-section">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-5)', color: 'var(--color-sky-blue)' }}>
                <Building size={20} /> Boligdetaljer
              </h3>
              <div className="form-grid">
                <div>
                  <label className="label">Type bolig</label>
                  <select className="input" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                    <option>Enebolig/flermannsbolig</option>
                    <option>Leilighet</option>
                    <option>Hybelleilighet (sovealkove)</option>
                    <option>Hybel</option>
                    <option>Bokollektiv/bofelleskap</option>
                  </select>
                </div>
                <div>
                  <label className="label">Størrelse (kvm)</label>
                  <input type="number" className="input" placeholder="F.eks. 45" required min={1} max={9999}
                    value={formData.size_sqm} onChange={e => setFormData({...formData, size_sqm: e.target.value})} />
                </div>
              </div>
              <div className="form-grid">
                <div>
                  <label className="label">Antall soverom</label>
                  <input type="number" className="input" placeholder="Antall" required min={0} max={20}
                    value={formData.bedrooms} onChange={e => setFormData({...formData, bedrooms: e.target.value})} />
                </div>
              </div>

              <div style={{ marginTop: 'var(--space-4)' }}>
                <label className="label">Etasje (velg alle som passer)</label>
                <div className="floor-detail-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-2)' }}>
                  {['Underetasje', '1', '2', '3', '4'].map(f => (
                    <button type="button" key={f} 
                      onClick={() => toggleMultiSelect('floor_detail', f)}
                      style={{ 
                        padding: 'var(--space-2)', 
                        background: formData.floor_detail.includes(f) ? 'var(--color-royal-blue)' : 'rgba(255,255,255,0.1)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        color: 'white'
                      }}
                    >{f}</button>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 'var(--space-6)' }}>
                <label className="label">Fysisk tilrettelegging</label>
                
                <div className="physical-access-info" style={{ 
                  padding: 'var(--space-4)', 
                  background: 'rgba(59, 130, 246, 0.1)', 
                  borderRadius: '12px', 
                  fontSize: '0.85rem', 
                  marginBottom: 'var(--space-4)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  color: 'var(--text-body)'
                }}>
                  <h4 className="physical-access-info-title" style={{ marginBottom: 'var(--space-2)', fontSize: '0.9rem' }}>Hva betyr valgene?</h4>
                  <ul style={{ paddingLeft: '1.2rem', display: 'grid', gap: 'var(--space-1)' }}>
                    <li><strong>Alt på ett plan:</strong> Ingen trapper eller høye dørstokker inne i boenheten.</li>
                    <li><strong>Heis i bygget:</strong> Bygget har heis som er stor nok for rullestol eller barnevogn.</li>
                    <li><strong>Terskelfritt:</strong> Ingen kanter høyere enn 2cm mellom rommene i boligen.</li>
                    <li><strong>Universell utforming:</strong> Boligen oppfyller krav til snuareal og tilgjengelighet for alle.</li>
                    <li><strong>Omsorgsbolig:</strong> Spesialtilpasset bolig for omfattende pleie- og hjelpebehov.</li>
                  </ul>
                </div>

                <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                  {[
                    'Ikke tilrettelagt og boligen har utendørs trapp',
                    'Ikke tilrettelagt og boligen har innendørs trapp',
                    'Alt på ett plan',
                    'Heis i bygget',
                    'Terskelfritt',
                    'Universell utforming',
                    'Omsorgsboligstandard'
                  ].map(a => (
                    <label key={a} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3)', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={formData.accessibility.includes(a)} onChange={() => toggleMultiSelect('accessibility', a)} />
                      <span style={{ fontSize: '0.9rem' }}>{a}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 'var(--space-6)' }}>
                <label className="label">Møblering</label>
                <select className="input" value={formData.furnishing} onChange={e => setFormData({...formData, furnishing: e.target.value})}>
                  <option>Umøblert</option>
                  <option>Kun hvitevarer</option>
                  <option>Fullt møblert</option>
                  <option>Fullt møblert med inventar på kjøkken og bad</option>
                </select>
              </div>
            </section>
          </div>

          <div className="register-form-sidebar" style={{ display: 'grid', gap: 'var(--space-6)', position: 'sticky', top: '20px' }}>
            {/* Section 3: Pris og Vilkår */}
            <section className="form-section">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-5)', color: 'var(--color-sky-blue)' }}>
                <Tag size={20} /> Pris og kapasitet
              </h3>
              <div className="form-grid">
                <div>
                  <label className="label">Døgnpris</label>
                  <input type="number" className="input" placeholder="NOK" required min={0} max={999999}
                    value={formData.price_daily} onChange={e => setFormData({...formData, price_daily: e.target.value})} />
                </div>
                <div>
                  <label className="label">Ukespris</label>
                  <input type="number" className="input" placeholder="NOK" required min={0} max={999999}
                    value={formData.price_weekly} onChange={e => setFormData({...formData, price_weekly: e.target.value})} />
                </div>
              </div>
              <div className="form-grid">
                <div>
                  <label className="label">Månedsleie (korttid)</label>
                  <input type="number" className="input" placeholder="Inntil 3 mnd" required min={0} max={999999}
                    value={formData.price_monthly_short} onChange={e => setFormData({...formData, price_monthly_short: e.target.value})} />
                </div>
                <div>
                  <label className="label">Månedsleie (langtid)</label>
                  <input type="number" className="input" placeholder="Valgfritt" min={0} max={999999}
                    value={formData.price_monthly_long} onChange={e => setFormData({...formData, price_monthly_long: e.target.value})} />
                </div>
              </div>

              <div style={{ marginTop: 'var(--space-4)' }}>
                <label className="label">Hva inkluderer månedsleien?</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                  {['Ingenting inkludert', 'Strøm', 'Internett', 'Kabel-tv'].map(i => (
                    <button type="button" key={i} 
                      onClick={() => toggleMultiSelect('includes', i)}
                      style={{ 
                        padding: 'var(--space-2) var(--space-4)', 
                        background: formData.includes.includes(i) ? 'var(--color-teal)' : 'rgba(255,255,255,0.1)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '20px',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        color: 'white'
                      }}
                    >{i}</button>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 'var(--space-6)' }}>
                <label className="label">Langtidsleie: Depositum & Garanti</label>
                <input type="number" className="input" placeholder="Depositumsbeløp" min={0} max={9999999}
                  value={formData.deposit_amount} onChange={e => setFormData({...formData, deposit_amount: e.target.value})} />
                <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                  {[
                    'Godtar depositumsgaranti fra Nav',
                    'Godtar depositumsgaranti fra andre tilbydere',
                    'Godtar ordinært depositum'
                  ].map(g => (
                    <label key={g} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2)', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input type="checkbox" checked={formData.deposit_guarantee.includes(g)} onChange={() => toggleMultiSelect('deposit_guarantee', g)} />
                      <span>{g}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-grid" style={{ marginTop: 'var(--space-6)' }}>
                <div>
                  <label className="label">Parkering</label>
                  <input type="text" className="input" placeholder="F.eks. Garasje" required 
                    value={formData.parking_info} onChange={e => setFormData({...formData, parking_info: e.target.value})} />
                </div>
                <div>
                  <label className="label">Maks personer</label>
                  <input type="number" className="input" placeholder="Antall" required min={1} max={50}
                    value={formData.max_occupants} onChange={e => setFormData({...formData, max_occupants: e.target.value})} />
                </div>
              </div>
            </section>

            {/* Section 4: Bilder & Annet */}
            <section className="form-section">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-5)', color: 'var(--color-sky-blue)' }}>
                <Camera size={20} /> Bilder og info
              </h3>
              <div style={{ border: '2px dashed var(--border-medium)', padding: 'var(--space-6)', textAlign: 'center', borderRadius: '16px', background: 'var(--bg-app)' }}>
                <div className="image-previews-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                  {imagePreviews.map((p, i) => (
                    <div key={i} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: '8px', overflow: 'hidden' }}>
                      <img src={p} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button type="button" onClick={() => removeImage(i)} style={{ position: 'absolute', top: 5, right: 5, background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer' }}>×</button>
                    </div>
                  ))}
                </div>
                <label className="button" style={{ backgroundColor: 'var(--color-muted-blue)', fontSize: '0.875rem', cursor: 'pointer' }}>
                  <input type="file" multiple accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                  Last opp bilder
                </label>
              </div>
              <div style={{ marginTop: 'var(--space-4)' }}>
                <label className="label">Annen info om boligen</label>
                <textarea className="input" placeholder="Ytterligere detaljer..." 
                  value={formData.additional_info} onChange={e => setFormData({...formData, additional_info: e.target.value})}></textarea>
              </div>
            </section>
          </div>
        </div>

        <div className="register-form-footer" style={{ 
          marginTop: 'var(--space-4)', padding: 'var(--space-5) var(--space-6)', 
          background: 'rgba(15, 23, 42, 0.9)', borderRadius: '20px', 
          display: 'flex', flexDirection: 'column', gap: 'var(--space-4)',
          position: 'sticky', bottom: '20px', zIndex: 10, backdropFilter: 'blur(16px)', border: '1px solid var(--border-subtle)' 
        }}>
          <label style={{ display: 'flex', gap: '12px', cursor: 'pointer', alignItems: 'center' }}>
            <input 
              type="checkbox" 
              required
              checked={formData.has_insurance}
              onChange={e => setFormData({...formData, has_insurance: e.target.checked})}
              style={{ width: '20px', height: '20px' }} 
            />
            <div style={{ fontSize: '0.85rem' }}>
              <span style={{ fontWeight: 700, display: 'block' }}>Bolig- og innboforsikring</span>
              <span style={{ opacity: 0.8 }}>I henhold til vilkårsavtalen plikter utleier å ha både bolig- og innboforsikring.</span>
            </div>
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="button" disabled={loading || !formData.has_insurance} style={{ padding: 'var(--space-4) var(--space-10)', fontSize: '1.125rem', borderRadius: '14px' }}>
              {loading ? <Save size={22} style={{ opacity: 0.6 }} /> : <Save size={22} />} 
              {loading ? 'Lagrer...' : 'Publiser bolig'}
            </button>
          </div>
        </div>
      </form>
    </main>
  )
}
