'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { 
  Search, Filter, MapPin, Users, Info, ChevronRight, Home as HomeIcon, 
  ShieldCheck, Loader2, ArrowUpDown, LayoutList, Map as MapIcon,
  CheckCircle2, XCircle, AlertCircle, Phone, User, Building, Tag,
  Ruler, Eye, Calendar, Settings
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

// Dynamically import Map component to avoid SSR issues
const MapView = dynamic(() => import('../../components/MapView'), { 
  ssr: false,
  loading: () => <div className="card" style={{ height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 className="animate-spin" /></div>
})

export default function NavDatabase() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [listings, setListings] = useState<any[]>([])
  const [availability, setAvailability] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'Ledig' | 'Utleid' | 'Utløpte'>('Ledig')
  const [viewMode, setViewMode] = useState<'table' | 'map' | 'timeline'>('timeline')
  const [sortField, setSortField] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showFilters, setShowFilters] = useState(false)
  const [showColumnSettings, setShowColumnSettings] = useState(false)
  const [timelineOffset, setTimelineOffset] = useState(0)
  
  const [visibleColumns, setVisibleColumns] = useState(['address', 'city', 'owner_name', 'price_daily'])

  const ALL_COLUMNS = [
    { id: 'address', label: 'Adresse' },
    { id: 'city', label: 'By' },
    { id: 'owner_name', label: 'Eier' },
    { id: 'price_daily', label: 'Pris' },
    { id: 'type', label: 'Type' },
    { id: 'bedrooms', label: 'Soverom' },
    { id: 'size_sqm', label: 'Areal' },
    { id: 'max_occupants', label: 'Maks personer' },
    { id: 'floor_number', label: 'Etasje' },
  ]

  const toggleColumn = (id: string) => {
    if (visibleColumns.includes(id)) {
      if (visibleColumns.length > 1) {
        setVisibleColumns(visibleColumns.filter(c => c !== id))
      }
    } else {
      setVisibleColumns([...visibleColumns, id])
    }
  }

  const translateValue = (id: string, val: any) => {
    if (!val) return '-'
    if (id === 'price_daily') return `${val},-`
    if (id === 'type') {
      const mapping: Record<string, string> = {
        'Short-term': 'Korttid',
        'Long-term': 'Langtid',
        'Apartment': 'Leilighet',
        'House': 'Enebolig',
        'Shared': 'Bofelleskap'
      }
      return mapping[val] || val
    }
    return val
  }

  // Filters
  const [filters, setFilters] = useState({
    city: 'Alle',
    type: 'Alle',
    minPrice: '',
    maxPrice: '',
    accessibility: [] as string[],
    minBedrooms: '',
    minSize: '',
    minOccupants: '',
    floor: 'Alle',
    furnishing: 'Alle'
  })
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  const fetchListings = async () => {
    setLoading(true)
    try {
      let query = supabase.from('listings').select('*')

      if (viewMode === 'timeline') {
        // I tidslinjevisning henter vi alle aktive boliger uavhengig av status,
        // fordi en utleid bolig kan ha ledige perioder i fremtiden.
        const { data: activeUsers } = await supabase
          .from('user_agreements')
          .select('user_id')
          .eq('is_terminated', false)
        
        const userIds = activeUsers?.map(u => u.user_id) || []
        query = query.in('owner_id', userIds)
      } else if (activeTab === 'Utløpte') {
        const { data: terminatedUsers } = await supabase
          .from('user_agreements')
          .select('user_id')
          .eq('is_terminated', true)
        
        const userIds = terminatedUsers?.map(u => u.user_id) || []
        query = query.in('owner_id', userIds)
      } else {
        query = query.eq('status', activeTab)
        const { data: activeUsers } = await supabase
          .from('user_agreements')
          .select('user_id')
          .eq('is_terminated', false)
        
        const userIds = activeUsers?.map(u => u.user_id) || []
        query = query.in('owner_id', userIds)
      }

      const { data, error } = await query

      if (error) throw error
      let filtered = data || []

      if (searchTerm) {
        filtered = filtered.filter(item => 
          item.address.toLowerCase().includes(searchTerm.toLowerCase()) || 
          item.owner_name?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      }
      if (filters.city !== 'Alle') {
        filtered = filtered.filter(item => item.city === filters.city)
      }
      if (filters.type !== 'Alle') {
        filtered = filtered.filter(item => item.type === filters.type)
      }
      if (filters.minPrice) {
        filtered = filtered.filter(item => item.price_daily >= parseFloat(filters.minPrice))
      }
      if (filters.maxPrice) {
        filtered = filtered.filter(item => item.price_daily <= parseFloat(filters.maxPrice))
      }
      if (filters.minBedrooms) {
        filtered = filtered.filter(item => item.bedrooms >= parseInt(filters.minBedrooms))
      }
      if (filters.minSize) {
        filtered = filtered.filter(item => item.size_sqm >= parseFloat(filters.minSize))
      }
      if (filters.minOccupants) {
        filtered = filtered.filter(item => item.max_occupants >= parseInt(filters.minOccupants))
      }
      if (filters.floor !== 'Alle') {
        filtered = filtered.filter(item => item.floor_number === filters.floor)
      }
      if (filters.furnishing !== 'Alle') {
        filtered = filtered.filter(item => item.furnishing === filters.furnishing)
      }
      if (filters.accessibility.length > 0) {
        filtered = filtered.filter(item => 
          filters.accessibility.every(a => item.accessibility?.includes(a))
        )
      }

      filtered.sort((a, b) => {
        const valA = a[sortField]
        const valB = b[sortField]
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1
        return 0
      })

      setListings(filtered)

      // Fetch availability periods for the filtered listings
      if (filtered.length > 0) {
        const listingIds = filtered.map(l => l.id)
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
    } catch (err: any) {
      console.error('Error fetching listings:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchListings()
  }, [activeTab, searchTerm, filters, sortField, sortOrder, viewMode])

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const handleMarkAsUtleid = async (id: string, address: string) => {
    if (!confirm(`Vil du markere "${address}" som utleid? Utleier vil få varsel.`)) return
    
    try {
      const { error } = await supabase
        .from('listings')
        .update({ status: 'Utleid', is_available: false })
        .eq('id', id)
      
      if (error) throw error
      
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('audit_logs').insert([{
        user_id: user?.id,
        action_type: 'NAV_MARK_UTLEID',
        listing_address: address,
        details: { by: 'NAV Worker' }
      }])

      fetchListings()
    } catch (err: any) {
      alert('Feil: ' + err.message)
    }
  }

  return (
    <main className="container">
      <div style={{ marginBottom: 'var(--space-8)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <Link href="/" className="nav-link" style={{ marginLeft: '-1rem', marginBottom: 'var(--space-2)', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            ← Oversikt
          </Link>
          <h1 style={{ fontSize: '2.75rem' }}>Boligbanken</h1>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button onClick={() => setViewMode('table')} style={{ 
            padding: 'var(--space-3)', borderRadius: '10px', background: viewMode === 'table' ? 'var(--color-royal-blue)' : 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border-subtle)', cursor: 'pointer', color: 'white'
          }} title="Tabellvisning"><LayoutList size={20} /></button>
          <button onClick={() => setViewMode('map')} style={{ 
            padding: 'var(--space-3)', borderRadius: '10px', background: viewMode === 'map' ? 'var(--color-royal-blue)' : 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border-subtle)', cursor: 'pointer', color: 'white'
          }} title="Kartvisning"><MapPin size={20} /></button>
          <button onClick={() => setViewMode('timeline')} style={{ 
            padding: 'var(--space-3)', borderRadius: '10px', background: viewMode === 'timeline' ? 'var(--color-royal-blue)' : 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border-subtle)', cursor: 'pointer', color: 'white'
          }} title="Tidslinje"><Calendar size={20} /></button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-6)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 'var(--space-1)', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
          {viewMode !== 'timeline' ? (
            (['Ledig', 'Utleid', 'Utløpte'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                padding: 'var(--space-3) var(--space-6)', fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
                background: 'none', border: 'none', color: activeTab === tab ? 'var(--color-sky-blue)' : 'var(--text-muted)',
                borderBottom: activeTab === tab ? '2px solid var(--color-sky-blue)' : '2px solid transparent',
                transition: 'all 0.2s'
              }}>
                {tab === 'Ledig' && <CheckCircle2 size={16} style={{ display: 'inline', marginRight: '8px' }} />}
                {tab === 'Utleid' && <XCircle size={16} style={{ display: 'inline', marginRight: '8px' }} />}
                {tab === 'Utløpte' && <AlertCircle size={16} style={{ display: 'inline', marginRight: '8px' }} />}
                {tab}
              </button>
            ))
          ) : (
            <div style={{ padding: 'var(--space-3) 0', color: 'var(--color-sky-blue)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} /> Tilgjengelighetskalender
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button 
            onClick={() => {
              setShowColumnSettings(!showColumnSettings)
              setShowFilters(false)
            }}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px',
              background: showColumnSettings ? 'var(--color-royal-blue)' : 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border-subtle)', color: 'white', cursor: 'pointer', fontWeight: 600
            }}
          >
            <Settings size={18} /> Tilpass kolonner
          </button>
          <button 
            onClick={() => {
              setShowFilters(!showFilters)
              setShowColumnSettings(false)
            }}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px',
              background: showFilters ? 'var(--color-royal-blue)' : 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border-subtle)', color: 'white', cursor: 'pointer', fontWeight: 600
            }}
          >
            <Filter size={18} /> {showFilters ? 'Lukk filter' : 'Filtrer resultater'}
          </button>
        </div>
      </div>

      {showColumnSettings && (
        <div className="card" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-8)', background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(10px)' }}>
          <h3 style={{ marginBottom: 'var(--space-4)', fontSize: '1.1rem' }}>Velg informasjon som skal vises i tabellen</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 'var(--space-3)' }}>
            {ALL_COLUMNS.map(col => (
              <label key={col.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)' }}>
                <input 
                  type="checkbox" 
                  checked={visibleColumns.includes(col.id)} 
                  onChange={() => toggleColumn(col.id)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--color-royal-blue)' }}
                />
                <span style={{ fontSize: '0.9rem' }}>{col.label}</span>
              </label>
            ))}
          </div>
          <div style={{ marginTop: 'var(--space-6)', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowColumnSettings(false)} className="button" style={{ padding: '8px 24px' }}>Ferdig</button>
          </div>
        </div>
      )}

      {showFilters && (
        <div className="card" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-8)', background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(10px)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-6)' }}>
            <div>
              <label className="label">Søk</label>
              <div style={{ position: 'relative' }}>
                <input type="text" className="input" placeholder="Adresse / eier..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ paddingLeft: '2.5rem' }} />
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '14px', opacity: 0.5 }} />
              </div>
            </div>
            <div>
              <label className="label">Region</label>
              <select className="input" value={filters.city} onChange={e => setFilters({...filters, city: e.target.value})}>
                <option>Alle</option>
                <option>Narvik</option>
                <option>Gratangen</option>
                <option>Evenes</option>
                <option>Oslo</option>
                <option>Bergen</option>
                <option>Trondheim</option>
                <option>Stavanger</option>
              </select>
            </div>
            <div>
              <label className="label">Boligtype</label>
              <select className="input" value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})}>
                <option>Alle</option>
                <option>Enebolig/flermannsbolig</option>
                <option>Leilighet</option>
                <option>Hybelleilighet</option>
                <option>Hybel</option>
                <option>Bokollektiv</option>
              </select>
            </div>
            <div>
              <label className="label">Prisklasse (Døgn)</label>
              <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                <input type="number" className="input" placeholder="Fra" value={filters.minPrice} onChange={e => setFilters({...filters, minPrice: e.target.value})} style={{ marginBottom: 0 }} />
                <input type="number" className="input" placeholder="Til" value={filters.maxPrice} onChange={e => setFilters({...filters, maxPrice: e.target.value})} style={{ marginBottom: 0 }} />
              </div>
            </div>
          </div>

          <div style={{ marginTop: 'var(--space-6)', paddingTop: 'var(--space-6)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <button 
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              style={{ background: 'none', border: 'none', color: 'var(--color-sky-blue)', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}
            >
              {showAdvancedFilters ? 'Skjul avanserte filter' : 'Vis flere filter (Soverom, Areal, Tilgjengelighet...)'}
              <ChevronRight size={16} style={{ transform: showAdvancedFilters ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>

            {showAdvancedFilters && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-6)', marginTop: 'var(--space-6)' }}>
                <div>
                  <label className="label">Min. antall soverom</label>
                  <input type="number" className="input" placeholder="F.eks. 2" value={filters.minBedrooms} onChange={e => setFilters({...filters, minBedrooms: e.target.value})} />
                </div>
                <div>
                  <label className="label">Min. areal (m²)</label>
                  <input type="number" className="input" placeholder="F.eks. 50" value={filters.minSize} onChange={e => setFilters({...filters, minSize: e.target.value})} />
                </div>
                <div>
                  <label className="label">Min. antall personer</label>
                  <input type="number" className="input" placeholder="F.eks. 3" value={filters.minOccupants} onChange={e => setFilters({...filters, minOccupants: e.target.value})} />
                </div>
                <div>
                  <label className="label">Møblering</label>
                  <select className="input" value={filters.furnishing} onChange={e => setFilters({...filters, furnishing: e.target.value})}>
                    <option>Alle</option>
                    <option>Umøblert</option>
                    <option>Kun hvitevarer</option>
                    <option>Fullt møblert</option>
                    <option>Fullt møblert med inventar på kjøkken og bad</option>
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="label">Fysisk tilrettelegging</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {[
                      'Alt på ett plan', 
                      'Heis i bygget', 
                      'Terskelfritt', 
                      'Universell utforming', 
                      'Omsorgsboligstandard'
                    ].map(acc => (
                      <button 
                        key={acc}
                        onClick={() => {
                          const newAcc = filters.accessibility.includes(acc)
                            ? filters.accessibility.filter(a => a !== acc)
                            : [...filters.accessibility, acc]
                          setFilters({...filters, accessibility: newAcc})
                        }}
                        style={{
                          padding: '6px 12px', borderRadius: '20px', fontSize: '0.75rem', cursor: 'pointer',
                          background: filters.accessibility.includes(acc) ? 'var(--color-royal-blue)' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${filters.accessibility.includes(acc) ? 'var(--color-royal-blue)' : 'var(--border-subtle)'}`,
                          color: 'white'
                        }}
                      >
                        {acc}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 'var(--space-6)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-4)' }}>
            <button onClick={() => {
              setSearchTerm('')
              setFilters({ 
                city: 'Alle', 
                type: 'Alle', 
                minPrice: '', 
                maxPrice: '', 
                accessibility: [], 
                minBedrooms: '', 
                minSize: '', 
                minOccupants: '', 
                floor: 'Alle',
                furnishing: 'Alle'
              })
            }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>Nullstill alle filter</button>
            <button onClick={() => setShowFilters(false)} className="button" style={{ padding: '8px 24px' }}>Ferdig</button>
          </div>
        </div>
      )}

      <div>
        {loading ? (
          <div className="card" style={{ textAlign: 'center', padding: 'var(--space-10)' }}>
            <Loader2 className="animate-spin" size={48} style={{ margin: '0 auto', color: 'var(--color-royal-blue)' }} />
            <p style={{ marginTop: 'var(--space-4)' }}>Henter data...</p>
          </div>
        ) : listings.length > 0 ? (
          viewMode === 'table' ? (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(59, 130, 246, 0.1)', textAlign: 'left' }}>
                    {ALL_COLUMNS.filter(col => visibleColumns.includes(col.id)).map(col => (
                      <th 
                        key={col.id}
                        style={{ padding: 'var(--space-4)', cursor: 'pointer' }} 
                        onClick={() => toggleSort(col.id)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                          {col.label} <ArrowUpDown size={14} style={{ flexShrink: 0 }} />
                        </div>
                      </th>
                    ))}
                    <th style={{ padding: 'var(--space-4)' }}>Handling</th>
                  </tr>
                </thead>
                <tbody>
                    {listings.map((l, i) => (
                    <tr 
                      key={l.id} 
                      onClick={() => router.push(`/listings/${l.id}?view=nav`)}
                      style={{ 
                        borderTop: '1px solid var(--border-subtle)', 
                        background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'}
                    >
                      {ALL_COLUMNS.filter(col => visibleColumns.includes(col.id)).map(col => (
                        <td key={col.id} style={{ padding: 'var(--space-4)' }}>
                          {translateValue(col.id, l[col.id])}
                        </td>
                      ))}
                      <td style={{ padding: 'var(--space-4)' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                          <Link href={`/listings/${l.id}?view=nav`} style={{ padding: '6px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '6px', color: 'var(--color-sky-blue)' }}>
                            <Eye size={16} />
                          </Link>
                          {activeTab === 'Ledig' && (
                            <button onClick={() => handleMarkAsUtleid(l.id, l.address)} style={{ padding: '6px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px', color: '#ef4444', border: 'none', cursor: 'pointer' }}>
                              <XCircle size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : viewMode === 'map' ? (
            <MapView listings={listings} />
          ) : (
            <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
              <div className="card" style={{ padding: 'var(--space-6)', overflowX: 'auto' }}>
                <div style={{ minWidth: '800px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 'var(--space-4)', borderBottom: '1px solid var(--border-subtle)' }}>
                    {/* Rad 1: Måneder og År */}
                    <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ width: '200px' }}></div>
                      <div style={{ flex: 1, display: 'flex' }}>
                        {Array.from({ length: 60 }).map((_, i) => {
                          const d = new Date();
                          d.setDate(d.getDate() + i + timelineOffset);
                          const isFirstOfMonth = d.getDate() === 1;
                          const isJan1st = d.getMonth() === 0 && d.getDate() === 1;
                          
                          if (isFirstOfMonth || i === 0) {
                            // Finn ut hvor mange dager denne måneden har igjen i visningen
                            let daysInView = 0;
                            for (let j = i; j < 60; j++) {
                              const nextD = new Date();
                              nextD.setDate(nextD.getDate() + j + timelineOffset);
                              if (nextD.getDate() === 1 && j !== i) break;
                              daysInView++;
                            }

                            return (
                              <div key={i} style={{ 
                                flex: daysInView,
                                borderLeft: '2px solid var(--color-sky-blue)',
                                padding: '4px 8px',
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                color: 'var(--color-sky-blue)',
                                whiteSpace: 'nowrap'
                              }}>
                                {d.toLocaleDateString('no-NO', { month: 'long', year: isJan1st || i === 0 ? 'numeric' : undefined })}
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    </div>
                    {/* Rad 2: Uker og dager */}
                    <div style={{ display: 'flex' }}>
                      <div style={{ width: '200px', fontWeight: 700, fontSize: '0.75rem', opacity: 0.5, display: 'flex', alignItems: 'center', paddingLeft: '8px' }}>BOLIG</div>
                      <div style={{ flex: 1, display: 'flex' }}>
                        {Array.from({ length: 60 }).map((_, i) => {
                          const d = new Date();
                          d.setDate(d.getDate() + i + timelineOffset);
                          const isMonday = d.getDay() === 1;
                          
                          // Beregn ukenummer
                          const getWeek = (date: Date) => {
                            const tempDate = new Date(date.getTime());
                            tempDate.setHours(0, 0, 0, 0);
                            tempDate.setDate(tempDate.getDate() + 3 - (tempDate.getDay() + 6) % 7);
                            const week1 = new Date(tempDate.getFullYear(), 0, 4);
                            return 1 + Math.round(((tempDate.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
                          };

                          return (
                            <div key={i} style={{ 
                              flex: 1, 
                              textAlign: 'center', 
                              fontSize: '0.55rem', 
                              borderLeft: isMonday ? '1px solid rgba(59, 130, 246, 0.3)' : 'none',
                              padding: '4px 0',
                              opacity: isMonday ? 1 : 0.4
                            }}>
                              <div style={{ fontSize: '0.45rem', fontWeight: 600, visibility: isMonday ? 'visible' : 'hidden' }}>U{getWeek(d)}</div>
                              <span className={isMonday ? '' : 'timeline-date-optional'}>{d.getDate()}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gap: '2px' }}>
                    {listings.map(l => (
                      <div key={l.id} style={{ display: 'flex', alignItems: 'center', height: '28px', background: 'rgba(255,255,255,0.01)', borderRadius: '4px' }}>
                        <div 
                          onClick={() => router.push(`/listings/${l.id}?view=nav`)}
                          style={{ width: '200px', fontSize: '0.7rem', padding: '0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer', fontWeight: 500, opacity: 0.9 }}
                        >
                          {l.address}
                        </div>
                        <div style={{ flex: 1, display: 'flex', height: '20px', gap: '1px' }}>
                          {Array.from({ length: 60 }).map((_, i) => {
                            const date = new Date();
                            date.setHours(0,0,0,0);
                            date.setDate(date.getDate() + i + timelineOffset);
                            
                            const isAvailable = availability[l.id]?.some(p => {
                              const start = new Date(p.start_date);
                              start.setHours(0,0,0,0);
                              const end = new Date(p.end_date);
                              end.setHours(0,0,0,0);
                              return date >= start && date <= end;
                            });

                            const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                            return (
                              <div 
                                key={i} 
                                title={`${l.address}: ${date.toLocaleDateString()}`}
                                style={{ 
                                  flex: 1, 
                                  background: isAvailable ? 'var(--color-teal)' : isWeekend ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)',
                                  borderRadius: '1px',
                                  opacity: isAvailable ? 0.8 : 1
                                }} 
                              />
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="card" style={{ padding: 'var(--space-4)', display: 'grid', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Tidslinje-styring</span>
                  <button onClick={() => setTimelineOffset(0)} style={{ background: 'none', border: 'none', color: 'var(--color-sky-blue)', cursor: 'pointer', fontSize: '0.75rem' }}>Gå til i dag</button>
                </div>
                <div style={{ position: 'relative', height: '20px', margin: '10px 0' }}>
                  <input 
                    type="range" 
                    min="-30" 
                    max="365" 
                    value={timelineOffset} 
                    onChange={(e) => setTimelineOffset(parseInt(e.target.value))}
                    style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--color-royal-blue)', position: 'absolute', top: 0, left: 0, zIndex: 2 }}
                  />
                  {/* Markering for "I dag" på slideren */}
                  <div style={{ 
                    position: 'absolute', 
                    left: `${(30 / (365 + 30)) * 100}%`, 
                    top: '-5px', 
                    bottom: '-5px', 
                    width: '2px', 
                    background: 'var(--color-sky-blue)',
                    zIndex: 1,
                    opacity: 0.5
                  }}></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', opacity: 0.5 }}>
                  <span>-30 dager</span>
                  <span style={{ color: 'var(--color-sky-blue)', fontWeight: 700, marginLeft: '-15%' }}>I dag</span>
                  <span>+1 år</span>
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: 'var(--space-10)' }}>
            <Info size={40} style={{ margin: '0 auto var(--space-3)', opacity: 0.3 }} />
            <p>Ingen boliger matcher dine søkekriterier.</p>
          </div>
        )}
      </div>

      <style jsx>{`
        @media (max-width: 1200px) {
          .timeline-date-optional {
            display: none;
          }
        }
      `}</style>
    </main>
  )
}
