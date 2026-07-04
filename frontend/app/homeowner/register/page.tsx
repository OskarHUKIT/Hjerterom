'use client'

import { useToast } from '@/app/components/design-system'
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
  CalendarDays,
} from 'lucide-react'
import { supabase, getAuthUserDeduped } from '../../lib/supabase'
import { useLanguage } from '../../../context/LanguageContext'
import {
  nominatimResultToGeocodeHit,
  searchNorwegianAddress,
  type GeocodeHit,
} from '../../lib/geocoding'
import { savePendingFirstListingDraft } from '../lib/pendingFirstListing'
import { getRegisterBackHref } from '../../lib/appHubNav'
import { getLandlordPostLoginHref } from '../../lib/landlordNavGate'
import { isKommuneSocialActiveForCity } from '../../lib/kommuneSocialSubscription'
import { isKommuneStaffRole } from '../../lib/kommuneRoles'
import { logError } from '@/app/lib/appLogger'
import { uploadHouseRulesPdf } from '../../lib/houseRulesPdf'
import PageSkeleton from '../../components/design-system/PageSkeleton'
import { Stepper, FileUploadZone } from '@/app/components/design-system'
import { Button } from '@/app/components/ui/Button'
import SharedAvailabilityCalendar from '@/features/listings/components/SharedAvailabilityCalendar'
import { usePlatformMode } from '@/context/PlatformModeContext'
import { Compass } from 'lucide-react'
import './register.css'

export default function HomeownerRegister() {
  const { t } = useLanguage()
  const toast = useToast()
  const router = useRouter()
  const { flags: platformFlags } = usePlatformMode()
  const [loading, setLoading] = useState(false)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [houseRulesFile, setHouseRulesFile] = useState<File | null>(null)
  const [hasSignedTerms, setHasSignedTerms] = useState<boolean | null>(null)
  const [backHref, setBackHref] = useState('/')
  const [socialKommuneActive, setSocialKommuneActive] = useState<boolean | null>(null)
  const [registerStep, setRegisterStep] = useState(0)
  const [draftPeriods, setDraftPeriods] = useState<
    { start: string; end: string; status: 'Tilgjengelig' | 'Utilgjengelig' }[]
  >([])
  const [availPaintStatus, setAvailPaintStatus] = useState<'Tilgjengelig' | 'Utilgjengelig'>(
    'Tilgjengelig'
  )
  const [availSelStart, setAvailSelStart] = useState<string | null>(null)
  const [availSelEnd, setAvailSelEnd] = useState<string | null>(null)

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
    tourism_enabled: false,
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

      const postLogin = await getLandlordPostLoginHref(supabase, user.id, user.email, {
        reuseProfileRole: profile?.role ?? null,
      })
      setBackHref(getRegisterBackHref(postLogin))
      setHasSignedTerms(!!ua && !ua.is_terminated)
    }
    checkTerms()
  }, [router])

  useEffect(() => {
    const city = formData.city?.trim()
    if (!city) {
      setSocialKommuneActive(null)
      return
    }
    let cancelled = false
    void isKommuneSocialActiveForCity(supabase, city).then((active) => {
      if (!cancelled) setSocialKommuneActive(active)
    })
    return () => {
      cancelled = true
    }
  }, [formData.city])

  const handleImageFiles = (files: File[]) => {
    if (!files.length) return
    setImageFiles([...imageFiles, ...files])
    setImagePreviews([...imagePreviews, ...files.map((file) => URL.createObjectURL(file))])
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
        toast(t('regValidationRequiredFields'), 'error')
        setLoading(false)
        return
      }
      if (fd.latitude == null || fd.longitude == null || Number.isNaN(Number(fd.latitude))) {
        toast(t('regValidationGeocode'), 'error')
        setLoading(false)
        return
      }
      if (!fd.has_insurance) {
        toast(t('regValidationInsurance'), 'error')
        setLoading(false)
        return
      }
      const priceMinSum =
        (parseFloat(String(fd.price_daily)) || 0) +
        (parseFloat(String(fd.price_weekly)) || 0) +
        (parseFloat(String(fd.price_monthly_short)) || 0) +
        (parseFloat(String(fd.price_monthly_long)) || 0)
      if (priceMinSum <= 0) {
        toast(t('regValidationPrice'), 'error')
        setLoading(false)
        return
      }
      const sizeSqmCheck = parseFloat(String(fd.size_sqm)) || 0
      const bedroomsCheck = parseInt(String(fd.bedrooms), 10)
      const maxOccCheck = parseInt(String(fd.max_occupants), 10)
      if (sizeSqmCheck <= 0 || Number.isNaN(bedroomsCheck) || bedroomsCheck < 0 || maxOccCheck < 1) {
        toast(t('regValidationSizeOccupants'), 'error')
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
        const socialActive = await isKommuneSocialActiveForCity(
          supabase,
          formData.city?.trim() || ''
        )
        if (socialActive) {
          const { data: termsOk, error: termsErr } = await supabase.rpc('listing_publish_terms_ok', {
            p_city: formData.city?.trim() || '',
          })
          if (termsErr) throw termsErr
          if (!termsOk) {
            toast(t('termsMissingForRegion'), 'error')
            router.push(
              `/homeowner/sign-terms?city=${encodeURIComponent(formData.city?.trim() || '')}&returnTo=${encodeURIComponent('/homeowner/register')}`
            )
            setLoading(false)
            return
          }
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

      const { has_insurance: _skip, tourism_enabled, ...listingFields } = formData
      const listingRow = {
        ...listingFields,
        tourism_enabled: Boolean(tourism_enabled),
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
        ...(formData.latitude != null && formData.longitude != null
          ? { map_lat: formData.latitude, map_lng: formData.longitude }
          : {}),
      }

      const socialActive = await isKommuneSocialActiveForCity(supabase, formData.city?.trim() || '')

      if (isFirstListing && !agreementRow && socialActive) {
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
          toast(msg, 'error')
        } else {
          const { error: hrDbErr } = await supabase
            .from('listings')
            .update({ house_rules_pdf_path: hr.path })
            .eq('id', listingId)
          if (hrDbErr) {
            logError('house_rules_pdf_path update', hrDbErr)
            toast(t('houseRulesUploadError'), 'error')
          }
        }
      }

      if (draftPeriods.length > 0) {
        const rows = draftPeriods.map((p) => ({
          listing_id: listingId,
          start_date: p.start,
          end_date: p.end,
          status: p.status,
          lane: 'shared',
        }))
        const { error: availErr } = await supabase.from('listing_availability').insert(rows)
        if (availErr) {
          logError('register draft availability', availErr)
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

      // Notify kommune staff only when social mediation is active for this city (PRD §6.2 L-7)
      if (socialActive) {
        const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'En utleier'
        const { data: kommuneProfiles } = await supabase
          .from('profiles')
          .select('id')
          .in('role', ['kommune_ansatt', 'kommune_admin'])
        const eventId = crypto.randomUUID()
        const rows = (kommuneProfiles || []).map((p: { id: string }) => ({
          listing_id: listingId,
          owner_id: p.id,
          type: 'NEW_LISTING',
          title: t('landlordNewListingNotificationTitle'),
          message: t('landlordNewListingNotificationBody')
            .replace('{city}', formData.city)
            .replace('{address}', formData.address)
            .replace('{name}', userName),
          municipality: formData.city,
          event_id: eventId,
        }))
        if (rows.length > 0) {
          await supabase.from('notifications').insert(rows)
        }
      }

      toast(socialActive ? t('registerSuccess') : t('registerSuccessTourismOnly'), 'success')

      const { data: agreementAfter } = await supabase
        .from('user_agreements')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_terminated', false)
        .maybeSingle()

      const cityQ = encodeURIComponent(formData.city?.trim() || '')
      const returnTo = encodeURIComponent('/homeowner/manage')
      if (!agreementAfter && socialActive) {
        router.push(`/homeowner/sign-terms?city=${cityQ}&returnTo=${returnTo}`)
        return
      }

      router.push(`/homeowner/listings/${listingId}`)
    } catch (err: any) {
      const message =
        err?.message ??
        err?.error_description ??
        (typeof err === 'string' ? err : JSON.stringify(err))
      logError('Error saving listing:', message, err)
      toast(t('errSaveListing') + (message || t('errUnknown')), 'error')
    } finally {
      setLoading(false)
    }
  }

  if (hasSignedTerms === null) return <PageSkeleton minHeight={400} />

  return (
    <main className="container">
      <div className="register-page-header">
        <Link href={backHref} className="nav-link register-back-link">
          <ArrowLeft size={18} />{' '}
          {backHref === '/homeowner/manage' ? t('regBack') : t('backToHome')}
        </Link>
        <h1 className="register-title">{t('regTitle')}</h1>
        <p className="register-lead">{t('regLead')}</p>
        {socialKommuneActive === false && (
          <div className="card hrt-callout hrt-callout--accent register-callout" role="status">
            <strong>{t('landlordNonSubscribedTitle')}</strong>
            <p>{t('landlordNonSubscribedBody')}</p>
          </div>
        )}
        <Stepper
          currentStep={registerStep}
          steps={[
            { id: 'bolig', label: t('regStepBolig') },
            { id: 'lanes', label: t('regStepLanes') },
            { id: 'availability', label: t('regStepAvailability') },
            { id: 'agreements', label: t('regStepAgreements') },
          ]}
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              savePendingFirstListingDraft({ ...formData, v: 'draft-only' })
              toast(t('regDraftSaved'), 'success')
            }}
          >
            {t('regSaveDraft')}
          </Button>
          {registerStep > 0 ? (
            <Button type="button" variant="secondary" onClick={() => setRegisterStep((s) => Math.max(0, s - 1))}>
              ←
            </Button>
          ) : null}
          {registerStep < 3 ? (
            <Button type="button" variant="accent" onClick={() => setRegisterStep((s) => Math.min(3, s + 1))}>
              →
            </Button>
          ) : null}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="register-form">
        <div className="register-form-columns">
          <div className="register-form-main-col">
            {/* Section 1: Basic Info & Kontakt */}
            <section className="form-section" hidden={registerStep !== 0}>
              <h3 className="form-section-heading">
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
              <div className="form-subpanel">
                <label className="label">{t('paymentMethodLabel')}</label>
                <div className="form-radio-stack">
                  <label className="form-radio-label">
                    <input
                      type="radio"
                      name="payment_method"
                      checked={formData.payment_method === 'faktura'}
                      onChange={() => setFormData({ ...formData, payment_method: 'faktura' })}
                    />
                    <span>{t('paymentMethodFaktura')}</span>
                  </label>
                  <label className="form-radio-label">
                    <input
                      type="radio"
                      name="payment_method"
                      checked={formData.payment_method === 'konto'}
                      onChange={() => setFormData({ ...formData, payment_method: 'konto' })}
                    />
                    <span>{t('paymentMethodKonto')}</span>
                  </label>
                </div>
                <p className="form-hint">{t('paymentMethodKontoHint')}</p>
              </div>
              <div className="form-field-block">
                <div className="form-field-header">
                  <label className="label">{t('regStreetLabel')}</label>
                  <div className="form-geocode-tools">
                    {geocodeLoading && (
                      <span className="form-geocode-status">{t('regGeocodeSearching')}</span>
                    )}
                    {!geocodeLoading &&
                      formData.latitude != null &&
                      formData.longitude != null &&
                      !geocodeCandidates?.length && (
                        <span className="form-geocode-ok">
                          <CheckCircle2 size={12} /> {t('regPositionSet')}
                        </span>
                      )}
                    <button
                      type="button"
                      onClick={() => void runGeocode()}
                      title={t('regGeocodeTitle')}
                      className="form-geocode-btn"
                    >
                      {t('regUpdateMapBtn')}
                    </button>
                  </div>
                </div>
                <div className="form-address-wrap">
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
                    <span className="form-address-hint">{t('regSearchingAddresses')}</span>
                  )}
                  {addressSuggestions && addressSuggestions.length > 0 && (
                    <ul role="listbox" className="form-address-list">
                      {addressSuggestions.map((h, i) => (
                        <li key={`${h.lat}-${h.lon}-${i}`}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={false}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => applyAddressSuggestion(h)}
                            className="form-address-option"
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
                    <p className="form-warning form-warning--tight">{t('regKommuneManualHint')}</p>
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
              {geocodeError && <p className="form-warning">{geocodeError}</p>}
              {geocodeCandidates && geocodeCandidates.length > 1 && (
                <div role="group" aria-label={t('regAddressPickAria')} className="form-candidate-group">
                  <p className="form-candidate-help">{t('regGeocodeMultiHelp')}</p>
                  <div className="form-candidate-list">
                    {geocodeCandidates.map((h, i) => (
                      <button
                        key={`${h.lat}-${h.lon}-${i}`}
                        type="button"
                        onClick={() => selectGeocodeCandidate(i)}
                        className="form-candidate-btn"
                      >
                        {h.displayLabel}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Section 2: Boligdetaljer */}
            <section className="form-section" hidden={registerStep !== 0}>
              <h3 className="form-section-heading">
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

              <div className="form-field-block">
                <label className="label">{t('regFloorLabel')}</label>
                <div className="floor-detail-grid">
                  {['Underetasje', '1', '2', '3', '4'].map((f) => {
                    const selected = formData.floor_detail.includes(f)
                    return (
                      <button
                        type="button"
                        key={f}
                        onClick={() => toggleMultiSelect('floor_detail', f)}
                        className={`form-chip${selected ? ' form-chip--selected' : ''}`}
                      >
                        {f}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="form-field-block--lg">
                <label className="label">{t('regPhysicalAccess')}</label>

                <div className="physical-access-info">
                  <h4 className="physical-access-info-title">{t('regPhysicalAccessHelpTitle')}</h4>
                  <ul className="physical-access-info-list">
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

                <div className="form-check-stack">
                  {[
                    'Ikke tilrettelagt og boligen har utendørs trapp',
                    'Ikke tilrettelagt og boligen har innendørs trapp',
                    'Alt på ett plan',
                    'Heis i bygget',
                    'Terskelfritt',
                    'Universell utforming',
                    'Omsorgsboligstandard',
                  ].map((a) => (
                    <label key={a} className="form-check-row">
                      <input
                        type="checkbox"
                        checked={formData.accessibility.includes(a)}
                        onChange={() => toggleMultiSelect('accessibility', a)}
                      />
                      <span>{a}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-field-block--lg">
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
              <div className="form-field-block">
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
                  <div className="form-field-block">
                    <label className="label">{t('regPetsDetailLabel')}</label>
                    <textarea
                      className="input form-textarea-tall"
                      rows={3}
                      placeholder={t('placeholderPetDetail')}
                      value={formData.pet_policy_detail}
                      onChange={(e) =>
                        setFormData({ ...formData, pet_policy_detail: e.target.value })
                      }
                    />
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="register-form-sidebar">
            <section className="form-section" hidden={registerStep !== 0}>
              <h3 className="form-section-heading">
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

              <div className="form-field-block">
                <label className="label">{t('regIncludesLabel')}</label>
                <div className="form-pill-row">
                  {['Ingenting inkludert', 'Strøm', 'Internett', 'Kabel-tv'].map((i) => {
                    const selected = formData.includes.includes(i)
                    return (
                      <button
                        type="button"
                        key={i}
                        onClick={() => toggleMultiSelect('includes', i)}
                        className={`form-pill${selected ? ' form-pill--selected' : ''}`}
                      >
                        {i}
                      </button>
                    )
                  })}
                </div>
              </div>

              {(parseFloat(String(formData.price_monthly_long)) || 0) > 0 && (
                <div className="form-deposit-grid">
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
                  <div className="form-check-stack">
                    {[
                      'Godtar depositumsgaranti fra Nav',
                      'Godtar depositumsgaranti fra andre tilbydere',
                      'Godtar ordinært depositum',
                    ].map((g) => (
                      <label key={g} className="form-check-row">
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

              <div className="form-grid form-grid-spaced">
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
            <section className="form-section" hidden={registerStep !== 0}>
              <h3 className="form-section-heading">
                <Camera size={20} /> {t('regImagesSection')}
              </h3>
              <div className="register-upload-dropzone">
                <div className="image-previews-grid">
                  {imagePreviews.map((p, i) => (
                    <div key={i} className="image-preview-item">
                      <OptimizedPublicStorageImage
                        variant="fill"
                        src={p}
                        alt={`${t('regImagesSection')} — forhåndsvisning ${i + 1}`}
                        sizes="(max-width: 768px) 33vw, 220px"
                        className="image-preview-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="image-preview-remove"
                        aria-label={t('regHouseRulesClear')}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <FileUploadZone
                  title={t('regUploadImages')}
                  hint={t('listingImageDropzoneHint')}
                  accept="image/*"
                  onFiles={handleImageFiles}
                />
              </div>
              <div className="register-house-rules-panel">
                <label className="label register-house-rules-heading">
                  <FileText size={18} aria-hidden /> {t('regHouseRulesLabel')}
                </label>
                <p className="text-sm register-house-rules-hint">{t('regHouseRulesHint')}</p>
                <div className="register-file-row">
                  <label className="button button-secondary register-upload-btn">
                    <input
                      type="file"
                      accept="application/pdf"
                      className="sr-input"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        setHouseRulesFile(f ?? null)
                        e.target.value = ''
                      }}
                    />
                    {t('houseRulesChooseFile')}
                  </label>
                  {houseRulesFile && (
                    <span className="text-sm register-file-name">
                      {houseRulesFile.name}
                      <button
                        type="button"
                        onClick={() => setHouseRulesFile(null)}
                        className="register-file-clear"
                      >
                        {t('regHouseRulesClear')}
                      </button>
                    </span>
                  )}
                </div>
              </div>
              <div className="form-field-block">
                <label className="label">{t('regAdditionalInfo')}</label>
                <textarea
                  className="input"
                  placeholder={t('placeholderMoreDetails')}
                  value={formData.additional_info}
                  onChange={(e) => setFormData({ ...formData, additional_info: e.target.value })}
                />
              </div>
            </section>

            <section className="form-section" hidden={registerStep !== 1}>
              <h3 className="form-section-heading">
                <Compass size={20} /> {t('regLanesSection')}
              </h3>
              {socialKommuneActive !== false ? (
                <p className="text-sm register-lanes-hint">{t('regLanesSocialHint')}</p>
              ) : null}
              {platformFlags.tourism ? (
                <div className="register-lanes-tourism card">
                  <p className="text-sm">{t('regLanesTourismHint')}</p>
                  <label className="register-lanes-toggle">
                    <input
                      type="checkbox"
                      checked={formData.tourism_enabled}
                      onChange={(e) =>
                        setFormData({ ...formData, tourism_enabled: e.target.checked })
                      }
                    />
                    {t('regLanesTourismEnable')}
                  </label>
                </div>
              ) : null}
            </section>

            <section className="form-section" hidden={registerStep !== 2}>
              <h3 className="form-section-heading">
                <CalendarDays size={20} /> {t('regAvailabilitySection')}
              </h3>
              <p className="text-sm register-availability-lead">{t('regAvailabilityLead')}</p>
              <SharedAvailabilityCalendar
                periods={draftPeriods.map((p, i) => ({
                  id: String(i),
                  start_date: p.start,
                  end_date: p.end,
                  status: p.status,
                  lane: 'shared',
                }))}
                eventOptIns={[]}
                paintStatus={availPaintStatus}
                onPaintStatusChange={setAvailPaintStatus}
                selectionStart={availSelStart}
                selectionEnd={availSelEnd}
                onSelectionChange={(s, e) => {
                  setAvailSelStart(s)
                  setAvailSelEnd(e)
                }}
                onApply={(start, end, status) => {
                  setDraftPeriods((prev) => [...prev, { start, end, status }])
                  setAvailSelStart(null)
                  setAvailSelEnd(null)
                  toast(t('sharedCalendarSaved'), 'success')
                }}
                tourismEnabled={Boolean(formData.tourism_enabled)}
              />
            </section>

            <section className="form-section" hidden={registerStep !== 3}>
              <h3 className="form-section-heading">
                <ShieldCheck size={20} /> {t('regAgreementsSection')}
              </h3>
              <p className="text-sm">{t('regAgreementsLead')}</p>
            </section>
          </div>
        </div>

        <div className="register-form-footer" hidden={registerStep !== 3}>
          <label className="register-insurance-label">
            <input
              type="checkbox"
              required
              checked={formData.has_insurance}
              onChange={(e) => setFormData({ ...formData, has_insurance: e.target.checked })}
              className="register-insurance-checkbox"
            />
            <div className="register-insurance-copy">
              <span className="register-insurance-title">{t('regInsuranceTitle')}</span>
              <span className="register-insurance-body">{t('regInsuranceBody')}</span>
            </div>
          </label>
          <div className="form-primary-cta-row">
            <button
              type="submit"
              className="button register-submit-btn"
              disabled={loading || !formData.has_insurance}
            >
              {loading ? <Save size={22} className="is-busy" /> : <Save size={22} />}
              {loading ? t('regSaving') : t('regPublish')}
            </button>
          </div>
        </div>
      </form>
    </main>
  )
}
