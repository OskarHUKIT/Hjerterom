'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { 
  MapPin, Bed, Users, ShieldCheck, ArrowLeft, Calendar, Info, 
  Phone, User, Home as HomeIcon, CheckCircle2, 
  Ruler, Building, Tag, Wifi, Zap, Tv, Share2, Clipboard, 
  MessageSquare, Send, Trash2, Clock, ChevronLeft, ChevronRight,
  Maximize2, X, Plus, Camera, Edit3, FileText, RotateCcw
} from 'lucide-react'

import HandoverReport from '../../components/HandoverReport'

export default function ListingDetailsClient() {
  const { id } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const viewMode = searchParams.get('view') // 'nav' eller 'owner'
  const isNavView = viewMode === 'nav'
  
  const [listing, setListing] = useState<any>(null)
  const [availability, setAvailability] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [navNotes, setNavNotes] = useState<any[]>([])
  const [newNote, setNewNote] = useState('')
  const [copyFeedback, setCopyFeedback] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [handoverReports, setHandoverReports] = useState<any[]>([])
  const [showHandoverForm, setShowHandoverForm] = useState(false)
  const [tenantReportToken, setTenantReportToken] = useState<string | null>(null)
  const [hasActiveAgreement, setHasActiveAgreement] = useState(false)
  
  // Gallery state
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isSaving, setIsSaving] = useState<string | null>(null)

  // Formidling state (kommune)
  const [formidletStart, setFormidletStart] = useState('')
  const [formidletEnd, setFormidletEnd] = useState('')

  const isOwner = currentUser?.id === listing?.owner_id

  const allImages = listing?.image_urls || (listing?.image_url ? [listing.image_url] : [])

  const translateType = (type: string) => {
    if (!type) return ''
    const mapping: Record<string, string> = {
      'Short-term': 'Korttid',
      'Long-term': 'Langtid',
      'Apartment': 'Leilighet',
      'House': 'Enebolig',
      'Shared': 'Bofelleskap'
    }
    return mapping[type] || type
  }

  const handleUpdateField = async (field: string, value: any) => {
    if (!listing || !isOwner || isNavView) return
    
    if (!hasActiveAgreement) {
      alert('Du må ha en signert og aktiv avtale for å gjøre endringer.')
      router.push('/homeowner/sign-terms')
      return
    }

    setIsSaving(field)
    try {
      const { error } = await supabase
        .from('listings')
        .update({ [field]: value })
        .eq('id', id)

      if (error) throw error

      setListing({ ...listing, [field]: value })
      
      // Log event
      await supabase.from('audit_logs').insert([{
        user_id: currentUser.id,
        action_type: 'UPDATE_FIELD',
        listing_id: id,
        listing_address: listing.address,
        details: { field, value }
      }])
    } catch (err: any) {
      alert('Feil ved lagring: ' + err.message)
    } finally {
      setIsSaving(null)
    }
  }

  const handleAddFormidletPeriod = async () => {
    if (!listing || !isNavView || !formidletStart || !formidletEnd) return
    if (new Date(formidletEnd) < new Date(formidletStart)) {
      alert('Sluttdato må være etter eller lik startdato.')
      return
    }
    const start = formidletStart
    const end = formidletEnd
    const newPeriod = { id: crypto.randomUUID(), listing_id: id, start_date: start, end_date: end, status: 'Formidla' }
    setListing({ ...listing, status: 'Formidla', is_available: false })
    setAvailability(prev => [...prev.filter(p => p.status !== 'Formidla'), newPeriod].sort((a, b) => (a.start_date > b.start_date ? 1 : -1)))
    setFormidletStart('')
    setFormidletEnd('')
    try {
      const { error: availError } = await supabase
        .from('listing_availability')
        .insert([{ listing_id: id, start_date: start, end_date: end, status: 'Formidla' }])
      if (availError) throw availError
      const { error } = await supabase.from('listings').update({ status: 'Formidla', is_available: false }).eq('id', id)
      if (error) throw error
      const { data: availData } = await supabase.from('listing_availability').select('*').eq('listing_id', id).order('start_date')
      if (availData) setAvailability(availData)
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('audit_logs').insert([{ user_id: user?.id, action_type: 'KOMMUNE_MARK_FORMIDLA', listing_address: listing.address, details: { start_date: start, end_date: end } }])
      if (listing?.owner_id) {
        await supabase.from('listing_tenant_tokens').upsert([{ listing_id: id }], { onConflict: 'listing_id' })
        await supabase.from('notifications').insert([{ owner_id: listing.owner_id, type: 'HOUSE_FORMIDLET', title: 'Bolig formidlet', message: `Boligen din i ${listing.address} er markert som formidlet for perioden ${start}–${end}. Lever overtakelsesrapport ved overtakelse – klikk for å åpne skjema.`, listing_id: id }])
      }
    } catch (err: any) {
      setListing({ ...listing, status: listing.status, is_available: listing.is_available })
      setAvailability(availability)
      setFormidletStart(start)
      setFormidletEnd(end)
      alert('Feil: ' + err.message)
    }
  }

  const handleRemoveFormidlet = async () => {
    if (!listing || !isNavView || !confirm(`Vil du fjerne formidlingen for "${listing.address}"?`)) return
    const prevListing = listing
    const prevAvailability = availability
    setListing({ ...listing, status: 'Tilgjengelig', is_available: true })
    setAvailability(availability.filter(p => p.status !== 'Formidla'))
    try {
      const { error: delError } = await supabase.from('listing_availability').delete().eq('listing_id', id).eq('status', 'Formidla')
      if (delError) throw delError
      const { error } = await supabase.from('listings').update({ status: 'Tilgjengelig', is_available: true }).eq('id', id)
      if (error) throw error
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('audit_logs').insert([{ user_id: user?.id, action_type: 'KOMMUNE_REMOVE_FORMIDLA', listing_address: listing.address }])
    } catch (err: any) {
      setListing(prevListing)
      setAvailability(prevAvailability)
      alert('Feil: ' + err.message)
    }
  }

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setCurrentUser(user)
        
        // Sjekk tilgang hvis NAV-visning
        if (isNavView && user) {
          const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
          const role = user.user_metadata?.role || profile?.role
          if (role !== 'kommune_ansatt') {
            router.push(`/listings/${id}?view=owner`)
            return
          }
        }

        if (user) {
          const { data: agreement } = await supabase
            .from('user_agreements')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_terminated', false)
            .maybeSingle()
          setHasActiveAgreement(!!agreement)
        }

        const { data, error } = await supabase
          .from('listings')
          .select('*')
          .eq('id', id)
          .single()

        if (error) throw error
        setListing(data)

        // Fetch availability
        const { data: availData } = await supabase
          .from('listing_availability')
          .select('*')
          .eq('listing_id', id)
          .order('start_date', { ascending: true })
        setAvailability(availData || [])

        // Fetch NAV notes
        if (user && isNavView) {
          const { data: notesData } = await supabase
            .from('nav_notes')
            .select('*')
            .eq('listing_id', id)
            .order('created_at', { ascending: false })
          setNavNotes(notesData || [])
        }

        // Fetch Handover Reports
        const { data: reportsData } = await supabase
          .from('handover_reports')
          .select('*')
          .eq('listing_id', id)
          .order('created_at', { ascending: false })
        setHandoverReports(reportsData || [])

        // Fetch or create tenant report token (for kommune to share link with renters)
        if (user && isNavView) {
          let tokenData = await supabase.from('listing_tenant_tokens').select('token').eq('listing_id', id).maybeSingle()
          if (!tokenData.data && data?.status === 'Formidla') {
            await supabase.from('listing_tenant_tokens').upsert([{ listing_id: id }], { onConflict: 'listing_id' })
            tokenData = await supabase.from('listing_tenant_tokens').select('token').eq('listing_id', id).maybeSingle()
          }
          setTenantReportToken(tokenData.data?.token || null)
        }
      } catch (err) {
        console.error('Error fetching listing:', err)
      } finally {
        setLoading(false)
      }
    }

    if (id) fetchData()
  }, [id, isNavView])

  const handleUploadMore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    
    if (!hasActiveAgreement) {
      alert('Du må ha en signert og aktiv avtale for å laste opp bilder.')
      router.push('/homeowner/sign-terms')
      return
    }

    setUploading(true)
    try {
      const files = Array.from(e.target.files)
      const newUrls = []
      
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
        
        newUrls.push(publicUrl)
      }

      const updatedImageUrls = [...allImages, ...newUrls]
      
      const { error: updateError } = await supabase
        .from('listings')
        .update({ 
          image_urls: updatedImageUrls,
          image_url: updatedImageUrls[0] // Ensure we have a main thumbnail
        })
        .eq('id', id)

      if (updateError) throw updateError

      setListing({ ...listing, image_urls: updatedImageUrls, image_url: updatedImageUrls[0] })
      setCurrentImageIndex(updatedImageUrls.length - 1)
      alert('Bilder lagt til!')
    } catch (err: any) {
      alert('Feil ved opplasting: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNote.trim()) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('nav_notes')
        .insert([{
          listing_id: id,
          note_text: newNote,
          created_by: user.id
        }])
        .select()
        .single()

      if (error) throw error
      
      setNavNotes([data, ...navNotes])
      setNewNote('')
    } catch (err: any) {
      alert('Feil ved lagring av notat: ' + err.message)
    }
  }

  const handleCopyLink = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url)
    setCopyFeedback(true)
    setTimeout(() => setCopyFeedback(false), 2000)
  }

  if (loading) {
    return <div className="container" style={{ minHeight: '80vh' }} />
  }

  if (!listing) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: 'var(--space-10)' }}>
        <h2 style={{ color: 'white' }}>Boligen ble ikke funnet</h2>
        <Link href="/nav/database" className="button" style={{ marginTop: 'var(--space-4)' }}>
          Tilbake til boligbanken
        </Link>
      </div>
    )
  }

  return (
    <main className="container">
      <div className="listing-details-header" style={{ marginBottom: 'var(--space-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <Link href={isNavView ? "/nav/database" : "/homeowner/manage"} className="nav-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', marginLeft: '-1rem' }}>
          <ArrowLeft size={18} /> Tilbake til {isNavView ? "boligbanken" : "mine boliger"}
        </Link>
        <button onClick={handleCopyLink} className="button" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-sky-blue)', border: '1px solid var(--border-subtle)', padding: 'var(--space-2) var(--space-4)', fontSize: '0.85rem' }}>
          <Share2 size={16} /> {copyFeedback ? 'Lenke kopiert!' : 'Del med bruker'}
        </button>
      </div>

      <div className="listing-details-grid" style={{ display: 'grid', gridTemplateColumns: isNavView ? '1.5fr 1fr' : '1fr', gap: 'var(--space-8)', alignItems: 'start' }}>
        {/* Left Column */}
        <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
          <div style={{ 
            width: '100%', aspectRatio: '16/9', background: 'rgba(15, 23, 42, 0.6)', 
            borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--border-medium)', position: 'relative',
            cursor: allImages.length > 0 ? 'pointer' : 'default'
          }}>
            {allImages.length > 0 ? (
              <>
                <img 
                  src={allImages[currentImageIndex]} 
                  onClick={() => setIsFullscreen(true)}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'all 0.3s' }} 
                />
                
                {allImages.length > 1 && (
                  <>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => (prev - 1 + allImages.length) % allImages.length) }}
                      style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer', zIndex: 5 }}
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => (prev + 1) % allImages.length) }}
                      style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer', zIndex: 5 }}
                    >
                      <ChevronRight size={24} />
                    </button>
                    <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.6)', padding: '4px 12px', borderRadius: '20px', color: 'white', fontSize: '0.8rem', fontWeight: 600, zIndex: 5 }}>
                      {currentImageIndex + 1} / {allImages.length}
                    </div>
                  </>
                )}

                <button 
                  onClick={(e) => { e.stopPropagation(); setIsFullscreen(true) }}
                  style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '8px', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer', zIndex: 5 }}
                  title="Fullskjerm"
                >
                  <Maximize2 size={20} />
                </button>
              </>
            ) : (
              <label style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-sky-blue)', opacity: 0.2, cursor: isOwner ? 'pointer' : 'default' }}>
                {isOwner && <input type="file" multiple accept="image/*" onChange={handleUploadMore} style={{ display: 'none' }} />}
                <HomeIcon size={100} />
                <p style={{ marginTop: '10px', fontSize: '1.1rem' }}>{isOwner ? 'Klikk for å legge til bilder' : 'Ingen bilder lagt til'}</p>
              </label>
            )}

            {isOwner && (
              <label style={{ 
                position: 'absolute', bottom: '20px', right: '20px', 
                background: 'var(--color-royal-blue)', color: 'white', 
                padding: '10px 20px', borderRadius: '12px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600,
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)', zIndex: 6
              }}>
                <input type="file" multiple accept="image/*" onChange={handleUploadMore} style={{ display: 'none' }} />
                {uploading ? <Camera size={18} style={{ opacity: 0.5 }} /> : <Camera size={18} />}
                {uploading ? 'Laster opp...' : 'Legg til bilder'}
              </label>
            )}

            <div style={{ position: 'absolute', top: 20, left: 20, padding: '6px 16px', borderRadius: '20px', background: listing.status === 'Tilgjengelig' ? 'var(--color-teal)' : 
                          listing.status === 'Formidla' ? 'var(--color-sky-blue)' : '#ef4444', color: 'white', fontWeight: 800, fontSize: '0.8rem', textTransform: listing.status === 'Formidla' ? 'none' : 'uppercase', zIndex: 5 }}>
              {listing.status === 'Formidla' ? 'Formidlet' : listing.status}
            </div>
          </div>

          {/* Fullscreen Overlay */}
          {isFullscreen && allImages.length > 0 && (
            <div 
              style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.95)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => setIsFullscreen(false)}
            >
              <button 
                onClick={() => setIsFullscreen(false)}
                style={{ position: 'absolute', top: '30px', right: '30px', background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '10px' }}
              >
                <X size={40} />
              </button>
              
              <img 
                src={allImages[currentImageIndex]} 
                style={{ maxWidth: '95vw', maxHeight: '90vh', objectFit: 'contain' }} 
                onClick={(e) => e.stopPropagation()}
              />

              {allImages.length > 1 && (
                <>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => (prev - 1 + allImages.length) % allImages.length) }}
                    style={{ position: 'absolute', left: '30px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer' }}
                  >
                    <ChevronLeft size={40} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => (prev + 1) % allImages.length) }}
                    style={{ position: 'absolute', right: '30px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer' }}
                  >
                    <ChevronRight size={40} />
                  </button>
                </>
              )}
            </div>
          )}

          <section className="card" style={{ padding: 'var(--space-8)', background: '#ffffff' }}>
            {isOwner && !isNavView ? (
              <input 
                value={listing.address} 
                onChange={e => setListing({...listing, address: e.target.value})}
                onBlur={e => handleUpdateField('address', e.target.value)}
                style={{ 
                  fontSize: '2.5rem', fontWeight: 800, marginBottom: 'var(--space-2)', 
                  color: '#0f172a', border: 'none', background: 'none', width: '100%',
                  padding: 0, outline: 'none'
                }}
                className="editable-h1"
              />
            ) : (
              <h1 style={{ fontSize: '2.5rem', marginBottom: 'var(--space-2)', color: '#0f172a' }}>{listing.address}</h1>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', color: 'var(--color-royal-blue)', marginBottom: 'var(--space-6)' }}>
              <MapPin size={20} />
              {isOwner && !isNavView ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    value={listing.city} 
                    onChange={e => setListing({...listing, city: e.target.value})}
                    onBlur={e => handleUpdateField('city', e.target.value)}
                    style={{ 
                      fontSize: '1.2rem', fontWeight: 600, color: 'inherit', border: 'none', 
                      background: 'none', width: '120px', padding: 0, outline: 'none'
                    }}
                  />
                  <input 
                    value={listing.postal_code} 
                    onChange={e => setListing({...listing, postal_code: e.target.value})}
                    onBlur={e => handleUpdateField('postal_code', e.target.value)}
                    style={{ 
                      fontSize: '1.2rem', fontWeight: 600, color: 'inherit', border: 'none', 
                      background: 'none', width: '80px', padding: 0, outline: 'none'
                    }}
                  />
                </div>
              ) : (
                <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>{listing.city} {listing.postal_code}</span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)', padding: 'var(--space-6) 0', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', marginBottom: 'var(--space-6)' }}>
              <div style={{ textAlign: 'center' }}>
                <Building size={20} style={{ color: 'var(--color-royal-blue)', marginBottom: '4px' }} />
                {isOwner && !isNavView ? (
                  <select 
                    value={listing.type} 
                    onChange={e => {
                      setListing({...listing, type: e.target.value})
                      handleUpdateField('type', e.target.value)
                    }}
                    style={{ 
                      fontWeight: 700, color: '#0f172a', border: 'none', background: 'none', 
                      textAlign: 'center', width: '100%', fontSize: '0.9rem', cursor: 'pointer'
                    }}
                  >
                    <option value="Short-term">Korttid</option>
                    <option value="Long-term">Langtid</option>
                    <option value="Apartment">Leilighet</option>
                    <option value="House">Enebolig</option>
                    <option value="Shared">Bofelleskap</option>
                  </select>
                ) : (
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{translateType(listing.type)}</div>
                )}
                <div style={{ fontSize: '0.7rem', opacity: 0.6, color: '#64748b' }}>TYPE</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Ruler size={20} style={{ color: 'var(--color-royal-blue)', marginBottom: '4px' }} />
                {isOwner && !isNavView ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                    <input 
                      type="number"
                      value={listing.size_sqm} 
                      onChange={e => setListing({...listing, size_sqm: e.target.value})}
                      onBlur={e => handleUpdateField('size_sqm', e.target.value)}
                      style={{ 
                        fontWeight: 700, color: '#0f172a', border: 'none', background: 'none', 
                        textAlign: 'right', width: '40px', padding: 0, outline: 'none'
                      }}
                    />
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>m²</span>
                  </div>
                ) : (
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{listing.size_sqm} m²</div>
                )}
                <div style={{ fontSize: '0.7rem', opacity: 0.6, color: '#64748b' }}>STØRRELSE</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Bed size={20} style={{ color: 'var(--color-royal-blue)', marginBottom: '4px' }} />
                {isOwner && !isNavView ? (
                  <input 
                    type="number"
                    value={listing.bedrooms} 
                    onChange={e => setListing({...listing, bedrooms: e.target.value})}
                    onBlur={e => handleUpdateField('bedrooms', e.target.value)}
                    style={{ 
                      fontWeight: 700, color: '#0f172a', border: 'none', background: 'none', 
                      textAlign: 'center', width: '100%', padding: 0, outline: 'none'
                    }}
                  />
                ) : (
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{listing.bedrooms}</div>
                )}
                <div style={{ fontSize: '0.7rem', opacity: 0.6, color: '#64748b' }}>SOVEROM</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Users size={20} style={{ color: 'var(--color-royal-blue)', marginBottom: '4px' }} />
                {isOwner && !isNavView ? (
                  <input 
                    type="number"
                    value={listing.max_occupants} 
                    onChange={e => setListing({...listing, max_occupants: e.target.value})}
                    onBlur={e => handleUpdateField('max_occupants', e.target.value)}
                    style={{ 
                      fontWeight: 700, color: '#0f172a', border: 'none', background: 'none', 
                      textAlign: 'center', width: '100%', padding: 0, outline: 'none'
                    }}
                  />
                ) : (
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{listing.max_occupants}</div>
                )}
                <div style={{ fontSize: '0.7rem', opacity: 0.6, color: '#64748b' }}>MAKS PERS</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-8)' }}>
              <div>
                <h3 style={{ marginBottom: 'var(--space-4)', fontSize: '1.1rem', color: '#0f172a' }}>Boliginformasjon</h3>
                <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                  <div className="text-sm" style={{ color: '#334155' }}>
                    <strong>Etasje:</strong> {isOwner && !isNavView ? (
                      <input 
                        value={listing.floor_number} 
                        onChange={e => setListing({...listing, floor_number: e.target.value})}
                        onBlur={e => handleUpdateField('floor_number', e.target.value)}
                        style={{ border: 'none', background: 'rgba(0,0,0,0.03)', borderRadius: '4px', padding: '2px 6px', width: '80px', outline: 'none' }}
                      />
                    ) : listing.floor_number}
                  </div>
                  <div className="text-sm" style={{ color: '#334155' }}>
                    <strong>Møblering:</strong> {isOwner && !isNavView ? (
                      <select 
                        value={listing.furnishing} 
                        onChange={e => {
                          setListing({...listing, furnishing: e.target.value})
                          handleUpdateField('furnishing', e.target.value)
                        }}
                        style={{ border: 'none', background: 'rgba(0,0,0,0.03)', borderRadius: '4px', padding: '2px 6px', outline: 'none' }}
                      >
                        <option>Umøblert</option>
                        <option>Kun hvitevarer</option>
                        <option>Delvis møblert</option>
                        <option>Fullt møblert</option>
                        <option>Møblert m/utstyr</option>
                      </select>
                    ) : listing.furnishing}
                  </div>
                  <div className="text-sm" style={{ color: '#334155' }}>
                    <strong>Parkering:</strong> {isOwner && !isNavView ? (
                      <input 
                        value={listing.parking_info} 
                        onChange={e => setListing({...listing, parking_info: e.target.value})}
                        onBlur={e => handleUpdateField('parking_info', e.target.value)}
                        style={{ border: 'none', background: 'rgba(0,0,0,0.03)', borderRadius: '4px', padding: '2px 6px', width: '150px', outline: 'none' }}
                      />
                    ) : listing.parking_info}
                  </div>
                  <div className="text-sm" style={{ color: '#334155' }}>
                    <strong>Fysisk tilrettelegging:</strong> {isOwner && !isNavView ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                        {[
                          'Alt på ett plan', 
                          'Heis i bygget', 
                          'Terskelfritt', 
                          'Universell utforming', 
                          'Omsorgsboligstandard'
                        ].map(acc => {
                          const isActive = listing.accessibility?.includes(acc);
                          return (
                            <button 
                              key={acc}
                              onClick={() => {
                                const newAcc = isActive
                                  ? listing.accessibility.filter((a: string) => a !== acc)
                                  : [...(listing.accessibility || []), acc];
                                setListing({...listing, accessibility: newAcc});
                                handleUpdateField('accessibility', newAcc);
                              }}
                              style={{
                                padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', cursor: 'pointer',
                                background: isActive ? 'var(--color-royal-blue)' : 'rgba(0,0,0,0.05)',
                                border: '1px solid ' + (isActive ? 'var(--color-royal-blue)' : '#e2e8f0'),
                                color: isActive ? 'white' : '#64748b'
                              }}
                            >
                              {acc}
                            </button>
                          );
                        })}
                      </div>
                    ) : (listing.accessibility?.join(', ') || 'Ingen')}
                  </div>
                </div>
              </div>
              <div>
                <h3 style={{ marginBottom: 'var(--space-4)', fontSize: '1.1rem', color: '#0f172a' }}>Inkludert i leie</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                  {isOwner && !isNavView ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {[
                        'Strøm', 'Internett', 'Kommunale avgifter', 'Vaktmestertjenester', 'Parkering'
                      ].map(inc => {
                        const isActive = listing.includes?.includes(inc);
                        return (
                          <button 
                            key={inc}
                            onClick={() => {
                              const newInc = isActive
                                ? listing.includes.filter((i: string) => i !== inc)
                                : [...(listing.includes || []), inc];
                              setListing({...listing, includes: newInc});
                              handleUpdateField('includes', newInc);
                            }}
                            style={{
                              padding: '4px 12px', borderRadius: '14px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                              background: isActive ? '#f1f5f9' : 'transparent',
                              color: isActive ? '#0f172a' : '#94a3b8',
                              border: '1px solid ' + (isActive ? '#e2e8f0' : 'rgba(0,0,0,0.1)')
                            }}
                          >
                            {inc}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <>
                      {listing.includes?.map((i: string) => (
                        <span key={i} style={{ padding: '4px 12px', borderRadius: '14px', background: '#f1f5f9', color: '#0f172a', fontSize: '0.75rem', fontWeight: 600, border: '1px solid #e2e8f0' }}>
                          {i}
                        </span>
                      ))}
                      {(!listing.includes || listing.includes.length === 0) && <span className="text-sm" style={{ color: '#94a3b8', fontStyle: 'italic' }}>Ingenting inkludert</span>}
                    </>
                  )}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 'var(--space-8)' }}>
              <h3 style={{ marginBottom: 'var(--space-4)', fontSize: '1.1rem', color: '#0f172a' }}>Beskrivelse</h3>
              {isOwner && !isNavView ? (
                <textarea 
                  value={listing.additional_info} 
                  onChange={e => setListing({...listing, additional_info: e.target.value})}
                  onBlur={e => handleUpdateField('additional_info', e.target.value)}
                  style={{ 
                    width: '100%', minHeight: '150px', fontSize: '1rem', lineHeight: '1.6', 
                    color: '#334155', border: '1px solid #e2e8f0', background: '#f8fafc', 
                    borderRadius: '8px', padding: 'var(--space-4)', outline: 'none'
                  }}
                />
              ) : (
                <p style={{ whiteSpace: 'pre-wrap', fontSize: '1rem', lineHeight: '1.6', color: '#334155' }}>
                  {listing.additional_info || 'Ingen ytterligere beskrivelse.'}
                </p>
              )}
            </div>

            {isOwner && !isNavView && (
              <div style={{ marginTop: 'var(--space-8)', padding: 'var(--space-6)', background: 'var(--color-dark-navy)', borderRadius: '16px', color: 'white' }}>
                <h3 style={{ marginBottom: 'var(--space-6)', fontSize: '1.1rem', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Tag size={20} style={{ color: 'var(--color-sky-blue)' }} /> Leiepriser og depositum
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-6)' }}>
                  <div>
                    <label className="label" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', marginBottom: '4px' }}>DØGNPRIS</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input 
                        type="number"
                        value={listing.price_daily} 
                        onChange={e => setListing({...listing, price_daily: e.target.value})}
                        onBlur={e => handleUpdateField('price_daily', e.target.value)}
                        style={{ fontSize: '1.5rem', fontWeight: 800, background: 'none', border: 'none', color: 'white', width: '100px', outline: 'none' }}
                      />
                      <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>,-</span>
                    </div>
                  </div>
                  <div>
                    <label className="label" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', marginBottom: '4px' }}>UKESPRIS</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input 
                        type="number"
                        value={listing.price_weekly} 
                        onChange={e => setListing({...listing, price_weekly: e.target.value})}
                        onBlur={e => handleUpdateField('price_weekly', e.target.value)}
                        style={{ fontSize: '1.1rem', fontWeight: 700, background: 'none', border: 'none', color: 'white', width: '80px', outline: 'none' }}
                      />
                      <span>,-</span>
                    </div>
                  </div>
                  <div>
                    <label className="label" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', marginBottom: '4px' }}>MÅNEDSLEIE (KORTTID)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input 
                        type="number"
                        value={listing.price_monthly_short} 
                        onChange={e => setListing({...listing, price_monthly_short: e.target.value})}
                        onBlur={e => handleUpdateField('price_monthly_short', e.target.value)}
                        style={{ fontSize: '1.1rem', fontWeight: 700, background: 'none', border: 'none', color: 'white', width: '80px', outline: 'none' }}
                      />
                      <span>,-</span>
                    </div>
                  </div>
                  <div>
                    <label className="label" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', marginBottom: '4px' }}>LANGTIDSLEIE (PER MND)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input 
                        type="number"
                        value={listing.price_monthly_long} 
                        onChange={e => setListing({...listing, price_monthly_long: e.target.value})}
                        onBlur={e => handleUpdateField('price_monthly_long', e.target.value)}
                        style={{ fontSize: '1.1rem', fontWeight: 700, background: 'none', border: 'none', color: 'white', width: '80px', outline: 'none' }}
                      />
                      <span>,-</span>
                    </div>
                  </div>
                  <div>
                    <label className="label" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', marginBottom: '4px' }}>DEPOSITUM</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input 
                        type="number"
                        value={listing.deposit_amount} 
                        onChange={e => setListing({...listing, deposit_amount: e.target.value})}
                        onBlur={e => handleUpdateField('deposit_amount', e.target.value)}
                        style={{ fontSize: '1.1rem', fontWeight: 700, background: 'none', border: 'none', color: 'white', width: '80px', outline: 'none' }}
                      />
                      <span>,-</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Availability Section */}
            <div style={{ marginTop: 'var(--space-8)', padding: 'var(--space-6)', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ marginBottom: 'var(--space-4)', fontSize: '1.1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={20} style={{ color: 'var(--color-royal-blue)' }} /> Ledige perioder for utleie
              </h3>
              {availability.length > 0 ? (
                <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                  {availability.map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3)', background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <Calendar size={16} style={{ color: p.status === 'Formidla' ? 'var(--color-royal-blue)' : p.status === 'Utilgjengelig' ? '#ef4444' : 'var(--color-teal)' }} />
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>
                        {new Date(p.start_date).toLocaleDateString('no-NO')} - {new Date(p.end_date).toLocaleDateString('no-NO')}
                      </span>
                      <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: p.status === 'Formidla' ? 'var(--color-royal-blue)' : p.status === 'Utilgjengelig' ? '#ef4444' : 'var(--color-teal)', background: p.status === 'Formidla' ? 'rgba(59, 130, 246, 0.1)' : p.status === 'Utilgjengelig' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(32, 187, 175, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                        {p.status === 'Formidla' ? 'Formidlet' : p.status === 'Utilgjengelig' ? 'Utilgjengelig' : 'Tilgjengelig'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#64748b', fontStyle: 'italic' }}>Ingen spesifikke ledige perioder er lagt til for denne boligen.</p>
              )}

              {isNavView && (
                <div style={{ marginTop: 'var(--space-6)', padding: 'var(--space-4)', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.4)' }}>
                  <h4 style={{ marginBottom: 'var(--space-3)', fontSize: '0.95rem', color: '#0f172a' }}>Formidling</h4>
                  {listing?.status === 'Formidla' ? (
                    <div>
                      <p className="text-sm" style={{ color: '#475569', marginBottom: 'var(--space-3)' }}>Denne boligen er markert som formidlet.</p>
                      <button onClick={handleRemoveFormidlet} className="button" style={{ padding: '8px 16px', fontSize: '0.85rem', background: 'rgba(239, 68, 68, 0.9)' }}>
                        <RotateCcw size={14} /> Fjern formidling
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                      <label className="label" style={{ fontSize: '0.7rem', color: '#0369a1' }}>Periode (datoområde)</label>
                      <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '120px' }}>
                          <span className="text-sm" style={{ display: 'block', marginBottom: '4px', color: '#475569', fontSize: '0.75rem' }}>Fra</span>
                          <input 
                            type="date" 
                            className="input" 
                            style={{ marginBottom: 0, fontSize: '0.9rem', background: '#f1f5f9', color: '#0f172a', borderColor: 'rgba(59, 130, 246, 0.5)' }} 
                            value={formidletStart} 
                            onChange={e => setFormidletStart(e.target.value)}
                            max={formidletEnd || undefined}
                          />
                        </div>
                        <div style={{ flex: 1, minWidth: '120px' }}>
                          <span className="text-sm" style={{ display: 'block', marginBottom: '4px', color: '#475569', fontSize: '0.75rem' }}>Til</span>
                          <input 
                            type="date" 
                            className="input" 
                            style={{ marginBottom: 0, fontSize: '0.9rem', background: '#f1f5f9', color: '#0f172a', borderColor: 'rgba(59, 130, 246, 0.5)' }} 
                            value={formidletEnd} 
                            onChange={e => setFormidletEnd(e.target.value)}
                            min={formidletStart || undefined}
                          />
                        </div>
                        <button onClick={handleAddFormidletPeriod} className="button" style={{ padding: '8px 16px', fontSize: '0.85rem', flexShrink: 0 }}>
                          <ShieldCheck size={14} /> Legg inn
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Overtakelsesrapport Section */}
            <section id="overtakelsesrapport" className="card no-hover" style={{ padding: 'var(--space-8)', marginTop: 'var(--space-8)', background: '#ffffff', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: '#0f172a' }}>
                  <FileText size={20} style={{ color: '#0369a1' }} /> Overtakelsesrapporter
                </h3>
                {!isNavView && !showHandoverForm && (
                  <button 
                    onClick={() => setShowHandoverForm(true)}
                    className="button" 
                    style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                  >
                    Ny rapport
                  </button>
                )}
              </div>

              {showHandoverForm ? (
                <div style={{ marginBottom: 'var(--space-8)' }}>
                  <HandoverReport 
                    listingId={id as string} 
                    listingAddress={listing.address}
                    ownerName={listing.owner_name}
                    reporterType="homeowner" 
                    onSaved={() => {
                      setShowHandoverForm(false)
                      supabase.from('handover_reports').select('*').eq('listing_id', id).order('created_at', { ascending: false }).then(({ data }) => setHandoverReports(data || []))
                    }} 
                  />
                  <button 
                    onClick={() => setShowHandoverForm(false)}
                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', marginTop: 'var(--space-2)' }}
                  >
                    Avbryt
                  </button>
                </div>
              ) : null}

              <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                {handoverReports.length > 0 ? handoverReports.map(report => (
                  <div key={report.id} style={{ padding: 'var(--space-4)', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>
                        {report.reporter_type === 'homeowner' ? 'Utleier' : 'Leietaker'}
                        {report.content?.pdf_url ? ' – PDF lastet opp' : ` – ${report.content?.condition_description || report.content?.general_condition || 'Rapport'}`}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        {report.content?.pdf_url && (
                          <a href={report.content.pdf_url} target="_blank" rel="noopener noreferrer" className="button" style={{ padding: '4px 12px', fontSize: '0.75rem' }}>
                            Se PDF
                          </a>
                        )}
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          {new Date(report.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div style={{ marginTop: 'var(--space-2)', fontSize: '0.9rem', color: '#475569' }}>
                      {report.content?.pdf_url ? null : (report.content?.notes || report.content?.condition_description || 'Ingen kommentarer.')}
                    </div>
                    {isNavView && (
                      <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-2)' }}>
                        <button className="button" style={{ padding: '4px 12px', fontSize: '0.75rem' }}>Godkjenn</button>
                        <button className="button" style={{ padding: '4px 12px', fontSize: '0.75rem', background: '#f1f5f9', color: '#0f172a', border: '1px solid #e2e8f0' }}>Be om endring</button>
                      </div>
                    )}
                  </div>
                )) : (
                  <p className="text-sm italic" style={{ color: '#64748b' }}>Ingen overtakelsesrapporter er registrert ennå.</p>
                )}
              </div>
              
              {isNavView && (
                <div style={{ marginTop: 'var(--space-6)', padding: 'var(--space-4)', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '12px', border: '2px dashed rgba(59, 130, 246, 0.5)' }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569' }}>
                    <strong style={{ color: '#0f172a' }}>Lenke til leietaker:</strong> Send denne lenken til leietaker for nedlasting og opplasting av overtakelsesrapport (PDF) – de trenger ikke logge inn:
                  </p>
                  {tenantReportToken ? (
                    <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', marginTop: 'var(--space-2)', flexWrap: 'wrap' }}>
                      <code style={{ background: '#f1f5f9', color: '#0369a1', padding: '8px 12px', borderRadius: '6px', fontSize: '0.8rem', wordBreak: 'break-all', flex: 1, minWidth: 0, border: '1px solid #e2e8f0' }}>
                        {typeof window !== 'undefined' ? `${window.location.origin}/report/leietaker/${tenantReportToken}` : ''}
                      </code>
                      <button 
                        type="button"
                        onClick={() => {
                          const url = typeof window !== 'undefined' ? `${window.location.origin}/report/leietaker/${tenantReportToken}` : ''
                          navigator.clipboard?.writeText(url).then(() => setCopyFeedback(true))
                          setTimeout(() => setCopyFeedback(false), 2000)
                        }}
                        className="button"
                        style={{ padding: '6px 12px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                      >
                        {copyFeedback ? <CheckCircle2 size={14} /> : <Clipboard size={14} />}
                        {copyFeedback ? ' Kopiert!' : ' Kopier'}
                      </button>
                    </div>
                  ) : (
                    <p style={{ margin: 'var(--space-2) 0 0', fontSize: '0.8rem', color: '#64748b' }}>Lenken genereres når boligen markeres som formidlet.</p>
                  )}
                </div>
              )}
            </section>

            {!isNavView && isOwner && (
              <div style={{ marginTop: 'var(--space-8)', borderTop: '1px solid #e2e8f0', paddingTop: 'var(--space-6)' }}>
                <Link href={`/homeowner/manage`} className="button" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}>
                  <Edit3 size={18} /> Administrer denne boligen
                </Link>
              </div>
            )}
          </section>

          <style jsx>{`
            .editable-h1:hover {
              background: rgba(0,0,0,0.02) !important;
            }
            .editable-h1:focus {
              background: rgba(59, 130, 246, 0.05) !important;
              border-bottom: 2px solid var(--color-sky-blue) !important;
            }
            input:focus, select:focus, textarea:focus {
              background: rgba(59, 130, 246, 0.05) !important;
              outline: none !important;
            }
            input, select, textarea {
              transition: all 0.2s;
              border-radius: 4px;
            }
            input[type="number"]::-webkit-inner-spin-button,
            input[type="number"]::-webkit-outer-spin-button {
              -webkit-appearance: none;
              margin: 0;
            }
          `}</style>

          {/* NAV Worker Notes Section */}
          {isNavView && (
            <section className="card" style={{ padding: 'var(--space-8)', border: '1px solid var(--color-sky-blue)', background: 'rgba(59, 130, 246, 0.03)' }}>
              <h3 style={{ marginBottom: 'var(--space-5)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'white' }}>
                <MessageSquare size={20} className="text-sky-blue" /> Interne NAV-notater
              </h3>
              
              <form onSubmit={handleAddNote} style={{ marginBottom: 'var(--space-6)' }}>
                <div style={{ position: 'relative' }}>
                  <textarea 
                    className="input" 
                    placeholder="Legg til et internt notat om denne boligen eller utleier..."
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    style={{ minHeight: '100px', paddingRight: 'var(--space-10)', color: 'white' }}
                  />
                  <button type="submit" style={{ position: 'absolute', bottom: '15px', right: '15px', background: 'var(--color-royal-blue)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer' }}>
                    <Send size={18} />
                  </button>
                </div>
                <p className="text-sm" style={{ marginTop: 'var(--space-2)', opacity: 0.5 }}>Dette feltet er kun synlig for NAV-ansatte.</p>
              </form>

              <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                {navNotes.length > 0 ? navNotes.map(note => (
                  <div key={note.id} style={{ padding: 'var(--space-4)', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', borderLeft: '4px solid var(--color-sky-blue)' }}>
                    <p style={{ margin: 0, fontSize: '0.95rem', color: 'white' }}>{note.note_text}</p>
                    <div style={{ marginTop: 'var(--space-2)', fontSize: '0.75rem', opacity: 0.5, color: 'white' }}>
                      {new Date(note.created_at).toLocaleString('no-NO')}
                    </div>
                  </div>
                )) : (
                  <p className="text-sm opacity-50 italic">Ingen interne notater ennå.</p>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Right Column */}
        {isNavView && (
          <div style={{ position: 'sticky', top: '20px' }}>
            <div className="card" style={{ padding: 'var(--space-8)', border: '1px solid var(--color-royal-blue)', background: 'var(--color-dark-navy)' }}>
              <div style={{ marginBottom: 'var(--space-6)' }}>
                <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6, marginBottom: '4px', color: 'white' }}>Døgnpris</div>
                <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'white' }}>{listing.price_daily},-</span>
              </div>

              <div style={{ display: 'grid', gap: 'var(--space-3)', marginBottom: 'var(--space-8)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-sm opacity-70" style={{ color: 'white' }}>Ukespris:</span>
                  <span className="text-sm font-bold" style={{ color: 'white' }}>{listing.price_weekly},-</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-sm opacity-70" style={{ color: 'white' }}>Månedsleie (korttid):</span>
                  <span className="text-sm font-bold" style={{ color: 'white' }}>{listing.price_monthly_short},-</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-3)' }}>
                  <span className="text-sm opacity-70" style={{ color: 'white' }}>Langtidsleie (per mnd):</span>
                  <span className="text-sm font-bold" style={{ color: 'white' }}>{listing.price_monthly_long},-</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-sm opacity-70" style={{ color: 'white' }}>Depositum:</span>
                  <span className="text-sm font-bold" style={{ color: 'white' }}>{listing.deposit_amount},-</span>
                </div>
              </div>

              <button className="button" style={{ width: '100%', padding: 'var(--space-4)', fontSize: '1.1rem', marginBottom: 'var(--space-4)' }}>
                Start formidling
              </button>
              <div style={{ textAlign: 'center', fontSize: '0.8rem', opacity: 0.6, color: 'white' }}>
                Avtalehistorikk logges i systemet
              </div>
            </div>

            <div className="card" style={{ marginTop: 'var(--space-6)', padding: 'var(--space-6)', background: 'white' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: '#0f172a' }}>
                <User size={18} /> Utleier
              </h3>
              <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>{listing.owner_name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: '0.9rem', color: '#334155' }}>
                  <Phone size={14} style={{ color: 'var(--color-royal-blue)' }} /> {listing.contact_phone}
                </div>
                <div style={{ marginTop: 'var(--space-2)', padding: 'var(--space-3)', background: '#f0fdfa', borderRadius: '8px', fontSize: '0.75rem', color: '#0d9488', border: '1px solid #ccfbf1' }}>
                  <ShieldCheck size={14} style={{ display: 'inline', marginRight: '6px' }} /> 
                  Vilkår signert: {new Date(listing.last_verified).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
