'use client'

import { use, useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { OptimizedPublicStorageImage } from '../../components/OptimizedPublicStorageImage'
import {
  ArrowLeft,
  Save,
  MapPin,
  Bed,
  Tag,
  FileText,
  Camera,
  Home as HomeIcon,
  Info,
  Users,
  Ruler,
  Building,
  CheckCircle2,
  Wifi,
  Zap,
  Tv,
  ShieldCheck,
  Phone,
  User,
} from 'lucide-react'
import { supabase, getAuthUserDeduped } from '../../lib/supabase'
import { useLanguage } from '../../../context/LanguageContext'
import {
  nominatimResultToGeocodeHit,
  searchNorwegianAddress,
  type GeocodeHit,
} from '../../lib/geocoding'
import { savePendingFirstListingDraft } from '../lib/pendingFirstListing'
import { isKommuneStaffRole } from '../../lib/kommuneRoles'
import { logError } from '@/app/lib/appLogger'
import { uploadHouseRulesPdf } from '../../lib/houseRulesPdf'

export default function HomeownerRegister() {
  const { t } = useLanguage()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [houseRulesFile, setHouseRulesFile] = useState<File | null>(null)
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
    pet_policy: 'Ingen dyr tillatt' as 'Tillatt' | 'Ingen dyr tillatt' | 'Enkelte dyr er tillatt',
    pet_policy_detail: '',
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
    has_insurance: false,
    payment_method: 'faktura' as 'faktura' | 'konto',
  })
  const formRef = useRef(formData)
  formRef.current = formData
  const [geocodeLoading, setGeocodeLoading] = useState(false)
  const [geocodeCandidates, setGeocodeCandidates] = useState<GeocodeHit[] | null>(null)
  const [geocodeError, setGeocodeError] = useState<string | null>(null)
  const geocodeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const addressSuggestDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [addressSuggestions, setAddressSuggestions] = useState<GeocodeHit[] | null>(null)
  const [addressSuggesting, setAddressSuggesting] = useState(false)
  /** True når Kartverket-treff ikke hadde kommunenavn — bruker må skrive kommune selv. */
  const [kommuneFromApiMissing, setKommuneFromApiMissing] = useState(false)

  useEffect(() => {
    const checkTerms = async () => {
      const user = await getAuthUserDeduped()
      if (!user) {
        router.push('/login')
        return
      }

      const [{ data: profile }, { data: ua }] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
        supabase.from('user_agreements').select('*').eq('user_id', user.id).maybeSingle(),
      ])
      if (isKommuneStaffRole(profile?.role)) {
        router.replace('/nav/database')
        return
      }

      // Ikke bruk getLandlordPostLoginHref her: den sender alle med aktiv avtale til «Mine boliger»,
      // og utleiere kan da aldri åpne denne siden for å registrere bolig nr. 2+.

      if (ua?.is_terminated && ua?.terminated_by_kommune) {
        router.replace('/homeowner/kommune-terminated')
        return
      }

      setHasSignedTerms(!!ua && !ua.is_terminated)
    }
    checkTerms()
  }, [router])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      setImageFiles([...imageFiles, ...files])

      const newPreviews = files.map((file) => URL.createObjectURL(file))
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
    setFormData((prev) => {
      const current = (prev as any)[field] as string[]
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter((v) => v !== value) }
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

      const { error: uploadError } = await supabase.storage.from('listings').upload(filePath, file)

      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from('listings').getPublicUrl(filePath)

      urls.push(publicUrl)
    }
    return urls
  }

  const runGeocode = useCallback(async () => {
    const fd = formRef.current
    if (!fd.address || fd.address.trim().length < 3) {
      setGeocodeCandidates(null)
      setGeocodeError(null)
      return
    }

    setGeocodeLoading(true)
    setGeocodeError(null)
    try {
      let raw = await searchNorwegianAddress({
        address: fd.address,
        postal_code: fd.postal_code,
        city: fd.city,
      })
      if (raw.length === 0) {
        raw = await searchNorwegianAddress({
          address: fd.address,
          postal_code: undefined,
          city: undefined,
        })
      }
      const hits = raw.map((h) => nominatimResultToGeocodeHit(h as Record<string, unknown>))
      if (hits.length === 0) {
        setGeocodeCandidates(null)
        setKommuneFromApiMissing(false)
        setFormData((prev) => ({ ...prev, latitude: null, longitude: null }))
        setGeocodeError(t('regGeocodeError'))
        return
      }
      if (hits.length === 1) {
        const h = hits[0]
        setGeocodeCandidates(null)
        setKommuneFromApiMissing(!String(h.city || '').trim())
        setFormData((prev) => ({
          ...prev,
          latitude: h.lat,
          longitude: h.lon,
          ...(h.postal_code && { postal_code: h.postal_code }),
          ...(h.city && { city: h.city }),
        }))
        return
      }
      setKommuneFromApiMissing(false)
      setGeocodeCandidates(hits)
      setFormData((prev) => ({ ...prev, latitude: null, longitude: null }))
    } catch (err) {
      logError('Geocoding error:', err)
      setGeocodeError(t('regGeocodeFailed'))
    } finally {
      setGeocodeLoading(false)
    }
  }, [t])

  const scheduleGeocode = () => {
    if (geocodeDebounceRef.current) clearTimeout(geocodeDebounceRef.current)
    geocodeDebounceRef.current = setTimeout(() => {
      void runGeocode()
    }, 450)
  }

  const selectGeocodeCandidate = (index: number) => {
    const c = geocodeCandidates?.[index]
    if (!c) return
    setGeocodeCandidates(null)
    setGeocodeError(null)
    setKommuneFromApiMissing(!String(c.city || '').trim())
    setFormData((prev) => ({
      ...prev,
      latitude: c.lat,
      longitude: c.lon,
      ...(c.street && { address: c.street }),
      ...(c.postal_code && { postal_code: c.postal_code }),
      ...(c.city && { city: c.city }),
    }))
  }

  const scheduleAddressSuggest = () => {
    if (addressSuggestDebounceRef.current) clearTimeout(addressSuggestDebounceRef.current)
    addressSuggestDebounceRef.current = setTimeout(() => {
      void (async () => {
        const fd = formRef.current
        const a = fd.address?.trim() || ''
        if (a.length < 4) {
          setAddressSuggestions(null)
          return
        }
        setAddressSuggesting(true)
        try {
          const raw = await searchNorwegianAddress(
            { address: a, postal_code: fd.postal_code, city: fd.city },
            8
          )
          const hits = raw.map((h) => nominatimResultToGeocodeHit(h as Record<string, unknown>))
          setAddressSuggestions(hits.length ? hits.slice(0, 8) : null)
        } catch {
          setAddressSuggestions(null)
        } finally {
          setAddressSuggesting(false)
        }
      })()
    }, 350)
  }

  const applyAddressSuggestion = (h: GeocodeHit) => {
    setAddressSuggestions(null)
    setGeocodeCandidates(null)
    setGeocodeError(null)
    setKommuneFromApiMissing(!String(h.city || '').trim())
    setFormData((prev) => ({
      ...prev,
      latitude: h.lat,
      longitude: h.lon,
      address: h.street || prev.address,
      ...(h.postal_code && { postal_code: h.postal_code }),
      ...(h.city && { city: h.city }),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const user = await getAuthUserDeduped()
      if (!user) throw new Error('Not authenticated')

      const req = (s: string | undefined | null) => String(s ?? '').trim().length > 0
      const fd = formRef.current
      if (
        !req(fd.owner_name) ||
        !req(fd.contact_phone) ||
        !req(fd.address) ||
        !req(fd.city) ||
        !req(fd.postal_code)
      ) {
        alert(t('regValidationRequiredFields'))
        setLoading(false)
        return
      }
      if (fd.latitude == null || fd.longitude == null || Number.isNaN(Number(fd.latitude))) {
        alert(t('regValidationGeocode'))
        setLoading(false)
        return
      }
      if (!fd.has_insurance) {
        alert(t('regValidationInsurance'))
        setLoading(false)
        return
      }
      const priceMinSum =
        (parseFloat(String(fd.price_daily)) || 0) +
        (parseFloat(String(fd.price_weekly)) || 0) +
        (parseFloat(String(fd.price_monthly_short)) || 0) +
        (parseFloat(String(fd.price_monthly_long)) || 0)
      if (priceMinSum <= 0) {
        alert(t('regValidationPrice'))
        setLoading(false)
        return
      }
      const sizeSqmCheck = parseFloat(String(fd.size_sqm)) || 0
      const bedroomsCheck = parseInt(String(fd.bedrooms), 10)
      const maxOccCheck = parseInt(String(fd.max_occupants), 10)
      if (sizeSqmCheck <= 0 || Number.isNaN(bedroomsCheck) || bedroomsCheck < 0 || maxOccCheck < 1) {
        alert(t('regValidationSizeOccupants'))
        setLoading(false)
        return
      }

      const { count: existingCount } = await supabase
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', user.id)
      const isFirstListing = (existingCount ?? 0) === 0

      const { data: agreementRow } = await supabase
        .from('user_agreements')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_terminated', false)
        .maybeSingle()

      if (!isFirstListing) {
        const { data: termsOk, error: termsErr } = await supabase.rpc('listing_publish_terms_ok', {
          p_city: formData.city?.trim() || '',
        })
        if (termsErr) throw termsErr
        if (!termsOk) {
          alert(t('termsMissingForRegion'))
          router.push(
            `/homeowner/sign-terms?city=${encodeURIComponent(formData.city?.trim() || '')}&returnTo=${encodeURIComponent('/homeowner/register')}`
          )
          setLoading(false)
          return
        }
      }

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
      const priceShort = clamp(
        parseFloat(String(formData.price_monthly_short)) || 0,
        priceMin,
        priceMax
      )
      const priceLong = formData.price_monthly_long
        ? clamp(parseFloat(String(formData.price_monthly_long)), priceMin, priceMax)
        : null
      const longTermOn = (priceLong ?? 0) > 0
      const deposit =
        longTermOn && formData.deposit_amount
          ? clamp(parseFloat(String(formData.deposit_amount)), 0, 9999999)
          : null
      const floorNumber = formData.floor_detail?.length ? formData.floor_detail.join(', ') : ''

      const { has_insurance: _skip, ...listingFields } = formData
      const listingRow = {
        ...listingFields,
        deposit_guarantee: longTermOn ? formData.deposit_guarantee : [],
        floor_number: floorNumber,
        image_url: imageUrls[0] ?? null,
        image_urls: imageUrls,
        is_available: true,
        status: 'Tilgjengelig',
        size_sqm: sizeSqm,
        bedrooms: bedroomsVal,
        max_occupants: maxOcc,
        price_daily: priceDaily,
        price_per_night: priceDaily,
        price_weekly: priceWeekly,
        price_monthly_short: priceShort,
        price_monthly_long: priceLong,
        deposit_amount: deposit,
        latitude: formData.latitude,
        longitude: formData.longitude,
      }

      if (isFirstListing && !agreementRow) {
        savePendingFirstListingDraft(listingRow as unknown as Record<string, unknown>)
        const cityQ = encodeURIComponent(formData.city?.trim() || '')
        const returnTo = encodeURIComponent('/homeowner/register')
        router.push(`/homeowner/sign-terms?city=${cityQ}&returnTo=${returnTo}&pendingListing=1`)
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('listings')
        .insert([
          {
            ...listingRow,
            owner_id: user.id,
          },
        ])
        .select('id')

      if (error) {
        const msg = [error.message, error.details, error.hint].filter(Boolean).join(' · ')
        throw new Error(msg || JSON.stringify(error))
      }

      const inserted = Array.isArray(data) && data.length > 0 ? data[0] : null
      const listingId = inserted?.id
      if (!listingId) {
        throw new Error(t('regSaveNoIdError'))
      }

      if (houseRulesFile) {
        const hr = await uploadHouseRulesPdf(supabase, listingId, houseRulesFile)
        if ('error' in hr) {
          const msg =
            hr.error === 'type'
              ? t('houseRulesValidationType')
              : hr.error === 'size'
                ? t('houseRulesValidationSize')
                : t('houseRulesUploadError') + (typeof hr.error === 'string' ? hr.error : '')
          alert(msg)
        } else {
          const { error: hrDbErr } = await supabase
            .from('listings')
            .update({ house_rules_pdf_path: hr.path })
            .eq('id', listingId)
          if (hrDbErr) {
            logError('house_rules_pdf_path update', hrDbErr)
            alert(t('houseRulesUploadError'))
          }
        }
      }

      // Logg handling inkl. viktige bekreftelser (forsikring akseptert ved publisering)
      await supabase.from('audit_logs').insert([
        {
          user_id: user.id,
          action_type: 'CREATE_LISTING',
          listing_id: listingId,
          listing_address: formData.address,
          details: {
            address: formData.address,
            city: formData.city,
            postal_code: formData.postal_code || null,
            has_insurance_accepted: true,
          },
        },
      ])

      // Varsle kun kommune – ikke utleier som registrerte
      const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'En utleier'
      const { data: kommuneProfiles } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['kommune_ansatt', 'kommune_admin'])
      const rows = (kommuneProfiles || []).map((p: { id: string }) => ({
        listing_id: listingId,
        owner_id: p.id,
        type: 'NEW_LISTING',
        title: 'Ny bolig registrert',
        message: `${userName} har registrert en ny bolig i ${formData.city}: ${formData.address}`,
        municipality: formData.city,
      }))
      if (rows.length > 0) {
        await supabase.from('notifications').insert(rows)
      }

      alert(t('registerSuccess'))

      const { data: agreementAfter } = await supabase
        .from('user_agreements')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_terminated', false)
        .maybeSingle()

      const cityQ = encodeURIComponent(formData.city?.trim() || '')
      const returnTo = encodeURIComponent('/homeowner/manage')
      if (!agreementAfter) {
        router.push(`/homeowner/sign-terms?city=${cityQ}&returnTo=${returnTo}`)
        return
      }

      router.push('/homeowner/manage')
    } catch (err: any) {
      const message =
        err?.message ??
        err?.error_description ??
        (typeof err === 'string' ? err : JSON.stringify(err))
      logError('Error saving listing:', message, err)
      alert(t('errSaveListing') + (message || t('errUnknown')))
    } finally {
      setLoading(false)
    }
  }

  if (hasSignedTerms === null) return <div className="container" style={{ minHeight: '80vh' }} />

  return (
    <main className="container">
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <Link
          href="/homeowner/manage"
          className="nav-link"
          style={{
            marginLeft: '-1rem',
            marginBottom: 'var(--space-2)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
          }}
        >
          <ArrowLeft size={18} /> {t('regBack')}
        </Link>
        <h1 style={{ fontSize: 'var(--fluid-h1-hero)' }}>{t('regTitle')}</h1>
        <p style={{ maxWidth: '700px', opacity: 0.8 }}>{t('regLead')}</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="register-form"
        style={{ display: 'grid', gap: 'var(--space-6)' }}
      >
        <div
          className="register-form-columns"
          style={{
            display: 'grid',
            gridTemplateColumns: '1.5fr 1fr',
            gap: 'var(--space-8)',
            alignItems: 'start',
          }}
        >
          <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
            {/* Section 1: Basic Info & Kontakt */}
            <section className="form-section">
              <h3
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  marginBottom: 'var(--space-5)',
                  color: 'var(--color-sky-blue)',
                }}
              >
                <User size={20} /> {t('regContactSection')}
              </h3>
              <div className="form-grid">
                <div>
                  <label className="label">{t('regOwnerLabel')}</label>
                  <input
                    type="text"
                    className="input"
                    placeholder={t('placeholderOwnerName')}
                    required
                    value={formData.owner_name}
                    onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">{t('regPhoneLabel')}</label>
                  <input
                    type="tel"
                    className="input"
                    placeholder={t('placeholderPhoneGeneric')}
                    required
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  />
                </div>
              </div>
              <div
                style={{
                  marginTop: 'var(--space-5)',
                  padding: 'var(--space-4)',
                  background: 'var(--bg-subtle, rgba(0,0,0,0.04))',
                  borderRadius: 12,
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <label
                  className="label"
                  style={{ display: 'block', marginBottom: 'var(--space-3)' }}
                >
                  {t('paymentMethodLabel')}
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 'var(--space-3)',
                      cursor: 'pointer',
                      color: 'var(--text-body)',
                    }}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      checked={formData.payment_method === 'faktura'}
                      onChange={() => setFormData({ ...formData, payment_method: 'faktura' })}
                      style={{ marginTop: 4 }}
                    />
                    <span>{t('paymentMethodFaktura')}</span>
                  </label>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 'var(--space-3)',
                      cursor: 'pointer',
                      color: 'var(--text-body)',
                    }}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      checked={formData.payment_method === 'konto'}
                      onChange={() => setFormData({ ...formData, payment_method: 'konto' })}
                      style={{ marginTop: 4 }}
                    />
                    <span>{t('paymentMethodKonto')}</span>
                  </label>
                </div>
                <p
                  style={{
                    margin: 'var(--space-3) 0 0',
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                    lineHeight: 1.5,
                  }}
                >
                  {t('paymentMethodKontoHint')}
                </p>
              </div>
              <div style={{ marginTop: 'var(--space-4)' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <label className="label">{t('regStreetLabel')}</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    {geocodeLoading && (
                      <span style={{ fontSize: '0.7rem', opacity: 0.85 }}>
                        {t('regGeocodeSearching')}
                      </span>
                    )}
                    {!geocodeLoading &&
                      formData.latitude != null &&
                      formData.longitude != null &&
                      !geocodeCandidates?.length && (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            color: 'var(--color-teal)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <CheckCircle2 size={12} /> {t('regPositionSet')}
                        </span>
                      )}
                    <button
                      type="button"
                      onClick={() => void runGeocode()}
                      title={t('regGeocodeTitle')}
                      style={{
                        fontSize: '0.75rem',
                        padding: '6px 10px',
                        borderRadius: 8,
                        border: '1px solid var(--border-medium)',
                        background: 'var(--bg-card)',
                        color: 'var(--text-main)',
                        cursor: 'pointer',
                        fontWeight: 500,
                      }}
                    >
                      {t('regUpdateMapBtn')}
                    </button>
                  </div>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="input"
                    placeholder={t('placeholderStreet')}
                    required
                    value={formData.address}
                    onChange={(e) => {
                      const v = e.target.value
                      setFormData((prev) => ({ ...prev, address: v }))
                      scheduleAddressSuggest()
                      scheduleGeocode()
                    }}
                    onBlur={() => {
                      scheduleGeocode()
                      setTimeout(() => setAddressSuggestions(null), 200)
                    }}
                    autoComplete="street-address"
                  />
                  {addressSuggesting && (
                    <span
                      style={{ fontSize: '0.7rem', opacity: 0.75, display: 'block', marginTop: 4 }}
                    >
                      {t('regSearchingAddresses')}
                    </span>
                  )}
                  {addressSuggestions && addressSuggestions.length > 0 && (
                    <ul
                      role="listbox"
                      style={{
                        position: 'absolute',
                        zIndex: 20,
                        left: 0,
                        right: 0,
                        top: '100%',
                        margin: '4px 0 0',
                        padding: 0,
                        listStyle: 'none',
                        background: 'var(--bg-card, #1e293b)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 8,
                        maxHeight: 220,
                        overflowY: 'auto',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                      }}
                    >
                      {addressSuggestions.map((h, i) => (
                        <li key={`${h.lat}-${h.lon}-${i}`}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={false}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => applyAddressSuggestion(h)}
                            style={{
                              display: 'block',
                              width: '100%',
                              textAlign: 'left',
                              padding: '10px 12px',
                              border: 'none',
                              borderBottom: '1px solid var(--border-subtle)',
                              background: 'transparent',
                              color: 'inherit',
                              fontSize: '0.85rem',
                              cursor: 'pointer',
                            }}
                          >
                            {h.displayLabel}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className="form-grid">
                <div>
                  <label className="label">{t('regKommuneLabel')}</label>
                  <input
                    type="text"
                    className="input"
                    placeholder={t('placeholderCity')}
                    value={formData.city}
                    onChange={(e) => {
                      setKommuneFromApiMissing(false)
                      setFormData((prev) => ({ ...prev, city: e.target.value }))
                      scheduleGeocode()
                    }}
                    onBlur={scheduleGeocode}
                    required
                  />
                  {kommuneFromApiMissing && (
                    <p
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--color-warning, #b45309)',
                        marginTop: 6,
                        marginBottom: 0,
                      }}
                    >
                      {t('regKommuneManualHint')}
                    </p>
                  )}
                </div>
                <div>
                  <label className="label">{t('regPostnrLabel')}</label>
                  <input
                    type="text"
                    className="input"
                    placeholder={t('placeholderPost4')}
                    maxLength={4}
                    required
                    value={formData.postal_code}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, postal_code: e.target.value }))
                      scheduleGeocode()
                    }}
                    onBlur={scheduleGeocode}
                  />
                </div>
              </div>
              {geocodeError && (
                <p
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--color-warning, #b45309)',
                    marginTop: 'var(--space-2)',
                  }}
                >
                  {geocodeError}
                </p>
              )}
              {geocodeCandidates && geocodeCandidates.length > 1 && (
                <div
                  role="group"
                  aria-label={t('regAddressPickAria')}
                  style={{
                    marginTop: 'var(--space-3)',
                    padding: 'var(--space-4)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'rgba(255,255,255,0.04)',
                  }}
                >
                  <p style={{ fontSize: '0.85rem', marginBottom: 'var(--space-3)', opacity: 0.9 }}>
                    {t('regGeocodeMultiHelp')}
                  </p>
                  <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                    {geocodeCandidates.map((h, i) => (
                      <button
                        key={`${h.lat}-${h.lon}-${i}`}
                        type="button"
                        onClick={() => selectGeocodeCandidate(i)}
                        style={{
                          textAlign: 'left',
                          padding: 'var(--space-3)',
                          borderRadius: '8px',
                          border: '1px solid var(--border-subtle)',
                          background: 'rgba(0,0,0,0.15)',
                          color: 'inherit',
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                        }}
                      >
                        {h.displayLabel}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Section 2: Boligdetaljer */}
            <section className="form-section">
              <h3
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  marginBottom: 'var(--space-5)',
                  color: 'var(--color-sky-blue)',
                }}
              >
                <Building size={20} /> {t('regDetailsSection')}
              </h3>
              <div className="form-grid">
                <div>
                  <label className="label">{t('regTypeLabel')}</label>
                  <select
                    className="input"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    <option>Enebolig/flermannsbolig</option>
                    <option>Leilighet</option>
                    <option>Hybelleilighet (sovealkove)</option>
                    <option>Hybel</option>
                    <option>Bokollektiv/bofelleskap</option>
                  </select>
                </div>
                <div>
                  <label className="label">{t('regSizeLabel')}</label>
                  <input
                    type="number"
                    className="input"
                    placeholder={t('placeholderSizeEg')}
                    required
                    min={1}
                    max={9999}
                    value={formData.size_sqm}
                    onChange={(e) => setFormData({ ...formData, size_sqm: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-grid">
                <div>
                  <label className="label">{t('regBedroomsLabel')}</label>
                  <input
                    type="number"
                    className="input"
                    placeholder={t('placeholderCount')}
                    required
                    min={0}
                    max={20}
                    value={formData.bedrooms}
                    onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginTop: 'var(--space-4)' }}>
                <label className="label">{t('regFloorLabel')}</label>
                <div
                  className="floor-detail-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 'var(--space-2)',
                  }}
                >
                  {['Underetasje', '1', '2', '3', '4'].map((f) => {
                    const selected = formData.floor_detail.includes(f)
                    return (
                      <button
                        type="button"
                        key={f}
                        onClick={() => toggleMultiSelect('floor_detail', f)}
                        style={{
                          padding: 'var(--space-2)',
                          background: selected ? 'var(--color-royal-blue)' : 'var(--bg-app)',
                          border: selected
                            ? '1px solid var(--color-royal-blue)'
                            : '1px solid var(--border-subtle)',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          color: selected ? '#fff' : 'var(--text-main)',
                        }}
                      >
                        {f}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div style={{ marginTop: 'var(--space-6)' }}>
                <label className="label">{t('regPhysicalAccess')}</label>

                <div
                  className="physical-access-info"
                  style={{
                    padding: 'var(--space-4)',
                    background: 'rgba(59, 130, 246, 0.1)',
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    marginBottom: 'var(--space-4)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    color: 'var(--text-body)',
                  }}
                >
                  <h4
                    className="physical-access-info-title"
                    style={{ marginBottom: 'var(--space-2)', fontSize: '0.9rem' }}
                  >
                    {t('regPhysicalAccessHelpTitle')}
                  </h4>
                  <ul style={{ paddingLeft: '1.2rem', display: 'grid', gap: 'var(--space-1)' }}>
                    <li>
                      <strong>Alt på ett plan:</strong> Ingen trapper eller høye dørstokker inne i
                      boenheten.
                    </li>
                    <li>
                      <strong>Heis i bygget:</strong> Bygget har heis som er stor nok for rullestol
                      eller barnevogn.
                    </li>
                    <li>
                      <strong>Terskelfritt:</strong> Ingen kanter høyere enn 2cm mellom rommene i
                      boligen.
                    </li>
                    <li>
                      <strong>Universell utforming:</strong> Boligen oppfyller krav til snuareal og
                      tilgjengelighet for alle.
                    </li>
                    <li>
                      <strong>Omsorgsbolig:</strong> Spesialtilpasset bolig med omfattende tilrettelegging
                      for pleie og praktisk bistand i hjemmet.
                    </li>
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
                    'Omsorgsboligstandard',
                  ].map((a) => (
                    <label
                      key={a}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-3)',
                        padding: 'var(--space-3)',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.accessibility.includes(a)}
                        onChange={() => toggleMultiSelect('accessibility', a)}
                      />
                      <span style={{ fontSize: '0.9rem' }}>{a}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 'var(--space-6)' }}>
                <label className="label">{t('regFurnishingLabel')}</label>
                <select
                  className="input"
                  value={formData.furnishing}
                  onChange={(e) => setFormData({ ...formData, furnishing: e.target.value })}
                >
                  <option>Umøblert</option>
                  <option>Kun hvitevarer</option>
                  <option>Fullt møblert</option>
                  <option>
                    Fullt møblert og boligen har alt nødvendig inventar for matlaging og
                    overnatting.
                  </option>
                </select>
              </div>
              <div style={{ marginTop: 'var(--space-4)' }}>
                <label className="label">{t('regPetsLabel')}</label>
                <select
                  className="input"
                  value={formData.pet_policy}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pet_policy: e.target.value as typeof formData.pet_policy,
                      pet_policy_detail:
                        e.target.value === 'Enkelte dyr er tillatt'
                          ? formData.pet_policy_detail
                          : '',
                    })
                  }
                >
                  <option value="Tillatt">Tillatt</option>
                  <option value="Ingen dyr tillatt">Ingen dyr tillatt</option>
                  <option value="Enkelte dyr er tillatt">Enkelte dyr er tillatt</option>
                </select>
                {formData.pet_policy === 'Enkelte dyr er tillatt' && (
                  <div style={{ marginTop: 'var(--space-3)' }}>
                    <label className="label">{t('regPetsDetailLabel')}</label>
                    <textarea
                      className="input"
                      rows={3}
                      placeholder={t('placeholderPetDetail')}
                      value={formData.pet_policy_detail}
                      onChange={(e) =>
                        setFormData({ ...formData, pet_policy_detail: e.target.value })
                      }
                      style={{ width: '100%', minHeight: '72px', resize: 'vertical' }}
                    />
                  </div>
                )}
              </div>
            </section>
          </div>

          <div
            className="register-form-sidebar"
            style={{ display: 'grid', gap: 'var(--space-6)', position: 'sticky', top: '20px' }}
          >
            {/* Section 3: Pris og Vilkår */}
            <section className="form-section">
              <h3
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  marginBottom: 'var(--space-5)',
                  color: 'var(--color-sky-blue)',
                }}
              >
                <Tag size={20} /> {t('regPriceSection')}
              </h3>
              <div className="form-grid">
                <div>
                  <label className="label">{t('regDailyPrice')}</label>
                  <input
                    type="number"
                    className="input"
                    placeholder={t('placeholderNok')}
                    required
                    min={0}
                    max={999999}
                    value={formData.price_daily}
                    onChange={(e) => setFormData({ ...formData, price_daily: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">{t('regWeeklyPrice')}</label>
                  <input
                    type="number"
                    className="input"
                    placeholder={t('placeholderNok')}
                    required
                    min={0}
                    max={999999}
                    value={formData.price_weekly}
                    onChange={(e) => setFormData({ ...formData, price_weekly: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-grid">
                <div>
                  <label className="label">{t('regMonthlyShort')}</label>
                  <input
                    type="number"
                    className="input"
                    placeholder={t('placeholderMonthsShort')}
                    required
                    min={0}
                    max={999999}
                    value={formData.price_monthly_short}
                    onChange={(e) =>
                      setFormData({ ...formData, price_monthly_short: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="label">{t('regMonthlyLong')}</label>
                  <input
                    type="number"
                    className="input"
                    placeholder={t('placeholderOptional')}
                    min={0}
                    max={999999}
                    value={formData.price_monthly_long}
                    onChange={(e) => {
                      const v = e.target.value
                      const n = parseFloat(v) || 0
                      setFormData((prev) => ({
                        ...prev,
                        price_monthly_long: v,
                        ...(n <= 0 ? { deposit_amount: '', deposit_guarantee: [] } : {}),
                      }))
                    }}
                  />
                </div>
              </div>

              <div style={{ marginTop: 'var(--space-4)' }}>
                <label className="label">{t('regIncludesLabel')}</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                  {['Ingenting inkludert', 'Strøm', 'Internett', 'Kabel-tv'].map((i) => {
                    const selected = formData.includes.includes(i)
                    return (
                      <button
                        type="button"
                        key={i}
                        onClick={() => toggleMultiSelect('includes', i)}
                        style={{
                          padding: 'var(--space-2) var(--space-4)',
                          background: selected ? 'var(--color-teal)' : 'var(--bg-app)',
                          border: selected
                            ? '1px solid var(--color-teal)'
                            : '1px solid var(--border-subtle)',
                          borderRadius: '20px',
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          color: selected ? '#fff' : 'var(--text-main)',
                        }}
                      >
                        {i}
                      </button>
                    )
                  })}
                </div>
              </div>

              {(parseFloat(String(formData.price_monthly_long)) || 0) > 0 && (
                <div style={{ marginTop: 'var(--space-6)' }}>
                  <label className="label">{t('regDepositSection')}</label>
                  <input
                    type="number"
                    className="input"
                    placeholder={t('placeholderDeposit')}
                    min={0}
                    max={9999999}
                    value={formData.deposit_amount}
                    onChange={(e) => setFormData({ ...formData, deposit_amount: e.target.value })}
                  />
                  <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                    {[
                      'Godtar depositumsgaranti fra Nav',
                      'Godtar depositumsgaranti fra andre tilbydere',
                      'Godtar ordinært depositum',
                    ].map((g) => (
                      <label
                        key={g}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-3)',
                          padding: 'var(--space-2)',
                          background: 'rgba(255,255,255,0.03)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={formData.deposit_guarantee.includes(g)}
                          onChange={() => toggleMultiSelect('deposit_guarantee', g)}
                        />
                        <span>{g}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="form-grid" style={{ marginTop: 'var(--space-6)' }}>
                <div>
                  <label className="label">{t('regParkingLabel')}</label>
                  <input
                    type="text"
                    className="input"
                    placeholder={t('placeholderParking')}
                    required
                    value={formData.parking_info}
                    onChange={(e) => setFormData({ ...formData, parking_info: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">{t('regMaxPersons')}</label>
                  <input
                    type="number"
                    className="input"
                    placeholder={t('placeholderCount')}
                    required
                    min={1}
                    max={50}
                    value={formData.max_occupants}
                    onChange={(e) => setFormData({ ...formData, max_occupants: e.target.value })}
                  />
                </div>
              </div>
            </section>

            {/* Section 4: Bilder & Annet */}
            <section className="form-section">
              <h3
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  marginBottom: 'var(--space-5)',
                  color: 'var(--color-sky-blue)',
                }}
              >
                <Camera size={20} /> {t('regImagesSection')}
              </h3>
              <div
                style={{
                  border: '2px dashed var(--border-medium)',
                  padding: 'var(--space-6)',
                  textAlign: 'center',
                  borderRadius: '16px',
                  background: 'var(--bg-app)',
                }}
              >
                <div
                  className="image-previews-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 'var(--space-2)',
                    marginBottom: 'var(--space-4)',
                  }}
                >
                  {imagePreviews.map((p, i) => (
                    <div
                      key={i}
                      style={{
                        position: 'relative',
                        aspectRatio: '1/1',
                        borderRadius: '8px',
                        overflow: 'hidden',
                      }}
                    >
                      <OptimizedPublicStorageImage
                        variant="fill"
                        src={p}
                        alt={`${t('regImagesSection')} — forhåndsvisning ${i + 1}`}
                        sizes="(max-width: 768px) 33vw, 220px"
                        style={{ objectFit: 'cover' }}
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        style={{
                          position: 'absolute',
                          top: 5,
                          right: 5,
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: 24,
                          height: 24,
                          cursor: 'pointer',
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <label
                  className="button"
                  style={{
                    backgroundColor: 'var(--color-muted-blue)',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />
                  {t('regUploadImages')}
                </label>
              </div>
              <div
                style={{
                  marginTop: 'var(--space-5)',
                  padding: 'var(--space-4)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-card)',
                }}
              >
                <label className="label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={18} style={{ color: 'var(--color-sky-blue)' }} />{' '}
                  {t('regHouseRulesLabel')}
                </label>
                <p
                  className="text-sm"
                  style={{ margin: 'var(--space-2) 0 var(--space-3)', opacity: 0.85 }}
                >
                  {t('regHouseRulesHint')}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
                  <label className="button button-secondary" style={{ cursor: 'pointer' }}>
                    <input
                      type="file"
                      accept="application/pdf"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        setHouseRulesFile(f ?? null)
                        e.target.value = ''
                      }}
                    />
                    {t('houseRulesChooseFile')}
                  </label>
                  {houseRulesFile && (
                    <span className="text-sm" style={{ color: 'var(--text-body)' }}>
                      {houseRulesFile.name}
                      <button
                        type="button"
                        onClick={() => setHouseRulesFile(null)}
                        style={{
                          marginLeft: 8,
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-accent)',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                        }}
                      >
                        {t('regHouseRulesClear')}
                      </button>
                    </span>
                  )}
                </div>
              </div>
              <div style={{ marginTop: 'var(--space-4)' }}>
                <label className="label">{t('regAdditionalInfo')}</label>
                <textarea
                  className="input"
                  placeholder={t('placeholderMoreDetails')}
                  value={formData.additional_info}
                  onChange={(e) => setFormData({ ...formData, additional_info: e.target.value })}
                ></textarea>
              </div>
            </section>
          </div>
        </div>

        <div
          className="register-form-footer"
          style={{
            marginTop: 'var(--space-4)',
            padding: 'var(--space-5) var(--space-6)',
            background: 'var(--bg-card)',
            borderRadius: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)',
            position: 'sticky',
            bottom: '20px',
            zIndex: 10,
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <label
            style={{
              display: 'flex',
              gap: '12px',
              cursor: 'pointer',
              alignItems: 'flex-start',
              color: 'var(--text-main)',
            }}
          >
            <input
              type="checkbox"
              required
              checked={formData.has_insurance}
              onChange={(e) => setFormData({ ...formData, has_insurance: e.target.checked })}
              style={{
                width: '20px',
                height: '20px',
                flexShrink: 0,
                marginTop: '2px',
                accentColor: 'var(--color-royal-blue)',
              }}
            />
            <div style={{ fontSize: '0.85rem', lineHeight: 1.45 }}>
              <span style={{ fontWeight: 700, display: 'block', color: 'var(--text-main)' }}>
                {t('regInsuranceTitle')}
              </span>
              <span style={{ color: 'var(--text-body)', marginTop: '4px', display: 'block' }}>
                {t('regInsuranceBody')}
              </span>
            </div>
          </label>
          <div className="form-primary-cta-row">
            <button
              type="submit"
              className="button"
              disabled={loading || !formData.has_insurance}
              style={{
                padding: 'var(--space-4) var(--space-10)',
                fontSize: '1.125rem',
                borderRadius: '14px',
              }}
            >
              {loading ? <Save size={22} style={{ opacity: 0.6 }} /> : <Save size={22} />}
              {loading ? t('regSaving') : t('regPublish')}
            </button>
          </div>
        </div>
      </form>
    </main>
  )
}
