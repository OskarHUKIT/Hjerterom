'use client'

import { use, useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Plus, Home as HomeIcon, Info, Trash2, Edit3, Clock, FileText, 
  ShieldCheck, MessageSquare, Clipboard, CheckCircle2
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useLanguage } from '../../../context/LanguageContext'
import { formatDateNo } from '../../lib/dateFormat'
import { DateInput } from '../../components/DateInput'

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> }

export default function HomeownerManage(props: PageProps) {
  use(props.searchParams ?? Promise.resolve({}))
  const { t } = useLanguage()
  const router = useRouter()
  const [myListings, setMyListings] = useState<any[]>([])
  const [availability, setAvailability] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'Alle' | 'Tilgjengelig' | 'Utilgjengelig' | 'Formidla'>('Alle')
  const [editingAvailability, setEditingAvailability] = useState<string | null>(null)
  const [newPeriod, setNewPeriod] = useState({ start: '', end: '', status: 'Tilgjengelig' })
  const [tenantTokens, setTenantTokens] = useState<Record<string, string>>({})
  const [copyFeedbackListingId, setCopyFeedbackListingId] = useState<string | null>(null)

  const todayStr = () => new Date().toISOString().slice(0, 10)
  const openPeriodCalendar = (listingId: string, status: 'Tilgjengelig' | 'Utilgjengelig') => {
    const t = todayStr()
    setEditingAvailability(listingId)
    setNewPeriod({ start: t, end: t, status })
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Sjekk om brukeren har signert vilkårene
      const { data: agreement } = await supabase
        .from('user_agreements')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_terminated', false)
        .maybeSingle()

      if (!agreement) {
        router.push('/homeowner/sign-terms')
        return
      }

      // Fetch listings
      const { data: listingsData, error: listingsError } = await supabase
        .from('listings')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })

      if (listingsError) throw listingsError
      setMyListings(listingsData || [])

      // Fetch availability for all these listings
      if (listingsData && listingsData.length > 0) {
        const listingIds = listingsData.map(l => l.id)
        const { data: availabilityData } = await supabase
          .from('listing_availability')
          .select('*')
          .in('listing_id', listingIds)
          .order('start_date', { ascending: true })

        const availMap: Record<string, any[]> = {}
        availabilityData?.forEach(item => {
          if (!availMap[item.listing_id]) availMap[item.listing_id] = []
          availMap[item.listing_id].push(item)
        })
        setAvailability(availMap)

        const { data: tokenRows } = await supabase.from('listing_tenant_tokens').select('listing_id, token').in('listing_id', listingIds)
        const tokenMap: Record<string, string> = {}
        tokenRows?.forEach((row: any) => { tokenMap[row.listing_id] = row.token })
        setTenantTokens(tokenMap)
      }

    } catch (err: any) {
      console.error('Unexpected error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const setStatus = async (id: string, newStatus: 'Tilgjengelig' | 'Utilgjengelig') => {
    const listing = myListings.find(l => l.id === id)
    const currentStatus = getEffectiveStatus(listing) ?? listing?.status ?? ''
    if (currentStatus === 'Formidla') {
      alert(t('formidletByKommune'))
      return
    }
    setMyListings(prev => prev.map(item =>
      item.id === id ? { ...item, status: newStatus, is_available: newStatus === 'Tilgjengelig' } : item
    ))
    try {
      const { error } = await supabase
        .from('listings')
        .update({ status: newStatus, is_available: newStatus === 'Tilgjengelig' })
        .eq('id', id)
      if (error) throw error
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('audit_logs').insert([{
        user_id: user?.id,
        action_type: 'STATUS_CHANGE',
        listing_id: id,
        listing_address: listing?.address,
        details: { from: currentStatus, to: newStatus }
      }])
    } catch (err: any) {
      setMyListings(prev => prev.map(item =>
        item.id === id ? { ...item, status: currentStatus, is_available: currentStatus === 'Tilgjengelig' } : item
      ))
      alert('Feil ved oppdatering: ' + err.message)
    }
  }

  const deleteListing = async (id: string, address: string) => {
    if (!confirm(`Dersom du sletter boligen "${address}", vil den ikke lengre være synlig i boligbanken. Ønsker du å fortsette?`)) return

    const prevListings = myListings
    setMyListings(prev => prev.filter(item => item.id !== id))

    try {
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', id)

      if (error) throw error

      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('audit_logs').insert([{
        user_id: user?.id,
        action_type: 'DELETE_LISTING',
        listing_address: address,
        details: { address }
      }])

    } catch (err: any) {
      setMyListings(prevListings)
      alert('Feil ved sletting: ' + err.message)
    }
  }

  const addAvailability = async (listingId: string, startDate: string, endDate: string, status: string = 'Tilgjengelig') => {
    if (!startDate || !endDate) return
    try {
      const { data, error } = await supabase
        .from('listing_availability')
        .insert([{ listing_id: listingId, start_date: startDate, end_date: endDate, status }])
        .select()
        .single()
      
      if (error) throw error
      
      setAvailability(prev => ({
        ...prev,
        [listingId]: [...(prev[listingId] || []), data]
      }))
      if (status === 'Tilgjengelig' || status === 'Utilgjengelig') {
        await supabase.from('listings').update({ status, is_available: status === 'Tilgjengelig' }).eq('id', listingId)
        setMyListings(prev => prev.map(l => l.id === listingId ? { ...l, status, is_available: status === 'Tilgjengelig' } : l))
      }
    } catch (err: any) {
      alert('Feil ved lagring av periode: ' + err.message)
    }
  }

  const deleteAvailability = async (id: string, listingId: string) => {
    try {
      const { error } = await supabase
        .from('listing_availability')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      // Oppdater lokalt uten full reload
      setAvailability(prev => ({
        ...prev,
        [listingId]: prev[listingId].filter(p => p.id !== id)
      }))
    } catch (err: any) {
      alert('Feil ved sletting av periode: ' + err.message)
    }
  }

  // Formidla and Tilgjengelig are mutually exclusive: use availability periods as source of truth. Null = umarkert (ingen status).
  const getEffectiveStatus = (listing: any): 'Formidla' | 'Tilgjengelig' | 'Utilgjengelig' | null => {
    const periods = availability[listing.id] || []
    if (periods.some((p: any) => p.status === 'Formidla')) return 'Formidla'
    const s = listing.status
    if (s === 'Tilgjengelig' || s === 'Utilgjengelig') return s
    return null
  }

  const filteredListings = myListings.filter(l => {
    if (filter === 'Alle') return true
    return getEffectiveStatus(l) === filter
  })

  const translateType = (type: string) => {
    if (!type) return ''
    const mapping: Record<string, string> = {
      'Short-term': t('shortTerm'),
      'Long-term': t('longTerm'),
      'Apartment': t('apartment'),
      'House': t('house'),
      'Shared': t('shared')
    }
    return mapping[type] || type
  }

  return (
    <main className="container">
      <div className="hm-header-row" style={{ marginBottom: 'var(--space-8)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <Link href="/" className="nav-link" style={{ marginLeft: '-1rem', marginBottom: 'var(--space-2)', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            ← {t('backToFrontPage')}
          </Link>
          <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2.75rem)' }}>{t('welcomeBackManage')}</h1>
          <p style={{ fontSize: '1.125rem', opacity: 0.8 }}>{t('manageDescHomeowner')}</p>
        </div>
        <Link href="/homeowner/register" className="button" style={{ padding: 'var(--space-4) var(--space-8)', borderRadius: '14px', fontSize: '1.1rem', whiteSpace: 'nowrap' }}>
          <Plus size={22} /> <span className="hm-btn-label">{t('registerNewProperty')}</span>
        </Link>
      </div>

      <div className="hm-layout" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 'var(--space-8)', alignItems: 'start' }}>
        <aside className="hm-sidebar" style={{ display: 'grid', gap: 'var(--space-4)' }}>
          <div className="card hm-nav-card" style={{ padding: 'var(--space-2)' }}>
            <div style={{ 
              width: '100%', padding: 'var(--space-3) var(--space-4)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
              background: 'rgba(59, 130, 246, 0.1)',
              color: 'var(--color-sky-blue)',
              fontSize: '0.9rem', fontWeight: 600
            }}>
              <HomeIcon size={18} />
              <span className="hm-nav-label-long">{t('myPropertiesTab')}</span>
              <span className="hm-nav-label-short">{t('myPropertiesTabShort')}</span>
            </div>
            <Link href="/homeowner/sign-terms" style={{ 
              width: '100%', padding: 'var(--space-3) var(--space-4)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
              color: 'var(--text-main)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600
            }}>
              <FileText size={18} />
              <span className="hm-nav-label-long">{t('signTermsNav')}</span>
              <span className="hm-nav-label-short">{t('signTermsNavShort')}</span>
            </Link>
            <Link href="/nav/messages" style={{ 
              width: '100%', padding: 'var(--space-3) var(--space-4)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
              color: 'var(--text-main)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600
            }}>
              <MessageSquare size={18} />
              <span className="hm-nav-label-long">{t('messagesToKommune')}</span>
              <span className="hm-nav-label-short">{t('messagesToKommuneShort')}</span>
            </Link>
          </div>
        </aside>

        <div>
              <div className="hm-filters-row" style={{ marginBottom: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                  {(['Alle', 'Tilgjengelig', 'Utilgjengelig', 'Formidla'] as const).map(f => (
                    <button key={f} onClick={() => setFilter(f)} style={{
                      padding: 'var(--space-2) var(--space-4)', borderRadius: '20px', fontSize: '0.85rem', cursor: 'pointer',
                      background: filter === f ? 'var(--color-royal-blue)' : 'var(--bg-app)',
                      border: '1px solid var(--border-subtle)', color: filter === f ? 'white' : 'var(--text-main)'
                    }}>{f === 'Alle' ? t('all') : f === 'Formidla' ? t('formidlet') : f === 'Tilgjengelig' ? t('available') : t('unavailable')}</button>
                  ))}
                </div>
                <div style={{ fontSize: '0.85rem', opacity: 0.6 }}>{t('showing')} {filteredListings.length} {t('propertiesPlural')}</div>
              </div>

              <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                {loading ? (
                  <div className="card" style={{ padding: 'var(--space-10)', minHeight: '120px' }} />
                ) : filteredListings.length > 0 ? (
                  filteredListings.map((listing) => (
                    <div 
                      key={listing.id} 
                      className="card hm-listing-card" 
                      onClick={() => router.push(`/listings/${listing.id}?view=owner`)}
                      style={{ 
                        padding: 'var(--space-4) var(--space-6)', 
                        display: 'flex', 
                        flexDirection: 'column',
                        gap: 'var(--space-4)', 
                        cursor: 'pointer'
                      }}
                    >
                      <div className="hm-listing-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
                        <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center', flex: '1 1 200px', minWidth: 0 }}>
                          <div style={{ 
                            width: '100px', height: '70px', borderRadius: '10px', overflow: 'hidden', background: 'var(--bg-app)',
                            border: '1px solid var(--border-subtle)'
                          }}>
                            {listing.image_url ? (
                              <img src={listing.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-sky-blue)', opacity: 0.3 }}>
                                <HomeIcon size={30} />
                              </div>
                            )}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                              <h3 style={{ margin: 0 }}>{listing.address}</h3>
                              {getEffectiveStatus(listing) === 'Formidla' && (
                                <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-sky-blue)', textTransform: 'uppercase' }}>
                                  {getEffectiveStatus(listing)}
                                </span>
                              )}
                            </div>
                            <p className="text-sm" style={{ marginTop: '4px' }}>{translateType(listing.type)} • {listing.bedrooms} {t('bedroomsUnit')} • {listing.size_sqm} m²</p>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }} onClick={(e) => e.stopPropagation()}>
                          {getEffectiveStatus(listing) !== 'Formidla' && (
                            <>
                              <div className="hm-status-actions" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', minWidth: '200px' }}>
                                {getEffectiveStatus(listing) === 'Tilgjengelig' ? (
                                  <button type="button" onClick={() => openPeriodCalendar(listing.id, 'Utilgjengelig')} className="button" style={{ padding: 'var(--space-2) var(--space-4)', fontSize: '0.85rem', borderRadius: '8px', width: '100%', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.25)', cursor: 'pointer' }}>
                                    {t('manageRentalNav')}
                                  </button>
                                ) : getEffectiveStatus(listing) === 'Utilgjengelig' ? (
                                  <button type="button" onClick={() => openPeriodCalendar(listing.id, 'Tilgjengelig')} className="button" style={{ padding: 'var(--space-2) var(--space-4)', fontSize: '0.85rem', borderRadius: '8px', width: '100%', background: 'rgba(32, 187, 175, 0.12)', color: 'var(--color-teal)', border: '1px solid rgba(32, 187, 175, 0.25)', cursor: 'pointer' }}>
                                    {t('markAvailable')}
                                  </button>
                                ) : (
                                  <>
                                    <button type="button" onClick={() => openPeriodCalendar(listing.id, 'Utilgjengelig')} className="button" style={{ padding: 'var(--space-2) var(--space-4)', fontSize: '0.85rem', borderRadius: '8px', width: '100%', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.25)', cursor: 'pointer' }}>
                                      {t('manageRentalNav')}
                                    </button>
                                    <button type="button" onClick={() => openPeriodCalendar(listing.id, 'Tilgjengelig')} className="button" style={{ padding: 'var(--space-2) var(--space-4)', fontSize: '0.85rem', borderRadius: '8px', width: '100%', background: 'rgba(32, 187, 175, 0.12)', color: 'var(--color-teal)', border: '1px solid rgba(32, 187, 175, 0.25)', cursor: 'pointer' }}>
                                      {t('markAvailable')}
                                    </button>
                                  </>
                                )}
                              </div>
                              <div style={{ width: '1px', height: '32px', background: 'var(--border-subtle)', alignSelf: 'stretch' }} />
                            </>
                          )}
                          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                            <button 
                              onClick={() => {
                                setEditingAvailability(editingAvailability === listing.id ? null : listing.id)
                                setNewPeriod({ start: '', end: '', status: 'Tilgjengelig' })
                              }}
                              style={{ padding: '8px', borderRadius: '8px', background: editingAvailability === listing.id ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-app)', border: 'none', cursor: 'pointer', color: editingAvailability === listing.id ? 'var(--color-accent)' : 'var(--text-main)' }}
                              title={t('managePeriods')}
                            >
                              <Clock size={18} />
                            </button>
                            <button style={{ padding: '8px', borderRadius: '8px', background: 'var(--bg-app)', border: 'none', cursor: 'pointer', color: 'var(--text-main)' }}>
                              <Edit3 size={18} />
                            </button>
                            <button 
                              onClick={() => deleteListing(listing.id, listing.address)}
                              style={{ padding: '8px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.05)', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {getEffectiveStatus(listing) === 'Formidla' && (
                        <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                          <div style={{ padding: 'var(--space-4)', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
                            <p style={{ margin: '0 0 var(--space-3)', fontSize: '0.85rem', opacity: 0.9 }}>{t('formidletActionsDesc')}</p>
                            <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                              <Link href={`/listings/${listing.id}?view=owner#kontaktinfo`} className="button" style={{ padding: 'var(--space-2) var(--space-4)', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', textDecoration: 'none' }}>
                                <FileText size={16} /> {t('contactInfoForm')}
                              </Link>
                              <Link href={`/report/utleier/${listing.id}`} className="button" style={{ padding: 'var(--space-2) var(--space-4)', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', textDecoration: 'none', background: 'var(--color-teal)', color: 'white', border: 'none' }}>
                                <FileText size={16} /> {t('fillHandoverReport')}
                              </Link>
                            </div>
                          </div>
                          <div style={{ padding: 'var(--space-4)', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '12px', border: '2px dashed rgba(59, 130, 246, 0.5)' }}>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-body)' }}><strong style={{ color: 'var(--text-main)' }}>Lenke til leietaker:</strong> Send denne lenken til leietaker for nedlasting og opplasting av overtakelsesrapport (PDF) – de trenger ikke logge inn.</p>
                            {tenantTokens[listing.id] ? (
                              <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', marginTop: 'var(--space-2)', flexWrap: 'wrap' }}>
                                <code style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '0.8rem', wordBreak: 'break-all', flex: 1, minWidth: 0, background: 'var(--bg-app)', border: '1px solid var(--border-subtle)' }}>{typeof window !== 'undefined' ? `${window.location.origin}/report/leietaker/${tenantTokens[listing.id]}` : ''}</code>
                                <button type="button" onClick={(e) => { e.stopPropagation(); const url = typeof window !== 'undefined' ? `${window.location.origin}/report/leietaker/${tenantTokens[listing.id]}` : ''; navigator.clipboard?.writeText(url).then(() => { setCopyFeedbackListingId(listing.id); setTimeout(() => setCopyFeedbackListingId(null), 2000) }) }} className="button" style={{ padding: '6px 12px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{copyFeedbackListingId === listing.id ? <CheckCircle2 size={14} /> : <Clipboard size={14} />}{copyFeedbackListingId === listing.id ? ' Kopiert!' : ' Kopier'}</button>
                              </div>
                            ) : <p style={{ margin: 'var(--space-2) 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Lenken genereres når boligen markeres som formidlet.</p>}
                          </div>
                        </div>
                      )}

                      {editingAvailability === listing.id && (
                        <div 
                          onClick={(e) => e.stopPropagation()} 
                          style={{ 
                            padding: 'var(--space-4)', 
                            background: 'rgba(59, 130, 246, 0.05)', 
                            borderRadius: '12px',
                            border: '1px solid rgba(59, 130, 246, 0.1)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                            <h4 style={{ margin: 0, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Clock size={16} /> {t('availablePeriods')}
                            </h4>
                            <button 
                              onClick={() => setEditingAvailability(null)}
                              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                            >
                              {t('close')}
                            </button>
                          </div>

                          <div style={{ display: 'grid', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                            {(availability[listing.id] || []).length > 0 ? (
                              availability[listing.id].map(p => {
                                const statusLabel = p.status === 'Formidla' ? t('formidlet') : p.status === 'Utilgjengelig' ? t('unavailable') : t('available')
                                const statusStyle = p.status === 'Formidla'
                                  ? { background: 'rgba(59, 130, 246, 0.2)', color: 'var(--color-royal-blue)', border: '1px solid rgba(59, 130, 246, 0.4)' }
                                  : p.status === 'Utilgjengelig'
                                  ? { background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }
                                  : { background: 'rgba(45, 212, 191, 0.15)', color: 'var(--color-teal)', border: '1px solid rgba(45, 212, 191, 0.3)' }
                                return (
                                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-2)', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem', flexWrap: 'wrap' }}>
                                    <span style={{ color: 'var(--text-main)' }}>{formatDateNo(p.start_date)} – {formatDateNo(p.end_date)}</span>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: '6px', ...statusStyle }}>
                                      {statusLabel}
                                    </span>
                                    <button 
                                      onClick={() => deleteAvailability(p.id, listing.id)}
                                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', marginLeft: 'auto' }}
                                      title="Slett periode"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                )
                              })
                            ) : (
                              <p style={{ fontSize: '0.85rem', opacity: 0.5, margin: 'var(--space-2) 0' }}>{t('noPeriods')}</p>
                            )}
                          </div>

                          <div className="hm-add-period-row" style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1 }}>
                                <label className="label" style={{ fontSize: '0.7rem' }}>{t('status')}</label>
                                <select className="input" style={{ marginBottom: 0, fontSize: '0.85rem' }} value={newPeriod.status} onChange={e => setNewPeriod({...newPeriod, status: e.target.value})}>
                                  <option value="Tilgjengelig">{t('available')}</option>
                                  <option value="Utilgjengelig">{t('unavailable')}</option>
                                </select>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label className="label" style={{ fontSize: '0.7rem' }}>{t('fromDate')}</label>
                              <DateInput className="input" style={{ marginBottom: 0, fontSize: '0.85rem' }} value={newPeriod.start} onChange={v => setNewPeriod({...newPeriod, start: v})} placeholder="DD.MM.ÅÅÅÅ" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label className="label" style={{ fontSize: '0.7rem' }}>{t('toDate')}</label>
                              <DateInput className="input" style={{ marginBottom: 0, fontSize: '0.85rem' }} value={newPeriod.end} onChange={v => setNewPeriod({...newPeriod, end: v})} placeholder="DD.MM.ÅÅÅÅ" />
                            </div>
                            <button 
                              onClick={() => {
                                addAvailability(listing.id, newPeriod.start, newPeriod.end, newPeriod.status)
                                setNewPeriod({ start: '', end: '', status: 'Tilgjengelig' })
                              }}
                              className="button" 
                              style={{ padding: '10px 16px', borderRadius: '8px' }}
                            >
                              {t('add')}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="card" style={{ textAlign: 'center', padding: 'var(--space-10)' }}>
                    <Info size={40} style={{ margin: '0 auto var(--space-3)', opacity: 0.3 }} />
                    <p>{t('noProperties')}</p>
                  </div>
                )}
              </div>
        </div>
      </div>
    </main>
  )
}
