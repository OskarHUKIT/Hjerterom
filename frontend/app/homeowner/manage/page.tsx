'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Plus, LayoutDashboard, Home as HomeIcon, CheckCircle2, Circle, 
  ArrowRight, Info, Trash2, Edit3, Camera, Clock, FileText, 
  ChevronRight, AlertTriangle, ToggleLeft as ToggleIcon, ShieldCheck, MessageSquare, Search
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatAuditLogDescription } from '../../lib/auditLogFormat'
import { useLanguage } from '../../../context/LanguageContext'

export default function HomeownerManage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [myListings, setMyListings] = useState<any[]>([])
  const [availability, setAvailability] = useState<Record<string, any[]>>({})
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'boliger' | 'historikk'>('boliger')
  const [filter, setFilter] = useState<'Alle' | 'Tilgjengelig' | 'Utilgjengelig' | 'Formidla'>('Alle')
  const [historySearch, setHistorySearch] = useState('')
  const [historyDateFrom, setHistoryDateFrom] = useState('')
  const [historyDateTo, setHistoryDateTo] = useState('')
  const [editingAvailability, setEditingAvailability] = useState<string | null>(null)
  const [newPeriod, setNewPeriod] = useState({ start: '', end: '', status: 'Tilgjengelig' })

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
      }

      // Fetch history
      const { data: historyData, error: historyError } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (historyError) throw historyError
      setHistory(historyData || [])

    } catch (err: any) {
      console.error('Unexpected error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const toggleStatus = async (id: string, currentStatus: string) => {
    if (currentStatus === 'Formidla') {
      alert(t('formidletByKommune'))
      return
    }
    const newStatus = currentStatus === 'Tilgjengelig' ? 'Utilgjengelig' : 'Tilgjengelig'
    
    // 1. Oppdater lokal tilstand umiddelbart (Optimistisk oppdatering)
    setMyListings(prev => prev.map(item => 
      item.id === id ? { ...item, status: newStatus, is_available: newStatus === 'Tilgjengelig' } : item
    ))

    try {
      const { error } = await supabase
        .from('listings')
        .update({ status: newStatus, is_available: newStatus === 'Tilgjengelig' })
        .eq('id', id)

      if (error) throw error

      // 2. Logg handlingen i bakgrunnen uten å trigge full reload
      const { data: { user } } = await supabase.auth.getUser()
      const listing = myListings.find(l => l.id === id)
      await supabase.from('audit_logs').insert([{
        user_id: user?.id,
        action_type: 'STATUS_CHANGE',
        listing_id: id,
        listing_address: listing?.address,
        details: { from: currentStatus, to: newStatus }
      }])
      
      // 3. Oppdater kun historikken i bakgrunnen (valgfritt, men her gjør vi det uten loading-skjerm)
      const { data: historyData } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (historyData) setHistory(historyData)

    } catch (err: any) {
      // Rull tilbake hvis det feiler
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

      const { data: historyData } = await supabase.from('audit_logs').select('*').eq('user_id', user?.id).order('created_at', { ascending: false }).limit(20)
      if (historyData) setHistory(historyData)
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
      
      // Oppdater lokalt uten full reload
      setAvailability(prev => ({
        ...prev,
        [listingId]: [...(prev[listingId] || []), data]
      }))
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

  const filteredListings = myListings.filter(l => {
    if (filter === 'Alle') return true
    return l.status === filter
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
        <aside style={{ display: 'grid', gap: 'var(--space-4)' }}>
          <div className="card" style={{ padding: 'var(--space-2)' }}>
            <button onClick={() => setActiveTab('boliger')} style={{ 
              width: '100%', padding: 'var(--space-3) var(--space-4)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
              background: activeTab === 'boliger' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              color: activeTab === 'boliger' ? 'var(--color-sky-blue)' : 'var(--text-main)',
              border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: 600
            }}>
              <HomeIcon size={18} /> {t('myPropertiesTab')}
            </button>
            <button onClick={() => setActiveTab('historikk')} style={{ 
              width: '100%', padding: 'var(--space-3) var(--space-4)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
              background: activeTab === 'historikk' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              color: activeTab === 'historikk' ? 'var(--color-sky-blue)' : 'var(--text-main)',
              border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: 600
            }}>
              <Clock size={18} /> {t('historyTab')}
            </button>
            <Link href="/homeowner/sign-terms" style={{ 
              width: '100%', padding: 'var(--space-3) var(--space-4)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
              color: 'var(--text-main)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600
            }}>
              <FileText size={18} /> {t('signTermsNav')}
            </Link>
            <Link href="/nav/messages" style={{ 
              width: '100%', padding: 'var(--space-3) var(--space-4)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
              color: 'var(--text-main)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600
            }}>
              <MessageSquare size={18} /> {t('messagesToKommune')}
            </Link>
          </div>
        </aside>

        <div>
          {activeTab === 'boliger' ? (
            <>
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
                      className="card" 
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
                              <span style={{ 
                                fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px',
                                background: listing.status === 'Tilgjengelig' ? 'rgba(32, 187, 175, 0.1)' : 
                                            listing.status === 'Formidla' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                color: listing.status === 'Tilgjengelig' ? 'var(--color-teal)' : 
                                       listing.status === 'Formidla' ? 'var(--color-sky-blue)' : '#ef4444',
                                textTransform: 'uppercase'
                              }}>
                                {listing.status}
                              </span>
                            </div>
                            <p className="text-sm" style={{ marginTop: '4px' }}>{translateType(listing.type)} • {listing.bedrooms} {t('bedroomsUnit')} • {listing.size_sqm} m²</p>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }} onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => toggleStatus(listing.id, listing.status)}
                            className="button" 
                            disabled={listing.status === 'Formidla'}
                            style={{ 
                              padding: 'var(--space-2) var(--space-4)', fontSize: '0.85rem', borderRadius: '8px',
                              background: listing.status === 'Tilgjengelig' ? 'rgba(239, 68, 68, 0.1)' : 
                                          listing.status === 'Formidla' ? 'rgba(255,255,255,0.05)' : 'rgba(32, 187, 175, 0.1)',
                              color: listing.status === 'Tilgjengelig' ? '#ef4444' : 
                                     listing.status === 'Formidla' ? 'var(--text-muted)' : 'var(--color-teal)',
                              border: `1px solid ${listing.status === 'Tilgjengelig' ? 'rgba(239, 68, 68, 0.2)' : 
                                                  listing.status === 'Formidla' ? 'transparent' : 'rgba(32, 187, 175, 0.2)'}`,
                              cursor: listing.status === 'Formidla' ? 'not-allowed' : 'pointer'
                            }}
                          >
                            {listing.status === 'Tilgjengelig' ? t('manageRentalNav') : 
                             listing.status === 'Formidla' ? t('formidlet') : t('markAvailable')}
                          </button>
                          
                          <div style={{ width: '1px', height: '30px', background: 'var(--border-subtle)' }}></div>
                          
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
                              availability[listing.id].map(p => (
                                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem' }}>
                                  <span>{new Date(p.start_date).toLocaleDateString('no-NO')} - {new Date(p.end_date).toLocaleDateString('no-NO')}</span>
                                  <button 
                                    onClick={() => deleteAvailability(p.id, listing.id)}
                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              ))
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
                              <input type="date" className="input" style={{ marginBottom: 0, fontSize: '0.85rem' }} value={newPeriod.start} onChange={e => setNewPeriod({...newPeriod, start: e.target.value})} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label className="label" style={{ fontSize: '0.7rem' }}>{t('toDate')}</label>
                              <input type="date" className="input" style={{ marginBottom: 0, fontSize: '0.85rem' }} value={newPeriod.end} onChange={e => setNewPeriod({...newPeriod, end: e.target.value})} />
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
            </>
          ) : (
            <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
              <h3 style={{ marginBottom: 'var(--space-2)' }}>{t('lastEvents')}</h3>
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
                <div style={{ flex: 1, minWidth: 140, position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                  <input
                    type="text"
                    placeholder={t('searchHistory')}
                    value={historySearch}
                    onChange={e => setHistorySearch(e.target.value)}
                    className="input"
                    style={{ width: '100%', paddingLeft: 36 }}
                  />
                </div>
                <input
                  type="date"
                  value={historyDateFrom}
                  onChange={e => setHistoryDateFrom(e.target.value)}
                  className="input"
                  style={{ minWidth: 140 }}
                />
                <input
                  type="date"
                  value={historyDateTo}
                  onChange={e => setHistoryDateTo(e.target.value)}
                  className="input"
                  style={{ minWidth: 140 }}
                />
              </div>
              {history.length > 0 ? (() => {
                const q = historySearch.trim().toLowerCase()
                const from = historyDateFrom ? new Date(historyDateFrom) : null
                const to = historyDateTo ? new Date(historyDateTo + 'T23:59:59') : null
                const filtered = history.filter(log => {
                  if (q) {
                    const desc = formatAuditLogDescription(log).toLowerCase()
                    const addr = (log.listing_address || '').toLowerCase()
                    const action = (log.action_type || '').toLowerCase()
                    if (!desc.includes(q) && !addr.includes(q) && !action.includes(q)) return false
                  }
                  if (from || to) {
                    const d = new Date(log.created_at)
                    if (from && d < from) return false
                    if (to && d > to) return false
                  }
                  return true
                })
                return filtered.length > 0 ? filtered.map(log => (
                <div key={log.id} className="card" style={{ padding: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)', fontSize: '0.9rem' }}>
                  <div style={{ 
                    width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-sky-blue)' 
                  }}>
                    {log.action_type === 'STATUS_CHANGE' && <ToggleIcon size={18} />}
                    {log.action_type === 'CREATE_LISTING' && <Plus size={18} />}
                    {log.action_type === 'DELETE_LISTING' && <Trash2 size={18} />}
                    {(log.action_type === 'SIGN_TERMS' || log.action_type === 'SIGN_TERMS_BANKID' || log.action_type === 'SIGN_INITIATED' || log.action_type === 'TERMINATE_AGREEMENT') && <ShieldCheck size={18} />}
                    {(log.action_type === 'KOMMUNE_MARK_FORMIDLA' || log.action_type === 'KOMMUNE_REMOVE_FORMIDLA') && <HomeIcon size={18} />}
                    {log.action_type === 'UPDATE_FIELD' && <Edit3 size={18} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{formatAuditLogDescription(log)}</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>{new Date(log.created_at).toLocaleString('no-NO')}</div>
                  </div>
                </div>
              )) : (
                <p style={{ fontSize: '0.9rem', opacity: 0.6 }}>{t('noResults')}</p>
              )
              })() : (
                <div className="card" style={{ textAlign: 'center', padding: 'var(--space-10)' }}>
                  <p>{t('noHistory')}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
