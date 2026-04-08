'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Plus, Home as HomeIcon, Info, Trash2, Edit3, Clock, FileText, 
  ShieldCheck, MessageSquare, Sparkles, LayoutDashboard
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { isKommuneStaffRole } from '../../lib/kommuneRoles'
import { landlordOnboardingKey, LANDLORD_ONBOARDING_PREFIX } from '../../lib/landlordOnboarding'
import LandlordOnboardingModal from '../../components/LandlordOnboardingModal'
import {
  PwaInstallPromptDialog,
  PWA_PROMPT_DISMISSED_KEY,
  PWA_PROMPT_MANAGE_SESSION_KEY,
  shouldShowPwaPrompt,
} from '../../components/PWAInstallPrompt'
import { useLanguage } from '../../../context/LanguageContext'
import { formatDateNo } from '../../lib/dateFormat'
import { DateInput } from '../../components/DateInput'
import LoadingPlaceholder from '../../components/LoadingPlaceholder'

export default function HomeownerManage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [myListings, setMyListings] = useState<any[]>([])
  const [availability, setAvailability] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'Alle' | 'Tilgjengelig' | 'Utilgjengelig' | 'Formidla'>('Alle')
  const [editingAvailability, setEditingAvailability] = useState<string | null>(null)
  const [newPeriod, setNewPeriod] = useState({ start: '', end: '', status: 'Tilgjengelig' })
  const [pendingDeletePeriod, setPendingDeletePeriod] = useState<{ id: string; listingId: string } | null>(null)
  const [pendingDeleteListing, setPendingDeleteListing] = useState<{ id: string; address: string } | null>(null)
  const [pageGate, setPageGate] = useState<'init' | 'welcome' | 'ready'>('init')
  const [showOverviewIntro, setShowOverviewIntro] = useState(false)
  const [showMineBoligerIntro, setShowMineBoligerIntro] = useState(false)
  /** PWA etter at velkomst-modalet er lukket (samme økt som første gang på siden). */
  const [pendingPwaAfterWelcome, setPendingPwaAfterWelcome] = useState(false)
  const [pendingPwaBeforeOverview, setPendingPwaBeforeOverview] = useState(false)
  /** Nettverk/Supabase-timeout eller feil fra fetchData */
  const [fetchError, setFetchError] = useState<'timeout' | string | null>(null)
  const pageGateRef = useRef(pageGate)
  pageGateRef.current = pageGate

  const todayStr = () => new Date().toISOString().slice(0, 10)
  const openPeriodCalendar = (listingId: string, status: 'Tilgjengelig' | 'Utilgjengelig') => {
    const t = todayStr()
    setEditingAvailability(listingId)
    setNewPeriod({ start: t, end: t, status })
  }

  const fetchData = async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
      if (isKommuneStaffRole(profile?.role)) {
        router.replace('/nav/database')
        return
      }

      const { data: agreement } = await supabase
        .from('user_agreements')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_terminated', false)
        .maybeSingle()

      if (!agreement) {
        const { data: firstListing } = await supabase
          .from('listings')
          .select('city')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()
        const city = firstListing?.city?.trim()
        if (city) {
          router.push(`/homeowner/sign-terms?city=${encodeURIComponent(city)}&returnTo=${encodeURIComponent('/homeowner/manage')}`)
        } else {
          router.push('/homeowner/register')
        }
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

      if (typeof window !== 'undefined') {
        const uid = user.id
        const ovKey = landlordOnboardingKey(LANDLORD_ONBOARDING_PREFIX.overview, uid)
        const mineKey = landlordOnboardingKey(LANDLORD_ONBOARDING_PREFIX.mineBoliger, uid)
        if (!localStorage.getItem(ovKey)) {
          let managePwaDone = false
          try {
            managePwaDone = sessionStorage.getItem(PWA_PROMPT_MANAGE_SESSION_KEY) === '1'
          } catch {
            managePwaDone = false
          }
          if (shouldShowPwaPrompt() && !managePwaDone) {
            setPendingPwaBeforeOverview(true)
          } else {
            setShowOverviewIntro(true)
          }
        } else if (!localStorage.getItem(mineKey) && (listingsData || []).length > 0) {
          setShowMineBoligerIntro(true)
        }
      }

    } catch (err: any) {
      console.error('Unexpected error:', err)
      setFetchError(err?.message || 'error')
    } finally {
      setLoading(false)
    }
  }

  const dismissLandlordWelcome = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user && typeof window !== 'undefined') {
      localStorage.setItem(landlordOnboardingKey(LANDLORD_ONBOARDING_PREFIX.welcome, user.id), '1')
    }
    let managePwaDone = false
    try {
      managePwaDone = sessionStorage.getItem(PWA_PROMPT_MANAGE_SESSION_KEY) === '1'
    } catch {
      managePwaDone = false
    }
    if (shouldShowPwaPrompt() && !managePwaDone) {
      setPendingPwaAfterWelcome(true)
      return
    }
    setPageGate('ready')
    await fetchData()
  }

  const dismissPwaAfterWelcome = (remember: boolean) => {
    try {
      if (remember) localStorage.setItem(PWA_PROMPT_DISMISSED_KEY, '1')
      sessionStorage.setItem(PWA_PROMPT_MANAGE_SESSION_KEY, '1')
    } catch {
      /* ignore */
    }
    setPendingPwaAfterWelcome(false)
    setPageGate('ready')
    void fetchData()
  }

  const dismissOverviewIntro = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user && typeof window !== 'undefined') {
      localStorage.setItem(landlordOnboardingKey(LANDLORD_ONBOARDING_PREFIX.overview, user.id), '1')
    }
    setShowOverviewIntro(false)
    if (user && myListings.length > 0 && typeof window !== 'undefined') {
      const mineKey = landlordOnboardingKey(LANDLORD_ONBOARDING_PREFIX.mineBoliger, user.id)
      if (!localStorage.getItem(mineKey)) {
        setShowMineBoligerIntro(true)
      }
    }
  }

  const dismissMineBoligerIntro = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user && typeof window !== 'undefined') {
      localStorage.setItem(landlordOnboardingKey(LANDLORD_ONBOARDING_PREFIX.mineBoliger, user.id), '1')
    }
    setShowMineBoligerIntro(false)
  }

  useEffect(() => {
    let cancelled = false
    /** Må være > auth-timeout i supabase.ts (22s) og gi tid til trege spørringer. */
    const STUCK_MS = 60000
    const stuckTimer = window.setTimeout(() => {
      if (cancelled) return
      // Ikke vis feil mens velkomst-modal er åpen (bruker kan bruke >20s der).
      if (pageGateRef.current === 'welcome') return
      setPageGate(g => (g === 'init' ? 'ready' : g))
      setFetchError('timeout')
      setLoading(false)
    }, STUCK_MS)

    async function bootstrap() {
      let userResp: Awaited<ReturnType<typeof supabase.auth.getUser>>
      try {
        // getUser() har egen ~22s timeout i app/lib/supabase.ts — ikke kapp den med 15s race.
        userResp = await supabase.auth.getUser()
      } catch (e: unknown) {
        if (cancelled) return
        console.error(e)
        setFetchError(e instanceof Error ? e.message : 'error')
        setPageGate('ready')
        setLoading(false)
        return
      }
      const { data: { user } } = userResp
      if (!user) {
        if (!cancelled) router.push('/login')
        return
      }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
      if (isKommuneStaffRole(profile?.role)) {
        if (!cancelled) router.replace('/nav/database')
        return
      }
      const dismissed =
        typeof window !== 'undefined' &&
        localStorage.getItem(landlordOnboardingKey(LANDLORD_ONBOARDING_PREFIX.welcome, user.id))
      if (!dismissed) {
        if (!cancelled) setPageGate('welcome')
        return
      }
      if (!cancelled) setPageGate('ready')
      await fetchData()
    }

    void bootstrap().finally(() => {
      if (!cancelled) window.clearTimeout(stuckTimer)
    })

    return () => {
      cancelled = true
      window.clearTimeout(stuckTimer)
    }
  }, [])

  useEffect(() => {
    if (pageGate !== 'ready' || !loading) return
    const id = window.setTimeout(() => {
      setFetchError('timeout')
      setLoading(false)
    }, 60000)
    return () => clearTimeout(id)
  }, [loading, pageGate])

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
      alert(t('errUpdateGeneric') + err.message)
    }
  }

  const executeDeleteListing = async () => {
    if (!pendingDeleteListing) return
    const { id, address } = pendingDeleteListing

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

      setAvailability(prev => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      setPendingDeleteListing(null)
    } catch (err: any) {
      setMyListings(prevListings)
      alert(t('errDeleteGeneric') + err.message)
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
      // Formidla-perioder kan kun legges inn av kommuneansatte (i boligbanken), ikke av utleier her.
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
      
      setAvailability(prev => ({
        ...prev,
        [listingId]: (prev[listingId] || []).filter(p => p.id !== id)
      }))
      setPendingDeletePeriod(null)
    } catch (err: any) {
      alert(t('errDeletePeriod') + err.message)
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

  if (pageGate === 'init') {
    return (
      <main className="container" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingPlaceholder minHeight={160} />
      </main>
    )
  }

  if (pageGate === 'welcome') {
    return (
      <>
        <PwaInstallPromptDialog
          open={pendingPwaAfterWelcome}
          onDismiss={remember => dismissPwaAfterWelcome(remember)}
        />
        {!pendingPwaAfterWelcome && (
          <LandlordOnboardingModal
            open
            title={t('landlordWelcomeTitle')}
            titleId="landlord-welcome-title"
            onDismiss={() => void dismissLandlordWelcome()}
            ctaLabel={t('landlordWelcomeCta')}
            icon={Sparkles}
            iconAccent="teal"
          >
            <p style={{ margin: '0 0 var(--space-4)', fontSize: '1rem', color: 'var(--text-body)', lineHeight: 1.55 }}>
              {t('landlordWelcomeIntro')}
            </p>
            <ul style={{ margin: '0 0 var(--space-5)', paddingLeft: '1.25rem', color: 'var(--text-body)', lineHeight: 1.65, fontSize: '0.95rem' }}>
              <li style={{ marginBottom: 'var(--space-2)' }}>{t('landlordWelcomeBulletRegister')}</li>
              <li style={{ marginBottom: 'var(--space-2)' }}>{t('landlordWelcomeBulletMessages')}</li>
              <li>{t('landlordWelcomeBulletSign')}</li>
            </ul>
            <div
              style={{
                marginBottom: 'var(--space-6)',
                padding: 'var(--space-4)',
                borderRadius: 12,
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
              }}
            >
              <h2 style={{ margin: '0 0 var(--space-2)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-accent)' }}>
                {t('landlordWelcomeOrderTitle')}
              </h2>
              <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: 1.55 }}>
                {t('landlordWelcomeOrderBody')}
              </p>
            </div>
          </LandlordOnboardingModal>
        )}
      </>
    )
  }

  return (
    <main className="container">
      <PwaInstallPromptDialog
        open={pendingPwaBeforeOverview}
        onDismiss={remember => {
          try {
            if (remember) localStorage.setItem(PWA_PROMPT_DISMISSED_KEY, '1')
            sessionStorage.setItem(PWA_PROMPT_MANAGE_SESSION_KEY, '1')
          } catch {
            /* ignore */
          }
          setPendingPwaBeforeOverview(false)
          setShowOverviewIntro(true)
        }}
      />

      <LandlordOnboardingModal
        open={showOverviewIntro}
        title={t('landlordOverviewTitle')}
        titleId="landlord-overview-title"
        onDismiss={() => void dismissOverviewIntro()}
        ctaLabel={t('landlordOverviewCta')}
        icon={LayoutDashboard}
        iconAccent="blue"
      >
        <p style={{ margin: '0 0 var(--space-4)', fontSize: '1rem', color: 'var(--text-body)', lineHeight: 1.55 }}>
          {t('landlordOverviewLead')}
        </p>
        <ul style={{ margin: '0 0 var(--space-5)', paddingLeft: '1.25rem', color: 'var(--text-body)', lineHeight: 1.65, fontSize: '0.95rem' }}>
          <li style={{ marginBottom: 'var(--space-2)' }}>{t('landlordOverviewBullet1')}</li>
          <li style={{ marginBottom: 'var(--space-2)' }}>{t('landlordOverviewBullet2')}</li>
          <li>{t('landlordOverviewBullet3')}</li>
        </ul>
        <div
          style={{
            marginBottom: 'var(--space-6)',
            padding: 'var(--space-4)',
            borderRadius: 12,
            background: 'rgba(45, 212, 191, 0.1)',
            border: '1px solid rgba(45, 212, 191, 0.28)',
          }}
        >
          <h2 style={{ margin: '0 0 var(--space-2)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-teal)' }}>
            {t('landlordOverviewExpectTitle')}
          </h2>
          <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: 1.55 }}>
            {t('landlordOverviewExpectBody')}
          </p>
        </div>
      </LandlordOnboardingModal>

      <LandlordOnboardingModal
        open={showMineBoligerIntro && !showOverviewIntro}
        title={t('landlordMineBoligerTitle')}
        titleId="landlord-mineboliger-title"
        onDismiss={() => void dismissMineBoligerIntro()}
        ctaLabel={t('landlordMineBoligerCta')}
        icon={HomeIcon}
        iconAccent="teal"
      >
        <p style={{ margin: '0 0 var(--space-4)', fontSize: '1rem', color: 'var(--text-body)', lineHeight: 1.55 }}>
          {t('landlordMineBoligerLead')}
        </p>
        <ul style={{ margin: '0 0 var(--space-6)', paddingLeft: '1.25rem', color: 'var(--text-body)', lineHeight: 1.65, fontSize: '0.95rem' }}>
          <li style={{ marginBottom: 'var(--space-2)' }}>{t('landlordMineBoligerBullet1')}</li>
          <li style={{ marginBottom: 'var(--space-2)' }}>{t('landlordMineBoligerBullet2')}</li>
          <li>{t('landlordMineBoligerBullet3')}</li>
        </ul>
      </LandlordOnboardingModal>

      {pendingDeleteListing && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-delete-listing-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-4)',
          }}
          onClick={() => setPendingDeleteListing(null)}
        >
          <div
            className="card"
            style={{
              maxWidth: 440,
              padding: 'var(--space-6)',
              boxShadow: 'var(--shadow-lg, 0 10px 40px rgba(0,0,0,0.2))',
            }}
            onClick={e => e.stopPropagation()}
          >
            <p id="confirm-delete-listing-title" style={{ margin: '0 0 var(--space-4)', fontSize: '1rem', lineHeight: 1.5 }}>
              {t('confirmDeleteListing').replace('{address}', pendingDeleteListing.address)}
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="button"
                style={{ background: 'var(--bg-app)', border: '1px solid var(--border-subtle)' }}
                onClick={() => setPendingDeleteListing(null)}
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                className="button"
                style={{ background: '#dc2626', color: 'white', border: 'none' }}
                onClick={() => void executeDeleteListing()}
              >
                {t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingDeletePeriod && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-remove-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-4)',
          }}
          onClick={() => setPendingDeletePeriod(null)}
        >
          <div
            className="card"
            style={{
              maxWidth: 400,
              padding: 'var(--space-6)',
              boxShadow: 'var(--shadow-lg, 0 10px 40px rgba(0,0,0,0.2))',
            }}
            onClick={e => e.stopPropagation()}
          >
            <p id="confirm-remove-title" style={{ margin: '0 0 var(--space-4)', fontSize: '1rem' }}>
              {t('confirmRemovePeriod')}
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="button"
                style={{ background: 'var(--bg-app)', border: '1px solid var(--border-subtle)' }}
                onClick={() => setPendingDeletePeriod(null)}
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                className="button"
                style={{ background: '#dc2626', color: 'white', border: 'none' }}
                onClick={() => pendingDeletePeriod && deleteAvailability(pendingDeletePeriod.id, pendingDeletePeriod.listingId)}
              >
                {t('remove')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="hm-header-row" style={{ marginBottom: 'var(--space-8)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2.75rem)', margin: 0 }}>Min Boly-oversikt</h1>
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
                  <LoadingPlaceholder minHeight={120} />
                ) : fetchError ? (
                  <div className="card" style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
                    <Info size={36} style={{ margin: '0 auto var(--space-3)', opacity: 0.45 }} />
                    <p style={{ margin: '0 0 var(--space-4)', color: 'var(--text-body)', lineHeight: 1.55 }}>
                      {fetchError === 'timeout' ? t('manageDataLoadTimeout') : fetchError}
                    </p>
                    <button type="button" className="button" onClick={() => void fetchData()}>
                      {t('retryLoad')}
                    </button>
                  </div>
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
                              onClick={() => setPendingDeleteListing({ id: listing.id, address: listing.address })}
                              style={{ padding: '8px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.05)', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {getEffectiveStatus(listing) === 'Formidla' && (
                        <div onClick={e => e.stopPropagation()} style={{ padding: 'var(--space-4)', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
                          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                            <a href="https://ayddwbmkclujefnhsaqv.supabase.co/storage/v1/object/public/documents/Kontaktinfoschema.pdf" target="_blank" rel="noopener noreferrer" download className="button" style={{ padding: 'var(--space-2) var(--space-4)', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', textDecoration: 'none' }}>
                              <FileText size={16} /> {t('contactInfoForm')}
                            </a>
                            <Link href={`/report/utleier/${listing.id}`} className="button" style={{ padding: 'var(--space-2) var(--space-4)', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', textDecoration: 'none', background: 'var(--color-teal)', color: 'white', border: 'none' }}>
                              <FileText size={16} /> {t('fillHandoverReport')}
                            </Link>
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
                                    {p.status !== 'Formidla' ? (
                                      <button 
                                        type="button"
                                        onClick={() => setPendingDeletePeriod({ id: p.id, listingId: listing.id })}
                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', marginLeft: 'auto' }}
                                        title={t('manageDeletePeriodTitle')}
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    ) : (
                                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>Kun kommune kan fjerne</span>
                                    )}
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
                              <DateInput
                                showCalendar
                                className="input"
                                style={{ marginBottom: 0, fontSize: '0.85rem' }}
                                value={newPeriod.start}
                                onChange={v => setNewPeriod({ ...newPeriod, start: v })}
                                max={newPeriod.end || undefined}
                                placeholder={t('dateInputPlaceholder')}
                              />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label className="label" style={{ fontSize: '0.7rem' }}>{t('toDate')}</label>
                              <DateInput
                                showCalendar
                                className="input"
                                style={{ marginBottom: 0, fontSize: '0.85rem' }}
                                value={newPeriod.end}
                                onChange={v => setNewPeriod({ ...newPeriod, end: v })}
                                min={newPeriod.start || undefined}
                                placeholder={t('dateInputPlaceholder')}
                              />
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
