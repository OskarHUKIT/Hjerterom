'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { User as AuthUser } from '@supabase/supabase-js'
import { supabase, getAuthUserDeduped } from '../../lib/supabase'
import { devWarn, logError } from '@/app/lib/appLogger'
import { useLanguage } from '../../../context/LanguageContext'
import {
  MapPin,
  Bed,
  Users,
  ShieldCheck,
  ArrowLeft,
  Calendar,
  Info,
  Phone,
  User,
  Home as HomeIcon,
  CheckCircle2,
  Ruler,
  Building,
  Tag,
  Wifi,
  Zap,
  Tv,
  Clipboard,
  MessageSquare,
  Send,
  Trash2,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Maximize2,
  X,
  Plus,
  Camera,
  ImagePlus,
  Edit3,
  FileText,
  RotateCcw,
  RefreshCw,
  Lock,
} from 'lucide-react'

import { Button } from '../../components/ui/Button'
import { OptimizedPublicStorageImage } from '../../components/OptimizedPublicStorageImage'
import { formatDateNo, formatDateTimeNo } from '../../lib/dateFormat'
import { geocodeAddressBestEffort } from '../../lib/geocoding'
import { supabaseErrorMessage } from '../../lib/supabaseErrorMessage'
import { dayAvailabilityToneForIso } from '../../lib/listingDayAvailabilityTone'
import {
  listingRowFieldsForAvailabilityToday,
  formidlaPeriodIdsOverlappingToday,
} from '../../lib/listingAvailabilityStatusToday'
import { DateInput } from '../../components/DateInput'
import {
  appendMediationNoteToOwnerMessage,
  MAX_MEDIATION_NOTE_IN_NOTIFICATION,
} from '../../lib/formidletNotification'
import { notifyLandlordInvoiceBasisIfKonto } from '../../lib/invoiceBasisNotify'
import { isKommuneStaffRole } from '../../lib/kommuneRoles'
import { publicContactInfoFormPdfUrl, publicDocumentsFileUrl } from '../../lib/storagePublicUrl'
import {
  getHouseRulesPublicUrl,
  removeHouseRulesPdfObject,
  uploadHouseRulesPdf,
} from '../../lib/houseRulesPdf'

/** Synlig plassholder mens tyngre chunk lastes (unngår «tom side» / opplevd feil). */
function DeferredChunkPlaceholder({ minHeight }: { minHeight: number }) {
  return (
    <div
      role="status"
      aria-busy="true"
      style={{
        minHeight,
        borderRadius: 20,
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
      }}
    />
  )
}

const HandoverReport = dynamic(() => import('../../components/HandoverReport'), {
  ssr: false,
  loading: () => <DeferredChunkPlaceholder minHeight={140} />,
})
const InvoiceBasisSection = dynamic(() => import('./InvoiceBasisSection'), {
  ssr: false,
  loading: () => <DeferredChunkPlaceholder minHeight={96} />,
})

/** Verdier i `listings.deposit_guarantee` – må samsvare med registreringsskjema. */
const DEPOSIT_GUARANTEE_VALUES = {
  nav: 'Godtar depositumsgaranti fra Nav',
  other: 'Godtar depositumsgaranti fra andre tilbydere',
  ordinary: 'Godtar ordinært depositum',
} as const

function hasDepositGuarantee(arr: unknown, key: keyof typeof DEPOSIT_GUARANTEE_VALUES): boolean {
  return Array.isArray(arr) && arr.includes(DEPOSIT_GUARANTEE_VALUES[key])
}

/** image_urls kan komme som jsonb-array eller (sjeldent) serialisert JSON-streng fra API. */
function normalizeListingImageUrls(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
  }
  if (typeof raw === 'string' && raw.trim()) {
    const t = raw.trim()
    if (t.startsWith('[')) {
      try {
        const p = JSON.parse(t)
        if (Array.isArray(p))
          return p.filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
      } catch {
        /* enkelt URL-streng */
      }
    }
    return [t]
  }
  return []
}

/** True om boligen er markert formidlet (rad i listing_availability eller status på listing). */
function listingHasFormidlaPeriod(avail: { status?: string }[] | null | undefined): boolean {
  return !!avail?.some((p) => p.status === 'Formidla')
}

function errMessage(err: unknown): string {
  return supabaseErrorMessage(err)
}

export default function ListingDetailsClient() {
  const { id: idParam } = useParams()
  const id = typeof idParam === 'string' ? idParam : idParam?.[0] ?? ''
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useLanguage()
  const viewMode = searchParams.get('view') // 'nav' eller 'owner'
  const isNavView = viewMode === 'nav'

  const [listing, setListing] = useState<any>(null)
  const [availability, setAvailability] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [navNotes, setNavNotes] = useState<any[]>([])
  const [newNote, setNewNote] = useState('')
  const [copyFeedback, setCopyFeedback] = useState(false)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [handoverReports, setHandoverReports] = useState<any[]>([])
  const [showHandoverForm, setShowHandoverForm] = useState(false)
  const [tenantReportToken, setTenantReportToken] = useState<string | null>(null)
  const [tenantLinkRegenerating, setTenantLinkRegenerating] = useState(false)
  const [hasActiveAgreement, setHasActiveAgreement] = useState(false)
  const [reportTimeFilter, setReportTimeFilter] = useState<'all' | '7d' | '30d'>('all')
  const [reportTimeFilterOpen, setReportTimeFilterOpen] = useState(false)
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null)
  const [requestChangeReport, setRequestChangeReport] = useState<any | null>(null)
  const [requestChangeComment, setRequestChangeComment] = useState('')
  const [requestChangeSending, setRequestChangeSending] = useState(false)
  const [regionAccessDenied, setRegionAccessDenied] = useState(false)
  const [showNavNotes, setShowNavNotes] = useState(false)
  const [kommuneCanEdit, setKommuneCanEdit] = useState(false)
  /** True når innlogget bruker er kommune (for meldingslenke til utleier utenfor nav-visning). */
  const [viewerIsKommuneStaff, setViewerIsKommuneStaff] = useState(false)
  /** Utleierens user_agreements.is_terminated – blokkerer formidling og melding i Nav-visning */
  const [ownerAgreementTerminated, setOwnerAgreementTerminated] = useState(false)
  const [pendingDeletePeriod, setPendingDeletePeriod] = useState<{
    id: string
    status: string
  } | null>(null)

  // Gallery state
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [houseRulesBusy, setHouseRulesBusy] = useState(false)
  const [isSaving, setIsSaving] = useState<string | null>(null)

  // Formidling state (kommune)
  const [formidletStart, setFormidletStart] = useState('')
  const [formidletEnd, setFormidletEnd] = useState('')
  const [formidletSending, setFormidletSending] = useState(false)
  const [formidletMediationNote, setFormidletMediationNote] = useState('')
  const [formidletIncludeNoteInNotification, setFormidletIncludeNoteInNotification] =
    useState(false)
  const [mediationReservation, setMediationReservation] = useState<
    (Record<string, any> & { reserved_by_name?: string }) | null
  >(null)
  const [reservationNote, setReservationNote] = useState('')
  const [reservationLoading, setReservationLoading] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  useEffect(() => {
    if (!isFullscreen) return
    const y = window.scrollY
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.scrollTo(0, y)
      window.removeEventListener('keydown', onKey)
    }
  }, [isFullscreen])

  const isOwner = currentUser?.id === listing?.owner_id

  const normalizedImageUrls = normalizeListingImageUrls(listing?.image_urls)
  const allImages =
    normalizedImageUrls.length > 0
      ? normalizedImageUrls
      : listing?.image_url && String(listing.image_url).trim()
        ? [String(listing.image_url).trim()]
        : []

  const showGalleryFormidlet =
    listing?.status === 'Formidla' || listingHasFormidlaPeriod(availability)

  /** Utleier kan ikke endre boligdata (listings) når boligen er formidlet; fakturagrunnlag er egen tabell. */
  const canOwnerEditListingDetail = isOwner && !isNavView && !showGalleryFormidlet

  const hasHouseRulesPdf = Boolean(
    listing?.house_rules_pdf_path && String(listing.house_rules_pdf_path).trim()
  )
  const houseRulesPublicUrl = hasHouseRulesPdf
    ? getHouseRulesPublicUrl(supabase, listing?.house_rules_pdf_path)
    : null
  const showHouseRulesSection = hasHouseRulesPdf || (isOwner && !isNavView)

  const translateType = (type: string) => {
    if (!type) return ''
    const mapping: Record<string, string> = {
      'Short-term': 'Korttid',
      'Long-term': 'Langtid',
      Apartment: 'Leilighet',
      House: 'Enebolig',
      Shared: 'Bofelleskap',
    }
    return mapping[type] || type
  }

  const handleUpdateField = async (field: string, value: unknown) => {
    if (!listing || !currentUser || !isOwner || isNavView) return

    if (showGalleryFormidlet) {
      alert(t('ownerCannotEditListingWhenFormidlet'))
      return
    }

    if (!hasActiveAgreement) {
      alert(t('signAgreementToEdit'))
      router.push(
        `/homeowner/sign-terms?city=${encodeURIComponent((listing?.city || '').trim())}&returnTo=${encodeURIComponent(`/listings/${id}`)}`
      )
      return
    }

    setIsSaving(field)
    try {
      const { error } = await supabase
        .from('listings')
        .update({ [field]: value })
        .eq('id', id)

      if (error) throw error

      const nextListing = { ...listing, [field]: value }
      setListing(nextListing)

      if (['address', 'city', 'postal_code'].includes(field)) {
        const hit = await geocodeAddressBestEffort({
          address: String(nextListing.address || ''),
          postal_code: String(nextListing.postal_code || ''),
          city: String(nextListing.city || ''),
        })
        if (hit && Number.isFinite(hit.lat) && Number.isFinite(hit.lon)) {
          const { error: geoErr } = await supabase
            .from('listings')
            .update({ latitude: hit.lat, longitude: hit.lon })
            .eq('id', id)
          if (!geoErr) {
            setListing({ ...nextListing, latitude: hit.lat, longitude: hit.lon })
          }
        }
      }

      // Log event
      await supabase.from('audit_logs').insert([
        {
          user_id: currentUser.id,
          action_type: 'UPDATE_FIELD',
          listing_id: id,
          listing_address: nextListing.address,
          details: { field, value },
        },
      ])
    } catch (err: unknown) {
      alert(t('errorSaving') + errMessage(err))
    } finally {
      setIsSaving(null)
    }
  }

  /** Én atomisk lagring — to separate handleUpdateField-kall overskrev pet_policy med gammel state fra closure. */
  const handlePetPolicyChange = async (v: string) => {
    if (!listing || !isOwner || isNavView) return
    if (showGalleryFormidlet) {
      alert(t('ownerCannotEditListingWhenFormidlet'))
      return
    }
    if (!hasActiveAgreement) {
      alert(t('signAgreementToEdit'))
      router.push(
        `/homeowner/sign-terms?city=${encodeURIComponent((listing?.city || '').trim())}&returnTo=${encodeURIComponent(`/listings/${id}`)}`
      )
      return
    }
    const nextDetail = v === 'Enkelte dyr er tillatt' ? listing.pet_policy_detail || '' : ''
    const nextListing = { ...listing, pet_policy: v, pet_policy_detail: nextDetail }
    const previous = listing
    setListing(nextListing)
    setIsSaving('pet_policy')
    try {
      const { error } = await supabase
        .from('listings')
        .update({ pet_policy: v, pet_policy_detail: nextDetail })
        .eq('id', id)
      if (error) throw error
      await supabase.from('audit_logs').insert([
        {
          user_id: currentUser?.id,
          action_type: 'UPDATE_FIELD',
          listing_id: id,
          listing_address: nextListing.address,
          details: { field: 'pet_policy', value: v, pet_policy_detail: nextDetail },
        },
      ])
    } catch (err: unknown) {
      alert(t('errorSaving') + errMessage(err))
      setListing(previous)
    } finally {
      setIsSaving(null)
    }
  }

  const loadMediationReservation = useCallback(async () => {
    if (!id || !isNavView) return
    await supabase.rpc('expire_stale_mediation_reservations')
    const { data: resRow } = await supabase
      .from('listing_mediation_reservations')
      .select('*')
      .eq('listing_id', id)
      .eq('status', 'active')
      .maybeSingle()
    if (!resRow) {
      setMediationReservation(null)
      return
    }
    const { data: n } = await supabase.rpc('get_user_display_name', {
      p_user_id: resRow.reserved_by,
    })
    setMediationReservation({ ...resRow, reserved_by_name: typeof n === 'string' ? n : '…' })
  }, [id, isNavView])

  const handleReserveMediation = async () => {
    if (!listing || !isNavView || !kommuneCanEdit) return
    if (ownerAgreementTerminated) {
      alert(t('expiredOwnerNoMediationNav'))
      return
    }
    setReservationLoading(true)
    try {
      const { error } = await supabase.rpc('reserve_listing_mediation', {
        p_listing_id: id,
        p_note: reservationNote.trim() || null,
      })
      if (error) throw error
      await loadMediationReservation()
      setReservationNote('')
    } catch (e: unknown) {
      const m = errMessage(e)
      alert(t('mediationReserveError') + (m ? `: ${m}` : ''))
    } finally {
      setReservationLoading(false)
    }
  }

  const handleReleaseMediation = async () => {
    if (!listing || !isNavView) return
    if (ownerAgreementTerminated) {
      alert(t('expiredOwnerNoMediationNav'))
      return
    }
    setReservationLoading(true)
    try {
      const { error } = await supabase.rpc('release_listing_mediation', { p_listing_id: id })
      if (error) throw error
      await loadMediationReservation()
    } catch (e: unknown) {
      const m = errMessage(e)
      alert(t('mediationReserveError') + (m ? `: ${m}` : ''))
    } finally {
      setReservationLoading(false)
    }
  }

  const handleAddFormidletPeriod = async () => {
    if (!listing || !isNavView) return
    if (ownerAgreementTerminated) {
      alert(t('expiredOwnerNoMediationNav'))
      return
    }
    if (!formidletStart || !formidletEnd) {
      alert(t('selectStartEndFormidling'))
      return
    }
    if (mediationReservation && mediationReservation.reserved_by !== currentUser?.id) {
      alert(t('mediationBlockedFormidlet'))
      return
    }
    if (new Date(formidletEnd) < new Date(formidletStart)) {
      alert(t('endDateAfterStart'))
      return
    }
    const start = formidletStart
    const end = formidletEnd
    const savedNote = formidletMediationNote
    const savedInclude = formidletIncludeNoteInNotification
    const noteTrimmed = formidletMediationNote.trim()
    const includeNote = !!(formidletIncludeNoteInNotification && noteTrimmed)
    setFormidletSending(true)
    const newPeriod = {
      id: crypto.randomUUID(),
      listing_id: id,
      start_date: start,
      end_date: end,
      status: 'Formidla',
      mediation_note: noteTrimmed || null,
      include_note_in_owner_notification: includeNote,
    }
    setAvailability((prev) => {
      const next = [...prev, newPeriod].sort((a, b) => (a.start_date > b.start_date ? 1 : -1))
      const sync = listingRowFieldsForAvailabilityToday(String(id), { [String(id)]: next })
      setListing((L: any) => (L ? { ...L, ...sync } : L))
      return next
    })
    setFormidletStart('')
    setFormidletEnd('')
    setFormidletMediationNote('')
    setFormidletIncludeNoteInNotification(false)
    try {
      const { error: availError } = await supabase.from('listing_availability').insert([
        {
          listing_id: id,
          start_date: start,
          end_date: end,
          status: 'Formidla',
          mediation_note: noteTrimmed || null,
          include_note_in_owner_notification: includeNote,
        },
      ])
      if (availError) throw availError
      const { data: availData } = await supabase
        .from('listing_availability')
        .select('*')
        .eq('listing_id', id)
        .order('start_date')
      const rows = availData ?? []
      setAvailability(rows)
      const rowSync = listingRowFieldsForAvailabilityToday(String(id), { [String(id)]: rows })
      const { error } = await supabase.from('listings').update(rowSync).eq('id', id)
      if (error) throw error
      setListing((L: any) => (L ? { ...L, ...rowSync } : L))
      const user = await getAuthUserDeduped()
      if (listing?.owner_id) {
        await supabase.from('audit_logs').insert([
          {
            user_id: listing.owner_id,
            listing_id: id,
            action_type: 'KOMMUNE_MARK_FORMIDLA',
            listing_address: listing.address,
            details: {
              performed_by_user_id: user?.id,
              start_date: start,
              end_date: end,
              include_note_in_owner_notification: includeNote,
              has_mediation_note: !!noteTrimmed,
            },
          },
        ])
      }
      if (listing?.owner_id) {
        await supabase
          .from('listing_tenant_tokens')
          .upsert([{ listing_id: id }], { onConflict: 'listing_id' })
        const baseMsg = `Boligen din i ${listing.address} er markert som formidlet for perioden ${start}–${end}. Lever overtakelsesrapport ved overtakelse – klikk for å åpne skjema.`
        const message = appendMediationNoteToOwnerMessage(baseMsg, noteTrimmed, includeNote)
        await supabase
          .from('notifications')
          .insert([
            {
              owner_id: listing.owner_id,
              type: 'HOUSE_FORMIDLET',
              title: 'Bolig formidlet',
              message,
              listing_id: id,
            },
          ])
        await notifyLandlordInvoiceBasisIfKonto(supabase, {
          ownerId: listing.owner_id,
          listingId: String(id),
          address: listing.address,
          paymentMethod: listing.payment_method,
        })
      }
    } catch (rollbackErr: unknown) {
      setListing({ ...listing, status: listing.status, is_available: listing.is_available })
      setAvailability(availability)
      setFormidletStart(start)
      setFormidletEnd(end)
      setFormidletMediationNote(savedNote)
      setFormidletIncludeNoteInNotification(savedInclude)
      alert(t('errorPrefix') + errMessage(rollbackErr))
    } finally {
      setFormidletSending(false)
    }
  }

  // Hjelper: status for en gitt dato ut fra tilgjengelighetsperioder (Formidla prioriteres)
  const getStatusForDate = (date: Date) => {
    const ymd = (d: Date) => d.toISOString().slice(0, 10)
    const t = ymd(date)
    const hits = availability.filter((p) => t >= p.start_date && t <= p.end_date)
    if (hits.length === 0) return null
    if (hits.some((h) => h.status === 'Formidla')) return 'Formidla'
    if (hits.length > 1) {
      const statuses = new Set(hits.map((h) => h.status))
      if (statuses.size > 1) return 'Konflikt'
    }
    if (hits.some((h) => h.status === 'Utilgjengelig')) return 'Utilgjengelig'
    return hits[0]?.status ?? null
  }

  const handleRemovePeriod = async (period: { id: string; status: string }) => {
    if (isNavView && ownerAgreementTerminated) {
      alert(t('expiredOwnerNoMediationNav'))
      return
    }
    const prevAvailability = [...availability]
    const nextAvailAfterDelete = prevAvailability.filter((x) => x.id !== period.id)
    setAvailability(nextAvailAfterDelete)
    setPendingDeletePeriod(null)
    try {
      const { error } = await supabase.from('listing_availability').delete().eq('id', period.id)
      if (error) throw error
      const rowSync = listingRowFieldsForAvailabilityToday(String(id), {
        [String(id)]: nextAvailAfterDelete,
      })
      if (listing) {
        setListing({ ...listing, ...rowSync })
        await supabase.from('listings').update(rowSync).eq('id', id)
      }
    } catch (err: unknown) {
      setAvailability(prevAvailability)
      alert(t('errorPrefix') + errMessage(err))
    }
  }

  const handleRemoveFormidlet = async () => {
    if (!listing || !isNavView) return
    if (ownerAgreementTerminated) {
      alert(t('expiredOwnerNoMediationNav'))
      return
    }
    if (!confirm(`Vil du fjerne formidlingen for "${listing.address}"?`)) return
    const prevListing = listing
    const prevAvailability = availability
    const periodIds = formidlaPeriodIdsOverlappingToday(String(id), { [String(id)]: availability })
    const nextAvail =
      periodIds.length > 0
        ? availability.filter((p) => !periodIds.includes(String(p.id)))
        : availability
    const rowSync = listingRowFieldsForAvailabilityToday(String(id), { [String(id)]: nextAvail })
    setListing({ ...listing, ...rowSync })
    setAvailability(nextAvail)
    try {
      if (periodIds.length > 0) {
        const { error: delError } = await supabase.from('listing_availability').delete().in('id', periodIds)
        if (delError) throw delError
      }
      const { error } = await supabase.from('listings').update(rowSync).eq('id', id)
      if (error) throw error
      const user = await getAuthUserDeduped()
      if (listing?.owner_id) {
        await supabase.from('audit_logs').insert([
          {
            user_id: listing.owner_id,
            listing_id: id,
            action_type: 'KOMMUNE_REMOVE_FORMIDLA',
            listing_address: listing.address,
            details: { performed_by_user_id: user?.id },
          },
        ])
      }
    } catch (err: unknown) {
      setListing(prevListing)
      setAvailability(prevAvailability)
      alert(t('errorPrefix') + errMessage(err))
    }
  }

  const handleRegenerateTenantLink = async () => {
    if (!id || tenantLinkRegenerating) return
    if (ownerAgreementTerminated) {
      alert(t('expiredOwnerNoMediationNav'))
      return
    }
    if (!confirm(t('generateNewLinkConfirm'))) return
    setTenantLinkRegenerating(true)
    try {
      const newToken = crypto.randomUUID()
      const { error } = await supabase
        .from('listing_tenant_tokens')
        .upsert([{ listing_id: id, token: newToken }], { onConflict: 'listing_id' })
      if (error) throw error
      setTenantReportToken(newToken)
    } catch (err: unknown) {
      alert(t('couldNotGenerateLink') + errMessage(err))
    } finally {
      setTenantLinkRegenerating(false)
    }
  }

  useEffect(() => {
    setRegionAccessDenied(false)
    async function fetchData() {
      setOwnerAgreementTerminated(false)
      try {
        const user = await getAuthUserDeduped()
        setCurrentUser(user)

        let profileKommuneRegion: string | null = null

        if (user) {
          if (isNavView) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('role, kommune_region, kommune_can_edit')
              .eq('id', user.id)
              .maybeSingle()
            const role = user.user_metadata?.role || profile?.role
            setViewerIsKommuneStaff(isKommuneStaffRole(role))
            profileKommuneRegion = profile?.kommune_region ?? null
            setKommuneCanEdit(
              profile?.role === 'kommune_admin' || profile?.kommune_can_edit !== false
            )
            if (
              (profileKommuneRegion == null || String(profileKommuneRegion).trim() === '') &&
              user.email
            ) {
              const [rpcRes, tableRes] = await Promise.all([
                supabase.rpc('get_whitelist_region_for_email', {
                  p_email: user.email,
                }),
                supabase
                  .from('kommune_access_list')
                  .select('region')
                  .ilike('email', user.email)
                  .eq('is_active', true)
                  .limit(1),
              ])
              const fromRpc =
                typeof rpcRes.data === 'string'
                  ? rpcRes.data
                  : Array.isArray(rpcRes.data) && rpcRes.data?.length
                    ? rpcRes.data[0]
                    : null
              const fromTable = tableRes.data?.[0]?.region
              if (fromRpc && String(fromRpc).trim()) {
                profileKommuneRegion = fromRpc
              } else if (fromTable && String(fromTable).trim()) {
                profileKommuneRegion = fromTable
              }
            }
            if (!isKommuneStaffRole(role)) {
              router.push(`/listings/${id}?view=owner`)
              return
            }
          } else {
            const { data: profile } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', user.id)
              .maybeSingle()
            const role = user.user_metadata?.role || profile?.role
            setViewerIsKommuneStaff(isKommuneStaffRole(role))
          }
        } else {
          setViewerIsKommuneStaff(false)
        }

        const listingPromise =
          isNavView && user
            ? supabase.rpc('get_listing_by_id_for_kommune', { p_listing_id: id })
            : supabase.from('listings').select('*').eq('id', id).single()

        const agreementPromise = user
          ? supabase
              .from('user_agreements')
              .select('*')
              .eq('user_id', user.id)
              .eq('is_terminated', false)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null })

        const [listingRes, agreementRes] = await Promise.all([listingPromise, agreementPromise])

        let data: any = null
        let error: any = null
        if (isNavView && user) {
          error = listingRes.error
          const rows = (listingRes.data as any[]) || []
          data = rows[0] ?? null
        } else {
          data = listingRes.data
          error = listingRes.error
        }
        if (error) throw error
        setHasActiveAgreement(!!agreementRes.data)
        setListing(data)

        const ownerId = data?.owner_id
        const ownerTermPromise = ownerId
          ? supabase
              .from('user_agreements')
              .select('id')
              .eq('user_id', ownerId)
              .eq('is_terminated', true)
              .maybeSingle()
          : Promise.resolve({ data: null })

        const availabilityPromise = supabase
          .from('listing_availability')
          .select('*')
          .eq('listing_id', id)
          .order('start_date', { ascending: true })

        const reportsPromise = supabase
          .from('handover_reports')
          .select('*')
          .eq('listing_id', id)
          .order('created_at', { ascending: false })

        const notesPromise =
          user && isNavView
            ? supabase
                .from('nav_notes')
                .select('*')
                .eq('listing_id', id)
                .order('created_at', { ascending: false })
            : Promise.resolve({ data: null })

        const [ownerTermRes, availRes, reportsRes, notesRes] = await Promise.all([
          ownerTermPromise,
          availabilityPromise,
          reportsPromise,
          notesPromise,
        ])

        const ownerTerm = !!ownerTermRes.data
        setOwnerAgreementTerminated(ownerTerm)
        const availData = availRes.data || []
        setAvailability(availData)
        setHandoverReports(reportsRes.data || [])

        // Kommune: kun tilgang til boliger i tillatte kommuner (støtter JSON-array ["Narvik","Gratangen"] og streng)
        if (isNavView && data) {
          const raw = profileKommuneRegion
          let regions: string[] = []
          if (Array.isArray(raw))
            regions = raw.map((r: any) => String(r).trim().toLowerCase()).filter(Boolean)
          else if (raw != null && String(raw).trim()) {
            let s = String(raw)
              .trim()
              .replace(/^["\\]+|["\\]+$/g, '')
              .trim()
            if (s.startsWith('[')) {
              try {
                const arr = JSON.parse(s)
                regions = Array.isArray(arr)
                  ? arr.map((r: any) => String(r).trim().toLowerCase()).filter(Boolean)
                  : []
              } catch {
                regions = []
              }
            } else {
              const regionStr = s.replace(/\s+og\s+/gi, ',').replace(/[,;\n]+/g, ',')
              regions = regionStr
                .split(',')
                .map((r: string) =>
                  r
                    .replace(/^["'\s\\]+|["'\s\\]+$/g, '')
                    .trim()
                    .toLowerCase()
                )
                .filter(Boolean)
            }
          }
          const listingCity = (data.city || '').trim().toLowerCase()
          if (regions.length === 0 || !listingCity || !regions.includes(listingCity)) {
            setRegionAccessDenied(true)
          }
        }

        if (user && isNavView) {
          setNavNotes(notesRes.data || [])
          if (!ownerTerm) await loadMediationReservation()
          else setMediationReservation(null)
        }

        // Fetch or create tenant report token only for kommune (lenken vises bare for kommuneansatte)
        // Merk: «formidlet» = status Formidla ELLER minst én Formidla-periode (ikke bare «i dag» i perioden),
        // ellers mangler lenke ved avvik mellom dato/tidssone eller når perioden ble lagt inn.
        const isFormidlet =
          data?.status === 'Formidla' ||
          listingHasFormidlaPeriod(availData as { status?: string }[] | null | undefined)
        if (user && isNavView && isFormidlet && !ownerTerm) {
          let tokenData = await supabase
            .from('listing_tenant_tokens')
            .select('token')
            .eq('listing_id', id)
            .maybeSingle()
          if (tokenData.error)
            devWarn('[listing_tenant_tokens] select:', tokenData.error.message)
          if (!tokenData.data?.token) {
            const up = await supabase
              .from('listing_tenant_tokens')
              .upsert([{ listing_id: id }], { onConflict: 'listing_id' })
            if (up.error) devWarn('[listing_tenant_tokens] upsert:', up.error.message)
            tokenData = await supabase
              .from('listing_tenant_tokens')
              .select('token')
              .eq('listing_id', id)
              .maybeSingle()
          }
          setTenantReportToken(tokenData.data?.token || null)
        } else {
          setTenantReportToken(null)
        }
      } catch (err) {
        logError('Error fetching listing:', err)
      } finally {
        setLoading(false)
      }
    }

    if (id) fetchData()
  }, [id, isNavView, loadMediationReservation, router])

  /** App Router / klientnavigasjon scroller ikke alltid til #anker (f.eks. varsel «Åpne fakturagrunnlag»). */
  useEffect(() => {
    if (loading || !listing) return
    const raw = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '').trim() : ''
    if (!raw) return
    let cancelled = false
    let attempts = 0
    const tryScroll = () => {
      if (cancelled) return true
      const el = document.getElementById(raw)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return true
      }
      return false
    }
    if (tryScroll()) return
    const timer = window.setInterval(() => {
      attempts += 1
      if (tryScroll() || attempts > 50) window.clearInterval(timer)
    }, 80)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [loading, listing, id])

  const handleUploadMore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return

    if (!hasActiveAgreement) {
      alert(t('signAgreementToUpload'))
      router.push(
        `/homeowner/sign-terms?city=${encodeURIComponent((listing?.city || '').trim())}&returnTo=${encodeURIComponent(`/listings/${id}`)}`
      )
      return
    }

    if (showGalleryFormidlet) {
      alert(t('ownerCannotEditListingWhenFormidlet'))
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

        const {
          data: { publicUrl },
        } = supabase.storage.from('listings').getPublicUrl(filePath)

        newUrls.push(publicUrl)
      }

      const updatedImageUrls = [...allImages, ...newUrls]

      const { error: updateError } = await supabase
        .from('listings')
        .update({
          image_urls: updatedImageUrls,
          image_url: updatedImageUrls[0], // Ensure we have a main thumbnail
        })
        .eq('id', id)

      if (updateError) throw updateError

      setListing({ ...listing, image_urls: updatedImageUrls, image_url: updatedImageUrls[0] })
      setCurrentImageIndex(updatedImageUrls.length - 1)
      alert(t('imagesAdded'))
    } catch (err: unknown) {
      alert(t('errorUploading') + errMessage(err))
    } finally {
      setUploading(false)
    }
  }

  const handleReorderListingImage = async (fromIndex: number, direction: -1 | 1) => {
    const toIndex = fromIndex + direction
    if (!listing || !isOwner || isNavView || toIndex < 0 || toIndex >= allImages.length) return
    if (showGalleryFormidlet) {
      alert(t('ownerCannotEditListingWhenFormidlet'))
      return
    }
    if (!hasActiveAgreement) {
      alert(t('signAgreementToEdit'))
      router.push(
        `/homeowner/sign-terms?city=${encodeURIComponent((listing?.city || '').trim())}&returnTo=${encodeURIComponent(`/listings/${id}`)}`
      )
      return
    }
    const next = [...allImages]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    setIsSaving('image_urls')
    try {
      const { error } = await supabase
        .from('listings')
        .update({
          image_urls: next,
          image_url: next[0] ?? null,
        })
        .eq('id', id)
      if (error) throw error
      setListing({ ...listing, image_urls: next, image_url: next[0] ?? null })
      setCurrentImageIndex((prev) => {
        const cur = allImages[prev]
        const ni = next.indexOf(cur)
        return ni >= 0 ? ni : 0
      })
    } catch (err: unknown) {
      alert(t('errorSaving') + errMessage(err))
    } finally {
      setIsSaving(null)
    }
  }

  const handleHouseRulesFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !listing || !isOwner || isNavView) return
    if (!hasActiveAgreement) {
      alert(t('signAgreementToEdit'))
      router.push(
        `/homeowner/sign-terms?city=${encodeURIComponent((listing?.city || '').trim())}&returnTo=${encodeURIComponent(`/listings/${id}`)}`
      )
      return
    }
    if (!canOwnerEditListingDetail) {
      alert(t('ownerCannotEditListingWhenFormidlet'))
      return
    }
    setHouseRulesBusy(true)
    try {
      const up = await uploadHouseRulesPdf(supabase, String(id), file)
      if ('error' in up) {
        const msg =
          up.error === 'type'
            ? t('houseRulesValidationType')
            : up.error === 'size'
              ? t('houseRulesValidationSize')
              : t('houseRulesUploadError') + (typeof up.error === 'string' ? up.error : '')
        alert(msg)
        return
      }
      const prevPath = listing.house_rules_pdf_path
      if (prevPath) await removeHouseRulesPdfObject(supabase, String(prevPath))
      const { error } = await supabase
        .from('listings')
        .update({ house_rules_pdf_path: up.path })
        .eq('id', id)
      if (error) throw error
      setListing({ ...listing, house_rules_pdf_path: up.path })
    } catch (err: unknown) {
      alert(t('houseRulesUploadError') + errMessage(err))
    } finally {
      setHouseRulesBusy(false)
    }
  }

  const handleHouseRulesRemove = async () => {
    if (!listing?.house_rules_pdf_path || !canOwnerEditListingDetail) return
    if (!hasActiveAgreement) {
      alert(t('signAgreementToEdit'))
      router.push(
        `/homeowner/sign-terms?city=${encodeURIComponent((listing?.city || '').trim())}&returnTo=${encodeURIComponent(`/listings/${id}`)}`
      )
      return
    }
    setHouseRulesBusy(true)
    try {
      await removeHouseRulesPdfObject(supabase, listing.house_rules_pdf_path)
      const { error } = await supabase
        .from('listings')
        .update({ house_rules_pdf_path: null })
        .eq('id', id)
      if (error) throw error
      setListing({ ...listing, house_rules_pdf_path: null })
    } catch (err: unknown) {
      alert(t('errorSaving') + errMessage(err))
    } finally {
      setHouseRulesBusy(false)
    }
  }

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNote.trim()) return

    try {
      const user = await getAuthUserDeduped()
      if (!user) return

      const { data, error } = await supabase
        .from('nav_notes')
        .insert([
          {
            listing_id: id,
            note_text: newNote,
            created_by: user.id,
          },
        ])
        .select()
        .single()

      if (error) throw error

      setNavNotes([data, ...navNotes])
      setNewNote('')
    } catch (err: unknown) {
      alert(t('errorSavingNote') + errMessage(err))
    }
  }

  /** Tidligere brukt av «Del med bruker»-knappen (fjernet). Beholder for kompatibilitet med cache. */
  const handleCopyLink = () => {
    if (typeof window === 'undefined') return
    navigator.clipboard?.writeText(window.location.href)
    setCopyFeedback(true)
    setTimeout(() => setCopyFeedback(false), 2000)
  }

  const refetchHandoverReports = () => {
    if (!id) return
    supabase
      .from('handover_reports')
      .select('*')
      .eq('listing_id', id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setHandoverReports(data || []))
  }

  const handleApproveReport = async (reportId: string) => {
    try {
      const user = await getAuthUserDeduped()
      if (!user) return
      const { error } = await supabase
        .from('handover_reports')
        .update({
          approval_status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user.id,
        })
        .eq('id', reportId)
      if (error) throw error
      refetchHandoverReports()
    } catch (err: unknown) {
      alert(t('errApprove') + errMessage(err))
    }
  }

  const handleRequestChangeSubmit = async () => {
    if (!requestChangeReport || !currentUser || !listing?.owner_id) return
    setRequestChangeSending(true)
    try {
      const comment =
        requestChangeComment.trim() || 'Kommunen ber om at du sender inn en ny overtakelsesrapport.'
      const { error: updateErr } = await supabase
        .from('handover_reports')
        .update({
          approval_status: 'rejected',
          request_change_comment: comment,
        })
        .eq('id', requestChangeReport.id)
      if (updateErr) throw updateErr

      const messageContent = `Kommunen ber om endring i overtakelsesrapporten for ${listing.address}. ${comment}\n\nVennligst send inn en ny overtakelsesrapport.`
      await supabase.from('chat_messages').insert({
        sender_id: currentUser.id,
        receiver_id: listing.owner_id,
        content: messageContent,
      })
      await supabase.from('notifications').insert({
        owner_id: listing.owner_id,
        listing_id: listing.id,
        type: 'NEW_MESSAGE',
        title: t('messageFromKommune'),
        message:
          comment.trim().length > 0
            ? `Kommunen: ${comment.trim()}`
            : 'Kommunen har bedt om ny overtakelsesrapport. Se meldinger.',
        status: 'unread',
        related_user_id: currentUser.id,
      })
      refetchHandoverReports()
      setRequestChangeReport(null)
      setRequestChangeComment('')
    } catch (err: unknown) {
      alert(t('errSend') + errMessage(err))
    } finally {
      setRequestChangeSending(false)
    }
  }

  const filteredHandoverReports = (() => {
    if (reportTimeFilter === 'all') return handoverReports
    const now = Date.now()
    const cut =
      reportTimeFilter === '7d' ? now - 7 * 24 * 60 * 60 * 1000 : now - 30 * 24 * 60 * 60 * 1000
    return handoverReports.filter((r) => new Date(r.created_at).getTime() >= cut)
  })()

  if (loading) {
    return <div className="container" style={{ minHeight: '80vh' }} />
  }

  if (!listing) {
    const notFoundHref = isNavView
      ? '/nav/database'
      : currentUser
        ? '/homeowner/manage'
        : '/'
    const notFoundLabel = isNavView
      ? t('backToHousingBank')
      : currentUser
        ? t('backToMyProperties')
        : t('backToHome')
    if (isNavView && currentUser) {
      return (
        <div
          className="container"
          style={{
            textAlign: 'center',
            padding: 'var(--space-10)',
            maxWidth: '480px',
            margin: '0 auto',
          }}
        >
          <h2 style={{ color: 'var(--text-main)', marginBottom: 'var(--space-3)' }}>
            {t('noAccessThisListing')}
          </h2>
          <p style={{ color: 'var(--text-body)', marginBottom: 'var(--space-6)' }}>
            {t('listingNavEmptyListingBody')}
          </p>
          <Link
            href={notFoundHref}
            className="button"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <ArrowLeft size={18} /> {notFoundLabel}
          </Link>
        </div>
      )
    }
    return (
      <div className="container" style={{ textAlign: 'center', padding: 'var(--space-10)' }}>
        <h2 style={{ color: 'var(--text-main)' }}>{t('listingNotFoundTitle')}</h2>
        <p style={{ color: 'var(--text-body)', marginTop: 'var(--space-3)', maxWidth: '420px', marginInline: 'auto' }}>
          {t('listingNotFoundBody')}
        </p>
        <Link
          href={notFoundHref}
          className="button"
          style={{ marginTop: 'var(--space-4)' }}
        >
          {notFoundLabel}
        </Link>
      </div>
    )
  }

  if (regionAccessDenied) {
    return (
      <div
        className="container"
        style={{
          textAlign: 'center',
          padding: 'var(--space-10)',
          maxWidth: '480px',
          margin: '0 auto',
        }}
      >
        <h2 style={{ color: 'var(--text-main)', marginBottom: 'var(--space-3)' }}>
          {t('noAccessThisListing')}
        </h2>
        <p style={{ color: 'var(--text-body)', marginBottom: 'var(--space-6)' }}>
          {t('listingInRegionDesc').replace('{city}', listing?.city ?? '')}
        </p>
        <Link
          href="/nav/database"
          className="button"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <ArrowLeft size={18} /> {t('backToHousingBank')}
        </Link>
      </div>
    )
  }

  return (
    <main className="container">
      {pendingDeletePeriod && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-remove-period-title"
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
            onClick={(e) => e.stopPropagation()}
          >
            <p
              id="confirm-remove-period-title"
              style={{ margin: '0 0 var(--space-4)', fontSize: '1rem' }}
            >
              {t('confirmRemovePeriod')}
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setPendingDeletePeriod(null)}
              >
                {t('cancel')}
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={() => pendingDeletePeriod && handleRemovePeriod(pendingDeletePeriod)}
              >
                {t('remove')}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div
        className="listing-details-header"
        style={{
          marginBottom: 'var(--space-6)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-4)',
        }}
      >
        <Link
          href={isNavView ? '/nav/database' : '/homeowner/manage'}
          className="nav-link"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            marginLeft: '-1rem',
          }}
        >
          <ArrowLeft size={18} /> {isNavView ? t('backToHousingBank') : t('backToMyProperties')}
        </Link>
      </div>

      {isNavView && ownerAgreementTerminated && (
        <div
          className="card"
          style={{
            marginBottom: 'var(--space-6)',
            padding: 'var(--space-4)',
            border: '1px solid rgba(245, 158, 11, 0.45)',
            background: 'rgba(245, 158, 11, 0.08)',
          }}
        >
          <p
            style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-body)', lineHeight: 1.55 }}
          >
            {t('expiredOwnerNoMediationNav')}
          </p>
        </div>
      )}

      <div
        className="listing-details-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: isNavView ? '1.5fr 1fr' : '1fr',
          gap: 'var(--space-8)',
          alignItems: 'start',
        }}
      >
        {/* Left Column – rekkefølge: adresse, boliginfo, prisnivåer, ledige perioder, deretter kontaktinfo, overtakelsesrapport, bilder */}
        <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
          {/* 1. Adresse øverst */}
          <section
            className="card listing-detail-card"
            style={{ padding: 'var(--space-6)', position: 'relative' }}
          >
            {isNavView && (
              <button
                type="button"
                onClick={() => setShowNavNotes((prev) => !prev)}
                title={showNavNotes ? t('hideNoteCaseworker') : t('showNoteCaseworker')}
                style={{
                  position: 'absolute',
                  top: 'var(--space-4)',
                  right: 'var(--space-4)',
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle)',
                  background: showNavNotes ? 'var(--color-accent)' : 'var(--bg-card)',
                  color: showNavNotes ? 'var(--text-on-dark)' : 'var(--color-accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <MessageSquare size={18} />
                {navNotes.length > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      minWidth: '18px',
                      height: '18px',
                      borderRadius: '9px',
                      background: 'var(--color-teal)',
                      color: 'white',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 4px',
                    }}
                  >
                    {navNotes.length}
                  </span>
                )}
              </button>
            )}
            {canOwnerEditListingDetail ? (
              <input
                value={listing.address}
                onChange={(e) => setListing({ ...listing, address: e.target.value })}
                onBlur={(e) => handleUpdateField('address', e.target.value)}
                style={{
                  fontSize: '2rem',
                  fontWeight: 800,
                  marginBottom: 'var(--space-2)',
                  color: 'var(--text-main)',
                  border: 'none',
                  background: 'none',
                  width: '100%',
                  padding: 0,
                  outline: 'none',
                }}
                className="editable-h1"
              />
            ) : (
              <h2
                style={{
                  fontSize: '2rem',
                  marginBottom: 'var(--space-2)',
                  color: 'var(--text-main)',
                  paddingRight: isNavView ? '48px' : 0,
                }}
              >
                {listing.address}
              </h2>
            )}
            {isOwner && !isNavView && showGalleryFormidlet && (
              <p
                role="status"
                style={{
                  margin: '0 0 var(--space-3)',
                  padding: 'var(--space-3) var(--space-4)',
                  fontSize: '0.9rem',
                  lineHeight: 1.5,
                  color: 'var(--text-body)',
                  background: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  borderRadius: '12px',
                }}
              >
                {t('ownerCannotEditListingWhenFormidlet')}
              </p>
            )}
            <div
              className="listing-city-line"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                color: 'var(--color-royal-blue)',
                fontSize: '1rem',
              }}
            >
              {isNavView && listing.id ? (
                <Link
                  href={`/nav/database?focusListing=${listing.id}`}
                  prefetch={false}
                  title={t('listingMapPinShowOnMap')}
                  aria-label={t('listingMapPinShowOnMap')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    color: 'inherit',
                    flexShrink: 0,
                  }}
                >
                  <MapPin
                    size={18}
                    style={{ color: 'var(--color-royal-blue)', flexShrink: 0 }}
                    aria-hidden
                  />
                </Link>
              ) : (() => {
                  const lat = parseFloat(String(listing.latitude ?? ''))
                  const lon = parseFloat(String(listing.longitude ?? ''))
                  const hasCoords = !Number.isNaN(lat) && !Number.isNaN(lon)
                  if (!hasCoords) {
                    return (
                      <MapPin
                        size={18}
                        style={{ color: 'var(--color-royal-blue)', flexShrink: 0 }}
                        aria-hidden
                      />
                    )
                  }
                  const osm = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`
                  return (
                    <a
                      href={osm}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={t('listingMapPinShowOnMap')}
                      aria-label={t('listingMapPinShowOnMap')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        color: 'inherit',
                        flexShrink: 0,
                      }}
                    >
                      <MapPin
                        size={18}
                        style={{ color: 'var(--color-royal-blue)', flexShrink: 0 }}
                        aria-hidden
                      />
                    </a>
                  )
                })()}
              {canOwnerEditListingDetail ? (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <input
                    value={listing.city}
                    onChange={(e) => setListing({ ...listing, city: e.target.value })}
                    onBlur={(e) => handleUpdateField('city', e.target.value)}
                    style={{
                      fontWeight: 600,
                      color: 'var(--color-royal-blue)',
                      WebkitTextFillColor: 'var(--color-royal-blue)',
                      border: 'none',
                      background: 'none',
                      width: '120px',
                      padding: 0,
                      outline: 'none',
                    }}
                  />
                  <input
                    value={listing.postal_code}
                    onChange={(e) => setListing({ ...listing, postal_code: e.target.value })}
                    onBlur={(e) => handleUpdateField('postal_code', e.target.value)}
                    style={{
                      fontWeight: 600,
                      color: 'var(--color-royal-blue)',
                      WebkitTextFillColor: 'var(--color-royal-blue)',
                      border: 'none',
                      background: 'none',
                      width: '80px',
                      padding: 0,
                      outline: 'none',
                    }}
                  />
                </div>
              ) : (
                <span style={{ fontWeight: 600, color: 'var(--color-royal-blue)' }}>
                  {listing.city} {listing.postal_code}
                </span>
              )}
            </div>
          </section>

          {/* Interne notater (kommune) – vises når man trykker på notat-ikonet */}
          {isNavView && showNavNotes && (
            <section
              className="card"
              style={{
                padding: 'var(--space-6)',
                border: '1px solid var(--color-sky-blue)',
                background: 'rgba(59, 130, 246, 0.03)',
              }}
            >
              <h3
                style={{
                  marginBottom: 'var(--space-4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  color: 'var(--text-main)',
                }}
              >
                <MessageSquare size={20} style={{ color: 'var(--color-accent)' }} />{' '}
                {t('noteForCaseworker')}
              </h3>
              <form onSubmit={handleAddNote} style={{ marginBottom: 'var(--space-6)' }}>
                <div style={{ position: 'relative' }}>
                  <textarea
                    className="input"
                    placeholder={t('addInternalNotePlaceholder')}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    style={{
                      minHeight: '100px',
                      paddingRight: 'var(--space-10)',
                      color: 'var(--text-main)',
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      position: 'absolute',
                      bottom: '15px',
                      right: '15px',
                      background: 'var(--color-accent)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-on-dark)',
                      cursor: 'pointer',
                    }}
                  >
                    <Send size={18} />
                  </button>
                </div>
                <p
                  className="text-sm"
                  style={{ marginTop: 'var(--space-2)', color: 'var(--text-muted)' }}
                >
                  {t('onlyVisibleCaseworker')}
                </p>
              </form>
              <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                {navNotes.length > 0 ? (
                  navNotes.map((note) => (
                    <div
                      key={note.id}
                      style={{
                        padding: 'var(--space-4)',
                        background: 'var(--bg-card)',
                        borderRadius: '12px',
                        borderLeft: '4px solid var(--color-accent)',
                      }}
                    >
                      <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-body)' }}>
                        {note.note_text}
                      </p>
                      <div
                        style={{
                          marginTop: 'var(--space-2)',
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {formatDateTimeNo(note.created_at)}
                      </div>
                    </div>
                  ))
                ) : (
                  <p
                    className="text-sm"
                    style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}
                  >
                    {t('noNotesYet')}
                  </p>
                )}
              </div>
            </section>
          )}

          {/* 2. Boliginformasjon (type, størrelse, boliginfo, inkludert, beskrivelse) */}
          <section className="card listing-detail-card" style={{ padding: 'var(--space-8)' }}>
            <div
              className="listing-metrics-row"
              style={{
                display: 'grid',
                gap: 'var(--space-4)',
                padding: 'var(--space-6) 0',
                borderTop: '1px solid var(--border-subtle)',
                borderBottom: '1px solid var(--border-subtle)',
                marginBottom: 'var(--space-6)',
              }}
            >
              <div className="listing-metric-cell" style={{ textAlign: 'center' }}>
                <Building
                  size={20}
                  style={{ color: 'var(--color-royal-blue)', marginBottom: '4px' }}
                />
                {canOwnerEditListingDetail ? (
                  <select
                    value={listing.type}
                    onChange={(e) => {
                      setListing({ ...listing, type: e.target.value })
                      handleUpdateField('type', e.target.value)
                    }}
                    className="listing-metric-select"
                    style={{
                      fontWeight: 700,
                      color: 'var(--text-main)',
                      border: 'none',
                      background: 'none',
                      textAlign: 'center',
                      width: '100%',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="Short-term">Korttid</option>
                    <option value="Long-term">Langtid</option>
                    <option value="Apartment">Leilighet</option>
                    <option value="House">Enebolig</option>
                    <option value="Shared">Bofelleskap</option>
                  </select>
                ) : (
                  <div
                    className="listing-metric-value"
                    style={{ fontWeight: 700, color: 'var(--text-main)' }}
                  >
                    {translateType(listing.type)}
                  </div>
                )}
                <div style={{ fontSize: '0.7rem', opacity: 0.6, color: 'var(--text-muted)' }}>
                  TYPE
                </div>
              </div>
              <div className="listing-metric-cell" style={{ textAlign: 'center' }}>
                <Ruler
                  size={20}
                  style={{ color: 'var(--color-royal-blue)', marginBottom: '4px' }}
                />
                {canOwnerEditListingDetail ? (
                  <div
                    className="listing-metric-size-input"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '2px',
                    }}
                  >
                    <input
                      type="number"
                      value={listing.size_sqm}
                      onChange={(e) => setListing({ ...listing, size_sqm: e.target.value })}
                      onBlur={(e) => handleUpdateField('size_sqm', e.target.value)}
                      style={{
                        fontWeight: 700,
                        color: 'var(--text-main)',
                        border: 'none',
                        background: 'none',
                        textAlign: 'right',
                        width: '40px',
                        padding: 0,
                        outline: 'none',
                      }}
                    />
                    <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>m²</span>
                  </div>
                ) : (
                  <div
                    className="listing-metric-value"
                    style={{ fontWeight: 700, color: 'var(--text-main)' }}
                  >
                    {listing.size_sqm} m²
                  </div>
                )}
                <div style={{ fontSize: '0.7rem', opacity: 0.6, color: 'var(--text-muted)' }}>
                  STØRRELSE
                </div>
              </div>
              <div className="listing-metric-cell" style={{ textAlign: 'center' }}>
                <Bed size={20} style={{ color: 'var(--color-royal-blue)', marginBottom: '4px' }} />
                {canOwnerEditListingDetail ? (
                  <input
                    type="number"
                    value={listing.bedrooms}
                    onChange={(e) => setListing({ ...listing, bedrooms: e.target.value })}
                    onBlur={(e) => handleUpdateField('bedrooms', e.target.value)}
                    style={{
                      fontWeight: 700,
                      color: 'var(--text-main)',
                      border: 'none',
                      background: 'none',
                      textAlign: 'center',
                      width: '100%',
                      padding: 0,
                      outline: 'none',
                    }}
                  />
                ) : (
                  <div
                    className="listing-metric-value"
                    style={{ fontWeight: 700, color: 'var(--text-main)' }}
                  >
                    {listing.bedrooms}
                  </div>
                )}
                <div style={{ fontSize: '0.7rem', opacity: 0.6, color: 'var(--text-muted)' }}>
                  SOVEROM
                </div>
              </div>
              <div className="listing-metric-cell" style={{ textAlign: 'center' }}>
                <Users
                  size={20}
                  style={{ color: 'var(--color-royal-blue)', marginBottom: '4px' }}
                />
                {canOwnerEditListingDetail ? (
                  <input
                    type="number"
                    value={listing.max_occupants}
                    onChange={(e) => setListing({ ...listing, max_occupants: e.target.value })}
                    onBlur={(e) => handleUpdateField('max_occupants', e.target.value)}
                    style={{
                      fontWeight: 700,
                      color: 'var(--text-main)',
                      border: 'none',
                      background: 'none',
                      textAlign: 'center',
                      width: '100%',
                      padding: 0,
                      outline: 'none',
                    }}
                  />
                ) : (
                  <div
                    className="listing-metric-value"
                    style={{ fontWeight: 700, color: 'var(--text-main)' }}
                  >
                    {listing.max_occupants}
                  </div>
                )}
                <div style={{ fontSize: '0.7rem', opacity: 0.6, color: 'var(--text-muted)' }}>
                  MAKS PERS
                </div>
              </div>
            </div>
            <div
              style={{
                marginTop: 'var(--space-5)',
                paddingTop: 'var(--space-4)',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                {t('paymentMethodLabel')}
              </div>
              {canOwnerEditListingDetail ? (
                <select
                  value={listing.payment_method === 'konto' ? 'konto' : 'faktura'}
                  onChange={(e) => {
                    const v = e.target.value === 'konto' ? 'konto' : 'faktura'
                    setListing({ ...listing, payment_method: v })
                    void handleUpdateField('payment_method', v)
                  }}
                  className="input"
                  style={{ maxWidth: 360, fontSize: '0.9rem', padding: '8px 12px' }}
                >
                  <option value="faktura">{t('paymentMethodFaktura')}</option>
                  <option value="konto">{t('paymentMethodKonto')}</option>
                </select>
              ) : (
                <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                  {listing.payment_method === 'konto'
                    ? t('paymentMethodKonto')
                    : t('paymentMethodFaktura')}
                </div>
              )}
            </div>
            <div className="listing-detail-two-col">
              <div>
                <h3
                  style={{
                    marginBottom: 'var(--space-4)',
                    fontSize: '1.1rem',
                    color: 'var(--text-main)',
                  }}
                >
                  Boliginformasjon
                </h3>
                <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                  <div className="text-sm" style={{ color: 'var(--text-body)' }}>
                    <strong>Etasje:</strong>{' '}
                    {canOwnerEditListingDetail ? (
                      <input
                        value={listing.floor_number}
                        onChange={(e) => setListing({ ...listing, floor_number: e.target.value })}
                        onBlur={(e) => handleUpdateField('floor_number', e.target.value)}
                        className="listing-inline-input"
                        style={{
                          border: 'none',
                          background: 'var(--listing-field-bg)',
                          borderRadius: '4px',
                          padding: '2px 6px',
                          width: '80px',
                          outline: 'none',
                          color: 'var(--text-main)',
                        }}
                      />
                    ) : (
                      listing.floor_number
                    )}
                  </div>
                  <div className="text-sm" style={{ color: 'var(--text-body)' }}>
                    <strong>Møblering:</strong>{' '}
                    {canOwnerEditListingDetail ? (
                      <select
                        value={listing.furnishing}
                        onChange={(e) => {
                          setListing({ ...listing, furnishing: e.target.value })
                          handleUpdateField('furnishing', e.target.value)
                        }}
                        className="listing-inline-input"
                        style={{
                          border: 'none',
                          background: 'var(--listing-field-bg)',
                          borderRadius: '4px',
                          padding: '2px 6px',
                          outline: 'none',
                          color: 'var(--text-main)',
                        }}
                      >
                        <option>Umøblert</option>
                        <option>Kun hvitevarer</option>
                        <option>Delvis møblert</option>
                        <option>Fullt møblert</option>
                        <option>
                          Fullt møblert og boligen har alt nødvendig inventar for matlaging og
                          overnatting.
                        </option>
                        <option>Møblert m/utstyr</option>
                      </select>
                    ) : (
                      listing.furnishing
                    )}
                  </div>
                  <div className="text-sm" style={{ color: 'var(--text-body)' }}>
                    <strong>Mulighet for husdyr:</strong>{' '}
                    {canOwnerEditListingDetail ? (
                      <>
                        <select
                          value={listing.pet_policy || 'Ingen dyr tillatt'}
                          onChange={(e) => {
                            void handlePetPolicyChange(e.target.value)
                          }}
                          className="listing-inline-input"
                          style={{
                            border: 'none',
                            background: 'var(--listing-field-bg)',
                            borderRadius: '4px',
                            padding: '2px 6px',
                            outline: 'none',
                            color: 'var(--text-main)',
                          }}
                        >
                          <option value="Tillatt">Tillatt</option>
                          <option value="Ingen dyr tillatt">Ingen dyr tillatt</option>
                          <option value="Enkelte dyr er tillatt">Enkelte dyr er tillatt</option>
                        </select>
                        {(listing.pet_policy || '') === 'Enkelte dyr er tillatt' && (
                          <div style={{ marginTop: 6 }}>
                            <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>
                              Utdyp svaret ditt:{' '}
                            </span>
                            <input
                              value={listing.pet_policy_detail || ''}
                              onChange={(e) =>
                                setListing({ ...listing, pet_policy_detail: e.target.value })
                              }
                              onBlur={(e) => handleUpdateField('pet_policy_detail', e.target.value)}
                              className="listing-inline-input"
                              style={{
                                border: 'none',
                                background: 'var(--listing-field-bg)',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                width: 'min(100%, 280px)',
                                outline: 'none',
                                color: 'var(--text-main)',
                              }}
                            />
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {listing.pet_policy || '—'}
                        {(listing.pet_policy || '') === 'Enkelte dyr er tillatt' &&
                        listing.pet_policy_detail ? (
                          <span style={{ display: 'block', fontSize: '0.85rem', marginTop: 4 }}>
                            {listing.pet_policy_detail}
                          </span>
                        ) : null}
                      </>
                    )}
                  </div>
                  <div className="text-sm" style={{ color: 'var(--text-body)' }}>
                    <strong>Parkering:</strong>{' '}
                    {canOwnerEditListingDetail ? (
                      <input
                        value={listing.parking_info}
                        onChange={(e) => setListing({ ...listing, parking_info: e.target.value })}
                        onBlur={(e) => handleUpdateField('parking_info', e.target.value)}
                        className="listing-inline-input"
                        style={{
                          border: 'none',
                          background: 'var(--listing-field-bg)',
                          borderRadius: '4px',
                          padding: '2px 6px',
                          width: '150px',
                          outline: 'none',
                          color: 'var(--text-main)',
                        }}
                      />
                    ) : (
                      listing.parking_info
                    )}
                  </div>
                  <div className="text-sm" style={{ color: 'var(--text-body)' }}>
                    <strong>Fysisk tilrettelegging:</strong>{' '}
                    {canOwnerEditListingDetail ? (
                      <div
                        style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}
                      >
                        {[
                          'Alt på ett plan',
                          'Heis i bygget',
                          'Terskelfritt',
                          'Universell utforming',
                          'Omsorgsboligstandard',
                        ].map((acc) => {
                          const isActive = listing.accessibility?.includes(acc)
                          return (
                            <button
                              key={acc}
                              onClick={() => {
                                const newAcc = isActive
                                  ? listing.accessibility.filter((a: string) => a !== acc)
                                  : [...(listing.accessibility || []), acc]
                                setListing({ ...listing, accessibility: newAcc })
                                handleUpdateField('accessibility', newAcc)
                              }}
                              className="listing-tag listing-tag-accessibility"
                              style={{
                                padding: '2px 8px',
                                borderRadius: '10px',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                background: isActive
                                  ? 'var(--color-royal-blue)'
                                  : 'var(--listing-tag-bg)',
                                border:
                                  '1px solid ' +
                                  (isActive ? 'var(--color-royal-blue)' : 'var(--border-subtle)'),
                                color: isActive ? 'white' : 'var(--text-muted)',
                              }}
                            >
                              {acc}
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      listing.accessibility?.join(', ') || 'Ingen'
                    )}
                  </div>
                </div>
              </div>
              <div>
                <h3
                  style={{
                    marginBottom: 'var(--space-4)',
                    fontSize: '1.1rem',
                    color: 'var(--text-main)',
                  }}
                >
                  Inkludert i leie
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                  {canOwnerEditListingDetail ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {[
                        'Strøm',
                        'Internett',
                        'Kommunale avgifter',
                        'Vaktmestertjenester',
                        'Parkering',
                      ].map((inc) => {
                        const isActive = listing.includes?.includes(inc)
                        return (
                          <button
                            key={inc}
                            onClick={() => {
                              const newInc = isActive
                                ? listing.includes.filter((i: string) => i !== inc)
                                : [...(listing.includes || []), inc]
                              setListing({ ...listing, includes: newInc })
                              handleUpdateField('includes', newInc)
                            }}
                            className="listing-tag listing-tag-includes"
                            style={{
                              padding: '4px 12px',
                              borderRadius: '14px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              background: isActive
                                ? 'var(--listing-tag-includes-active-bg)'
                                : 'transparent',
                              color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                              border: '1px solid var(--border-subtle)',
                            }}
                          >
                            {inc}
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <>
                      {listing.includes?.map((i: string) => (
                        <span
                          key={i}
                          className="listing-tag listing-tag-includes-static"
                          style={{
                            padding: '4px 12px',
                            borderRadius: '14px',
                            background: 'var(--listing-tag-includes-active-bg)',
                            color: 'var(--text-main)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          {i}
                        </span>
                      ))}
                      {(!listing.includes || listing.includes.length === 0) && (
                        <span
                          className="text-sm"
                          style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}
                        >
                          Ingenting inkludert
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 'var(--space-8)' }}>
              <h3
                style={{
                  marginBottom: 'var(--space-4)',
                  fontSize: '1.1rem',
                  color: 'var(--text-main)',
                }}
              >
                Beskrivelse
              </h3>
              {canOwnerEditListingDetail ? (
                <textarea
                  value={listing.additional_info}
                  onChange={(e) => setListing({ ...listing, additional_info: e.target.value })}
                  onBlur={(e) => handleUpdateField('additional_info', e.target.value)}
                  className="listing-textarea"
                  style={{
                    width: '100%',
                    minHeight: '150px',
                    fontSize: '1rem',
                    lineHeight: '1.6',
                    color: 'var(--text-body)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-card)',
                    borderRadius: '8px',
                    padding: 'var(--space-4)',
                    outline: 'none',
                  }}
                />
              ) : (
                <p
                  style={{
                    whiteSpace: 'pre-wrap',
                    fontSize: '1rem',
                    lineHeight: '1.6',
                    color: 'var(--text-body)',
                  }}
                >
                  {listing.additional_info || 'Ingen ytterligere beskrivelse.'}
                </p>
              )}
            </div>
          </section>

          {/* 3. Prisnivåer */}
          <section className="card listing-detail-card" style={{ padding: 'var(--space-6)' }}>
            <h3
              style={{
                marginBottom: 'var(--space-4)',
                fontSize: '1.1rem',
                color: 'var(--text-main)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Tag size={20} style={{ color: 'var(--color-accent)' }} /> Prisnivåer
            </h3>
            {canOwnerEditListingDetail ? (
              <div
                style={{
                  padding: 'var(--space-4)',
                  background: 'var(--color-dark-navy)',
                  borderRadius: '16px',
                  color: 'white',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 'var(--space-6)',
                  }}
                >
                  <div>
                    <label
                      className="label"
                      style={{
                        color: 'rgba(255,255,255,0.6)',
                        fontSize: '0.75rem',
                        marginBottom: '4px',
                      }}
                    >
                      DØGNPRIS
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="number"
                        value={listing.price_daily}
                        onChange={(e) => setListing({ ...listing, price_daily: e.target.value })}
                        onBlur={(e) => handleUpdateField('price_daily', e.target.value)}
                        style={{
                          fontSize: '1.5rem',
                          fontWeight: 800,
                          background: 'none',
                          border: 'none',
                          color: 'white',
                          width: '100px',
                          outline: 'none',
                        }}
                      />
                      <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>,-</span>
                    </div>
                  </div>
                  <div>
                    <label
                      className="label"
                      style={{
                        color: 'rgba(255,255,255,0.6)',
                        fontSize: '0.75rem',
                        marginBottom: '4px',
                      }}
                    >
                      UKESPRIS
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="number"
                        value={listing.price_weekly}
                        onChange={(e) => setListing({ ...listing, price_weekly: e.target.value })}
                        onBlur={(e) => handleUpdateField('price_weekly', e.target.value)}
                        style={{
                          fontSize: '1.1rem',
                          fontWeight: 700,
                          background: 'none',
                          border: 'none',
                          color: 'white',
                          width: '80px',
                          outline: 'none',
                        }}
                      />
                      <span>,-</span>
                    </div>
                  </div>
                  <div>
                    <label
                      className="label"
                      style={{
                        color: 'rgba(255,255,255,0.6)',
                        fontSize: '0.75rem',
                        marginBottom: '4px',
                      }}
                    >
                      MÅNEDSLEIE (KORTTID)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="number"
                        value={listing.price_monthly_short}
                        onChange={(e) =>
                          setListing({ ...listing, price_monthly_short: e.target.value })
                        }
                        onBlur={(e) => handleUpdateField('price_monthly_short', e.target.value)}
                        style={{
                          fontSize: '1.1rem',
                          fontWeight: 700,
                          background: 'none',
                          border: 'none',
                          color: 'white',
                          width: '80px',
                          outline: 'none',
                        }}
                      />
                      <span>,-</span>
                    </div>
                  </div>
                  <div>
                    <label
                      className="label"
                      style={{
                        color: 'rgba(255,255,255,0.6)',
                        fontSize: '0.75rem',
                        marginBottom: '4px',
                      }}
                    >
                      LANGTIDSLEIE (PER MND)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="number"
                        value={listing.price_monthly_long}
                        onChange={(e) =>
                          setListing({ ...listing, price_monthly_long: e.target.value })
                        }
                        onBlur={(e) => handleUpdateField('price_monthly_long', e.target.value)}
                        style={{
                          fontSize: '1.1rem',
                          fontWeight: 700,
                          background: 'none',
                          border: 'none',
                          color: 'white',
                          width: '80px',
                          outline: 'none',
                        }}
                      />
                      <span>,-</span>
                    </div>
                  </div>
                  <div>
                    <label
                      className="label"
                      style={{
                        color: 'rgba(255,255,255,0.6)',
                        fontSize: '0.75rem',
                        marginBottom: '4px',
                      }}
                    >
                      DEPOSITUM
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="number"
                        value={listing.deposit_amount}
                        onChange={(e) => setListing({ ...listing, deposit_amount: e.target.value })}
                        onBlur={(e) => handleUpdateField('deposit_amount', e.target.value)}
                        style={{
                          fontSize: '1.1rem',
                          fontWeight: 700,
                          background: 'none',
                          border: 'none',
                          color: 'white',
                          width: '80px',
                          outline: 'none',
                        }}
                      />
                      <span>,-</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: 'var(--space-4)',
                  color: 'var(--text-body)',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Døgnpris</span>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                    {listing.price_daily != null ? `${listing.price_daily},-` : '–'}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ukespris</span>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                    {listing.price_weekly != null ? `${listing.price_weekly},-` : '–'}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Mnd (korttid)
                  </span>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                    {listing.price_monthly_short != null ? `${listing.price_monthly_short},-` : '–'}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Mnd (langtid)
                  </span>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                    {listing.price_monthly_long != null ? `${listing.price_monthly_long},-` : '–'}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Depositum</span>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                    {listing.deposit_amount != null ? `${listing.deposit_amount},-` : '–'}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Utleier: synlig for alle som ikke er eier når man ikke er i nav-høyrekolonne (kart, view=owner, osv.) */}
          {!isOwner && !isNavView && (
            <section
              className="card listing-detail-card"
              id="kontaktinfo"
              style={{ padding: 'var(--space-6)' }}
            >
              <h3
                style={{
                  fontSize: '1rem',
                  marginBottom: 'var(--space-4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  color: 'var(--text-main)',
                }}
              >
                <User size={18} style={{ color: 'var(--text-main)' }} /> {t('landlord')}
              </h3>
              <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                  {listing.owner_name?.trim() || '–'}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    fontSize: '0.9rem',
                    color: 'var(--text-body)',
                  }}
                >
                  <Phone size={14} style={{ color: 'var(--color-accent)' }} />{' '}
                  {listing.contact_phone?.trim() || '–'}
                </div>
                {viewerIsKommuneStaff && listing.owner_id && !ownerAgreementTerminated && (
                  <Link
                    href={`/nav/messages?with=${listing.owner_id}`}
                    className="button button-secondary"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 'var(--space-2)',
                      padding: 'var(--space-2) var(--space-4)',
                      fontSize: '0.9rem',
                      textDecoration: 'none',
                      marginTop: 'var(--space-1)',
                      width: 'fit-content',
                    }}
                  >
                    <MessageSquare size={18} /> {t('message')}
                  </Link>
                )}
                {listing.last_verified && (
                  <div
                    style={{
                      marginTop: 'var(--space-2)',
                      padding: 'var(--space-3)',
                      background: 'rgba(45, 212, 191, 0.12)',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      color: 'var(--color-teal)',
                      border: '1px solid rgba(45, 212, 191, 0.3)',
                    }}
                  >
                    <ShieldCheck
                      size={14}
                      style={{ display: 'inline', marginRight: '6px', color: 'var(--color-teal)' }}
                    />
                    Vilkår signert: {formatDateNo(listing.last_verified)}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* 4. Ledige perioder og kalender */}
          <div
            className="listing-availability-box"
            style={{
              padding: 'var(--space-6)',
              background: 'var(--bg-card)',
              borderRadius: '16px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <h3
              style={{
                marginBottom: 'var(--space-4)',
                fontSize: '1.1rem',
                color: 'var(--text-main)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Clock size={20} style={{ color: 'var(--color-royal-blue)' }} /> Ledige perioder for
              utleie
            </h3>
            {availability.length > 0 ? (
              <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                {availability.map((p) => {
                  const canDelete =
                    (canOwnerEditListingDetail && p.status !== 'Formidla') ||
                    (isNavView && kommuneCanEdit && !ownerAgreementTerminated)
                  return (
                    <div
                      key={p.id}
                      className="listing-availability-item"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-3)',
                        padding: 'var(--space-3)',
                        background: 'var(--listing-availability-item-bg)',
                        borderRadius: '10px',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <Calendar
                        size={16}
                        style={{
                          flexShrink: 0,
                          color:
                            p.status === 'Formidla'
                              ? 'var(--color-royal-blue)'
                              : p.status === 'Utilgjengelig'
                                ? '#ef4444'
                                : 'var(--color-teal)',
                        }}
                      />
                      <span
                        className="listing-availability-dates"
                        style={{ fontWeight: 600, color: 'var(--text-main)' }}
                      >
                        {formatDateNo(p.start_date)} - {formatDateNo(p.end_date)}
                      </span>
                      <span
                        className="listing-availability-status"
                        style={{
                          fontSize: '0.75rem',
                          color:
                            p.status === 'Formidla'
                              ? 'var(--color-royal-blue)'
                              : p.status === 'Utilgjengelig'
                                ? '#ef4444'
                                : 'var(--color-teal)',
                          background:
                            p.status === 'Formidla'
                              ? 'rgba(59, 130, 246, 0.1)'
                              : p.status === 'Utilgjengelig'
                                ? 'rgba(239, 68, 68, 0.1)'
                                : 'rgba(32, 187, 175, 0.1)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                        }}
                      >
                        {p.status === 'Formidla'
                          ? t('formidlet')
                          : p.status === 'Utilgjengelig'
                            ? t('unavailable')
                            : t('available')}
                      </span>
                      {canDelete && (
                        <button
                          type="button"
                          className="listing-availability-delete"
                          onClick={() => setPendingDeletePeriod(p)}
                          title={t('remove')}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            color: 'var(--text-muted)',
                            opacity: 0.7,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          aria-label={t('remove')}
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Ingen spesifikke ledige perioder er lagt til for denne boligen.
              </p>
            )}
            {(isNavView || availability.length > 0) && (
              <div style={{ marginTop: 'var(--space-6)' }}>
                <h4
                  style={{
                    marginBottom: 'var(--space-3)',
                    fontSize: '0.95rem',
                    color: 'var(--text-main)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Calendar size={18} style={{ color: 'var(--color-royal-blue)' }} />{' '}
                  {t('calendar')}
                </h4>
                <div
                  className="listing-availability-cal-inner"
                  style={{
                    background: 'var(--listing-availability-item-bg)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-subtle)',
                    padding: 'var(--space-4)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 'var(--space-3)',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setCalendarMonth(
                          (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                        )
                      }
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        color: 'var(--text-body)',
                      }}
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <span
                      style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem' }}
                    >
                      {calendarMonth.toLocaleDateString('no-NO', {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setCalendarMonth(
                          (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                        )
                      }
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        color: 'var(--text-body)',
                      }}
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(7, 1fr)',
                      gap: '2px',
                      fontSize: '0.75rem',
                    }}
                  >
                    {['Ma', 'Ti', 'On', 'To', 'Fr', 'Lø', 'Sø'].map((day) => (
                      <div
                        key={day}
                        style={{
                          textAlign: 'center',
                          fontWeight: 600,
                          color: 'var(--text-muted)',
                          padding: '4px 0',
                        }}
                      >
                        {day}
                      </div>
                    ))}
                    {(() => {
                      const year = calendarMonth.getFullYear(),
                        month = calendarMonth.getMonth(),
                        first = new Date(year, month, 1),
                        last = new Date(year, month + 1, 0),
                        startPad = (first.getDay() + 6) % 7,
                        daysInMonth = last.getDate()
                      const cells: React.ReactNode[] = []
                      for (let i = 0; i < startPad; i++)
                        cells.push(<div key={`pad-${i}`} style={{ minHeight: '32px' }} />)
                      for (let d = 1; d <= daysInMonth; d++) {
                        const date = new Date(year, month, d),
                          status = getStatusForDate(date)
                        const isInFormidletRange =
                          formidletStart &&
                          formidletEnd &&
                          (() => {
                            const t = date.toISOString().slice(0, 10)
                            return t >= formidletStart && t <= formidletEnd
                          })()
                        let bg = 'var(--listing-calendar-cell-bg)'
                        if (isInFormidletRange) bg = 'var(--calendar-formidlet-range-bg)'
                        else if (status === 'Konflikt') bg = '#991b1b'
                        else if (status === 'Formidla') bg = 'var(--calendar-formidlet-bg)'
                        else if (status === 'Tilgjengelig') bg = 'var(--calendar-tilgjengelig-bg)'
                        else if (status === 'Utilgjengelig') bg = 'var(--calendar-utilgjengelig-bg)'
                        cells.push(
                          <div
                            key={d}
                            title={status ? `${d}. ${status}` : `${d}`}
                            style={{
                              minHeight: '32px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '6px',
                              background: bg,
                              color:
                                status === 'Konflikt'
                                  ? '#fff'
                                  : status || isInFormidletRange
                                    ? 'var(--text-main)'
                                    : 'var(--text-muted)',
                              fontWeight: 500,
                            }}
                          >
                            {d}
                          </div>
                        )
                      }
                      return cells
                    })()}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 'var(--space-4)',
                      marginTop: 'var(--space-3)',
                      fontSize: '0.7rem',
                      color: 'var(--text-muted)',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                      title={t('calendarLegendFormidletInfo')}
                    >
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 4,
                          background: 'var(--calendar-formidlet-bg)',
                        }}
                      />{' '}
                      {t('formidlet')}
                    </span>
                    <span
                      style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                      title={t('calendarLegendAvailableInfo')}
                    >
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 4,
                          background: 'var(--calendar-tilgjengelig-bg)',
                        }}
                      />{' '}
                      {t('available')}
                    </span>
                    <span
                      style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                      title={t('calendarLegendUnavailableInfo')}
                    >
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 4,
                          background: 'var(--calendar-utilgjengelig-bg)',
                        }}
                      />{' '}
                      {t('unavailable')}
                    </span>
                    <span
                      style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                      title={t('calendarLegendConflictInfo')}
                    >
                      <span
                        style={{ width: 10, height: 10, borderRadius: 4, background: '#991b1b' }}
                      />{' '}
                      Konflikt
                    </span>
                  </div>
                </div>
              </div>
            )}
            {isNavView && kommuneCanEdit && !ownerAgreementTerminated && (
              <div
                style={{
                  marginTop: 'var(--space-6)',
                  padding: 'var(--space-4)',
                  background: 'rgba(245, 158, 11, 0.08)',
                  borderRadius: '12px',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                }}
              >
                <h4
                  style={{
                    marginBottom: 'var(--space-2)',
                    fontSize: '0.95rem',
                    color: 'var(--text-main)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Lock size={18} style={{ opacity: 0.9 }} /> {t('mediationReserveTitle')}
                </h4>
                <p
                  className="text-sm"
                  style={{
                    margin: '0 0 var(--space-3)',
                    color: 'var(--text-body)',
                    lineHeight: 1.5,
                  }}
                >
                  {t('mediationReserveHint')}
                </p>
                {mediationReservation ? (
                  mediationReservation.reserved_by === currentUser?.id ? (
                    <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                      <p className="text-sm" style={{ margin: 0, color: 'var(--text-main)' }}>
                        {t('mediationReservedByYou').replace(
                          '{expires}',
                          mediationReservation.expires_at
                            ? formatDateTimeNo(mediationReservation.expires_at)
                            : '—'
                        )}
                      </p>
                      {mediationReservation.internal_note ? (
                        <p className="text-sm" style={{ margin: 0, opacity: 0.85 }}>
                          <strong>{t('mediationInternalNote')}:</strong>{' '}
                          {mediationReservation.internal_note}
                        </p>
                      ) : null}
                      <label className="label" style={{ fontSize: '0.7rem' }}>
                        {t('mediationInternalNote')}
                      </label>
                      <textarea
                        className="input"
                        rows={2}
                        value={reservationNote}
                        onChange={(e) => setReservationNote(e.target.value)}
                        placeholder={t('mediationInternalNote')}
                        style={{ marginBottom: 0, resize: 'vertical', minHeight: '56px' }}
                      />
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                        <button
                          type="button"
                          onClick={handleReserveMediation}
                          disabled={reservationLoading}
                          className="button"
                          style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                        >
                          <Clock size={14} /> {t('mediationReserveButton')}
                        </button>
                        <button
                          type="button"
                          onClick={handleReleaseMediation}
                          disabled={reservationLoading}
                          className="button"
                          style={{
                            padding: '8px 16px',
                            fontSize: '0.85rem',
                            background: 'var(--bg-subtle)',
                          }}
                        >
                          {t('mediationRelease')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm" style={{ margin: 0, color: 'var(--text-body)' }}>
                      {t('mediationReservedByOther')
                        .replace('{name}', mediationReservation.reserved_by_name || '…')
                        .replace(
                          '{expires}',
                          mediationReservation.expires_at
                            ? formatDateTimeNo(mediationReservation.expires_at)
                            : '—'
                        )}
                    </p>
                  )
                ) : (
                  <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                    <label className="label" style={{ fontSize: '0.7rem' }}>
                      {t('mediationInternalNote')}
                    </label>
                    <textarea
                      className="input"
                      rows={2}
                      value={reservationNote}
                      onChange={(e) => setReservationNote(e.target.value)}
                      placeholder={t('mediationInternalNote')}
                      style={{ marginBottom: 0, resize: 'vertical', minHeight: '56px' }}
                    />
                    <div>
                      <button
                        type="button"
                        onClick={handleReserveMediation}
                        disabled={reservationLoading}
                        className="button"
                        style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                      >
                        <Lock size={14} /> {t('mediationReserveButton')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {isNavView && !ownerAgreementTerminated && (
              <div
                style={{
                  marginTop: 'var(--space-6)',
                  padding: 'var(--space-4)',
                  background: 'rgba(59, 130, 246, 0.08)',
                  borderRadius: '12px',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                }}
              >
                <h4
                  style={{
                    marginBottom: 'var(--space-3)',
                    fontSize: '0.95rem',
                    color: 'var(--text-main)',
                  }}
                >
                  {t('formidling')}
                </h4>
                {!kommuneCanEdit ? (
                  <p className="text-sm" style={{ color: 'var(--text-body)' }}>
                    {t('formidlingManagedByCaseworker')}
                  </p>
                ) : listing?.status === 'Formidla' ? (
                  <div>
                    <p
                      className="text-sm"
                      style={{ color: 'var(--text-body)', marginBottom: 'var(--space-3)' }}
                    >
                      {t('thisPropertyMarkedFormidlet')}
                    </p>
                    <button
                      onClick={handleRemoveFormidlet}
                      className="button"
                      style={{
                        padding: '8px 16px',
                        fontSize: '0.85rem',
                        background: 'rgba(239, 68, 68, 0.9)',
                      }}
                    >
                      <RotateCcw size={14} /> {t('removeFormidling')}
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                    <label
                      className="label"
                      style={{ fontSize: '0.7rem', color: 'var(--color-accent)' }}
                    >
                      {t('periodDateRange')}
                    </label>
                    <div
                      style={{
                        display: 'flex',
                        gap: 'var(--space-2)',
                        alignItems: 'flex-end',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: '120px' }}>
                        <span
                          className="text-sm"
                          style={{
                            display: 'block',
                            marginBottom: '4px',
                            color: 'var(--text-body)',
                            fontSize: '0.75rem',
                          }}
                        >
                          {t('from')}
                        </span>
                        <DateInput
                          showCalendar
                          className="input"
                          style={{
                            marginBottom: 0,
                            fontSize: '0.9rem',
                            background: 'var(--listing-field-bg)',
                            color: 'var(--text-main)',
                            borderColor: 'rgba(59, 130, 246, 0.5)',
                            opacity:
                              mediationReservation &&
                              mediationReservation.reserved_by !== currentUser?.id
                                ? 0.55
                                : 1,
                          }}
                          value={formidletStart}
                          onChange={setFormidletStart}
                          max={formidletEnd || undefined}
                          placeholder={t('dateInputPlaceholder')}
                          calendarDayTone={(iso) =>
                            dayAvailabilityToneForIso(iso, availability)
                          }
                          disabled={
                            !!(
                              mediationReservation &&
                              mediationReservation.reserved_by !== currentUser?.id
                            )
                          }
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: '120px' }}>
                        <span
                          className="text-sm"
                          style={{
                            display: 'block',
                            marginBottom: '4px',
                            color: 'var(--text-body)',
                            fontSize: '0.75rem',
                          }}
                        >
                          {t('to')}
                        </span>
                        <DateInput
                          showCalendar
                          className="input"
                          style={{
                            marginBottom: 0,
                            fontSize: '0.9rem',
                            background: 'var(--listing-field-bg)',
                            color: 'var(--text-main)',
                            borderColor: 'rgba(59, 130, 246, 0.5)',
                            opacity:
                              mediationReservation &&
                              mediationReservation.reserved_by !== currentUser?.id
                                ? 0.55
                                : 1,
                          }}
                          value={formidletEnd}
                          onChange={setFormidletEnd}
                          min={formidletStart || undefined}
                          placeholder={t('dateInputPlaceholder')}
                          calendarDayTone={(iso) =>
                            dayAvailabilityToneForIso(iso, availability)
                          }
                          disabled={
                            !!(
                              mediationReservation &&
                              mediationReservation.reserved_by !== currentUser?.id
                            )
                          }
                        />
                      </div>
                      <button
                        onClick={handleAddFormidletPeriod}
                        disabled={
                          formidletSending ||
                          !!(
                            mediationReservation &&
                            mediationReservation.reserved_by !== currentUser?.id
                          )
                        }
                        className="button"
                        style={{ padding: '8px 16px', fontSize: '0.85rem', flexShrink: 0 }}
                      >
                        <ShieldCheck size={14} /> {t('addSubmit')}
                      </button>
                    </div>
                    <details style={{ fontSize: '0.8rem', marginTop: 'var(--space-1)' }}>
                      <summary
                        style={{
                          cursor: 'pointer',
                          color: 'var(--text-muted)',
                          userSelect: 'none',
                        }}
                      >
                        {t('mediationNoteOptional')}
                      </summary>
                      <div
                        style={{
                          marginTop: 'var(--space-2)',
                          display: 'grid',
                          gap: 'var(--space-2)',
                          paddingTop: 'var(--space-2)',
                        }}
                      >
                        <textarea
                          className="input"
                          rows={2}
                          maxLength={MAX_MEDIATION_NOTE_IN_NOTIFICATION}
                          value={formidletMediationNote}
                          onChange={(e) => {
                            const v = e.target.value
                            setFormidletMediationNote(v)
                            if (!v.trim()) setFormidletIncludeNoteInNotification(false)
                          }}
                          placeholder={t('mediationNotePlaceholder')}
                          disabled={
                            !!(
                              mediationReservation &&
                              mediationReservation.reserved_by !== currentUser?.id
                            )
                          }
                          style={{
                            marginBottom: 0,
                            fontSize: '0.85rem',
                            resize: 'vertical',
                            minHeight: '48px',
                            maxHeight: '120px',
                          }}
                        />
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 'var(--space-2)',
                            cursor: 'pointer',
                            color: 'var(--text-body)',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={formidletIncludeNoteInNotification}
                            onChange={(e) =>
                              setFormidletIncludeNoteInNotification(e.target.checked)
                            }
                            style={{ marginTop: '2px', width: '18px', height: '18px' }}
                          />
                          <span>{t('includeMediationNoteInNotification')}</span>
                        </label>
                      </div>
                    </details>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. Kontaktinfo for formidling */}
          <section
            id="kontaktinfo"
            className="card no-hover listing-detail-card"
            style={{ padding: 'var(--space-8)' }}
          >
            <h3
              style={{
                margin: '0 0 var(--space-4)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                color: 'var(--text-main)',
              }}
            >
              <User size={20} style={{ color: 'var(--color-accent)' }} />{' '}
              {t('contactInfoForFormidling')}
            </h3>
            <p
              style={{
                margin: '0 0 var(--space-4)',
                color: 'var(--text-body)',
                fontSize: '0.95rem',
                lineHeight: 1.6,
              }}
            >
              Boligutleier har rett å få kontaktinformasjon til leietakere i boligene sine.
              Boligutleier skriver ut mal for kontaktinfoskjema fra Boly i to eksemplarer og fyller
              ut dette med leietaker. Boligutleier og leietaker beholder et eksemplar hver.
            </p>
            <a
              href={publicContactInfoFormPdfUrl()}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="button listing-full-width-mobile-cta"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                textDecoration: 'none',
              }}
            >
              <FileText size={18} /> {t('downloadContactInfoPdf')}
            </a>
          </section>

          {showHouseRulesSection && listing && (
            <section
              className="card no-hover listing-detail-card"
              style={{ padding: 'var(--space-6)' }}
            >
              <h3
                style={{
                  margin: '0 0 var(--space-3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  color: 'var(--text-main)',
                  fontSize: '1.05rem',
                }}
              >
                <FileText size={20} style={{ color: 'var(--color-sky-blue)' }} /> {t('houseRulesTitle')}
              </h3>
              <p
                style={{
                  margin: '0 0 var(--space-4)',
                  color: 'var(--text-body)',
                  fontSize: '0.9rem',
                  lineHeight: 1.55,
                }}
              >
                {t('houseRulesHelp')}
              </p>
              {hasHouseRulesPdf && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'center' }}>
                  {houseRulesPublicUrl && (
                  <a
                    href={houseRulesPublicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="button"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                  >
                    <FileText size={18} /> {t('houseRulesOpenPdf')}
                  </a>
                  )}
                  {canOwnerEditListingDetail && (
                    <>
                      <label className="button button-secondary" style={{ cursor: houseRulesBusy ? 'wait' : 'pointer' }}>
                        <input
                          type="file"
                          accept="application/pdf"
                          disabled={houseRulesBusy}
                          style={{ display: 'none' }}
                          onChange={(e) => void handleHouseRulesFileChange(e)}
                        />
                        {houseRulesBusy ? '…' : t('houseRulesReplace')}
                      </label>
                      <button
                        type="button"
                        className="button"
                        disabled={houseRulesBusy}
                        onClick={() => void handleHouseRulesRemove()}
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: '#b91c1c',
                          border: '1px solid rgba(239, 68, 68, 0.35)',
                        }}
                      >
                        {t('houseRulesRemove')}
                      </button>
                    </>
                  )}
                </div>
              )}
              {!hasHouseRulesPdf && isOwner && !isNavView && (
                <div>
                  <p className="text-sm" style={{ margin: '0 0 var(--space-3)', color: 'var(--text-muted)' }}>
                    {t('houseRulesNone')}
                  </p>
                  {canOwnerEditListingDetail && (
                    <label className="button" style={{ cursor: houseRulesBusy ? 'wait' : 'pointer' }}>
                      <input
                        type="file"
                        accept="application/pdf"
                        disabled={houseRulesBusy}
                        style={{ display: 'none' }}
                        onChange={(e) => void handleHouseRulesFileChange(e)}
                      />
                      {houseRulesBusy ? '…' : t('houseRulesChooseFile')}
                    </label>
                  )}
                  {!canOwnerEditListingDetail && showGalleryFormidlet && (
                    <p className="text-sm" style={{ margin: 0, color: 'var(--text-muted)' }}>
                      {t('ownerCannotEditListingWhenFormidlet')}
                    </p>
                  )}
                </div>
              )}
            </section>
          )}

          <InvoiceBasisSection
            listingId={String(id)}
            paymentMethod={listing.payment_method}
            listingAddress={listing.address}
            listingCity={listing.city}
            listingPostalCode={listing.postal_code}
            ownerName={listing.owner_name}
            isOwner={isOwner}
            isNavView={isNavView}
            hasActiveAgreement={hasActiveAgreement}
            ownerAgreementTerminated={ownerAgreementTerminated}
            onRequireSignTerms={() =>
              router.push(
                `/homeowner/sign-terms?city=${encodeURIComponent((listing?.city || '').trim())}&returnTo=${encodeURIComponent(`/listings/${id}`)}`
              )
            }
            t={t}
          />

          {/* 4. Overtakelsesrapporter */}
          <section
            id="overtakelsesrapport"
            className="card no-hover listing-detail-card"
            style={{ padding: 'var(--space-8)' }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 'var(--space-4)',
                marginBottom: 'var(--space-4)',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  color: 'var(--text-main)',
                }}
              >
                <FileText size={20} style={{ color: 'var(--color-accent)' }} />{' '}
                {t('handoverReports')}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                {handoverReports.length > 0 && (
                  <div style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={() => setReportTimeFilterOpen((prev) => !prev)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 14px',
                        fontSize: '0.875rem',
                        minWidth: '140px',
                        background: 'var(--bg-card)',
                        color: 'var(--text-main)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>
                        {reportTimeFilter === 'all'
                          ? 'Alle'
                          : reportTimeFilter === '7d'
                            ? 'Siste 7 dager'
                            : 'Siste 30 dager'}
                      </span>
                      <ChevronDown
                        size={16}
                        style={{
                          transform: reportTimeFilterOpen ? 'rotate(180deg)' : 'none',
                          transition: 'transform 0.2s',
                          flexShrink: 0,
                        }}
                      />
                    </button>
                    {reportTimeFilterOpen && (
                      <>
                        <div
                          style={{ position: 'fixed', inset: 0, zIndex: 10 }}
                          onClick={() => setReportTimeFilterOpen(false)}
                          aria-hidden="true"
                        />
                        <div
                          style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            marginTop: '4px',
                            minWidth: '100%',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '10px',
                            boxShadow: 'var(--shadow-lg)',
                            zIndex: 11,
                            overflow: 'hidden',
                          }}
                        >
                          {(['all', '7d', '30d'] as const).map((value) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => {
                                setReportTimeFilter(value)
                                setReportTimeFilterOpen(false)
                              }}
                              className="report-filter-option"
                              data-selected={reportTimeFilter === value}
                              style={{
                                display: 'block',
                                width: '100%',
                                padding: '10px 14px',
                                textAlign: 'left',
                                fontSize: '0.875rem',
                                background:
                                  reportTimeFilter === value
                                    ? 'rgba(59, 130, 246, 0.2)'
                                    : 'transparent',
                                color:
                                  reportTimeFilter === value
                                    ? 'var(--color-sky-blue)'
                                    : 'var(--text-main)',
                                border: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              {value === 'all'
                                ? 'Alle'
                                : value === '7d'
                                  ? 'Siste 7 dager'
                                  : 'Siste 30 dager'}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
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
                    refetchHandoverReports()
                  }}
                />
                <button
                  onClick={() => setShowHandoverForm(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    marginTop: 'var(--space-2)',
                  }}
                >
                  {t('cancel')}
                </button>
              </div>
            ) : null}
            <div
              style={{
                maxHeight: '420px',
                overflowY: 'auto',
                display: 'grid',
                gap: 'var(--space-4)',
                paddingRight: 'var(--space-2)',
              }}
            >
              {filteredHandoverReports.length > 0 ? (
                filteredHandoverReports.map((report) => {
                  const isExpanded = expandedReportId === report.id
                  const status = report.approval_status || 'pending'
                  const isPending = status === 'pending'
                  return (
                    <div
                      key={report.id}
                      style={{
                        padding: 'var(--space-4)',
                        background: 'var(--bg-card)',
                        borderRadius: '12px',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          flexWrap: 'wrap',
                          gap: 'var(--space-2)',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 600,
                              color: 'var(--text-main)',
                              fontSize: '0.95rem',
                            }}
                          >
                            {report.reporter_type === 'homeowner' ? t('landlord') : t('tenant')}
                            {report.content?.pdf_url
                              ? ' – PDF lastet opp'
                              : ` – ${(report.content?.tenant_comment || report.content?.condition_description || report.content?.general_condition || 'Rapport').toString().slice(0, 60)}${(report.content?.tenant_comment || report.content?.condition_description || report.content?.general_condition || '')?.toString().length > 60 ? '…' : ''}`}
                            {report.content?.photo_urls?.length
                              ? ` · ${report.content.photo_urls.length} bilder vedlagt`
                              : ''}
                          </div>
                          <div
                            style={{
                              marginTop: '4px',
                              fontSize: '0.8rem',
                              color: 'var(--text-muted)',
                            }}
                          >
                            {formatDateNo(report.created_at)}
                            {report.reporter_type !== 'tenant' && status !== 'pending' && (
                              <span
                                style={{
                                  marginLeft: '8px',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  background:
                                    status === 'approved'
                                      ? 'rgba(45, 212, 191, 0.2)'
                                      : 'rgba(239, 68, 68, 0.2)',
                                  color: status === 'approved' ? 'var(--color-teal)' : '#ef4444',
                                }}
                              >
                                {status === 'approved' ? 'Godkjent' : 'Ikke godkjent'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
                        >
                          {report.content?.pdf_url && (
                            <a
                              href={report.content.pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="button"
                              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                            >
                              Se PDF
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => setExpandedReportId(report.id)}
                            style={{
                              padding: '4px 10px',
                              fontSize: '0.75rem',
                              background: 'var(--bg-app)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: '6px',
                              color: 'var(--text-body)',
                              cursor: 'pointer',
                            }}
                          >
                            Se rapport
                          </button>
                        </div>
                      </div>
                      {(report.content?.tenant_comment || report.content?.condition_description) &&
                        expandedReportId !== report.id && (
                          <div
                            style={{
                              marginTop: 'var(--space-2)',
                              fontSize: '0.85rem',
                              color: 'var(--text-body)',
                            }}
                          >
                            {(
                              report.content.tenant_comment ||
                              report.content.condition_description ||
                              ''
                            )
                              .toString()
                              .slice(0, 120)}
                            {((
                              report.content.tenant_comment || report.content.condition_description
                            )?.toString().length ?? 0) > 120
                              ? '…'
                              : ''}
                          </div>
                        )}
                      {isNavView && isPending && report.reporter_type !== 'tenant' && (
                        <div
                          style={{
                            marginTop: 'var(--space-4)',
                            display: 'flex',
                            gap: 'var(--space-2)',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => handleApproveReport(report.id)}
                            className="button"
                            style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                          >
                            Godkjenn
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRequestChangeReport(report)
                              setRequestChangeComment('')
                            }}
                            className="button"
                            style={{
                              padding: '6px 14px',
                              fontSize: '0.8rem',
                              background: 'transparent',
                              border: '1px solid rgba(249, 115, 22, 0.6)',
                              color: '#f97316',
                            }}
                          >
                            Be om endring
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })
              ) : (
                <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>
                  Ingen overtakelsesrapporter er registrert ennå.
                </p>
              )}
            </div>
            {(() => {
              const isFormidlet =
                listing?.status === 'Formidla' || listingHasFormidlaPeriod(availability)
              const showTenantLink = isNavView && isFormidlet && !ownerAgreementTerminated
              if (!showTenantLink) return null
              return (
                <div
                  style={{
                    marginTop: 'var(--space-6)',
                    padding: 'var(--space-4)',
                    background: 'rgba(59, 130, 246, 0.08)',
                    borderRadius: '12px',
                    border: '2px dashed rgba(59, 130, 246, 0.5)',
                  }}
                >
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-body)' }}>
                    <strong style={{ color: 'var(--text-main)' }}>{t('linkForTenant')}</strong>{' '}
                    {t('linkForTenantDesc')}
                  </p>
                  {tenantReportToken ? (
                    <div style={{ marginTop: 'var(--space-2)' }}>
                      <div
                        style={{
                          display: 'flex',
                          gap: 'var(--space-2)',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                        }}
                      >
                        <code
                          className="listing-code"
                          style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            wordBreak: 'break-all',
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          {typeof window !== 'undefined'
                            ? `${window.location.origin}/report/leietaker/${tenantReportToken}`
                            : ''}
                        </code>
                        <button
                          type="button"
                          onClick={() => {
                            const url =
                              typeof window !== 'undefined'
                                ? `${window.location.origin}/report/leietaker/${tenantReportToken}`
                                : ''
                            navigator.clipboard?.writeText(url).then(() => setCopyFeedback(true))
                            setTimeout(() => setCopyFeedback(false), 2000)
                          }}
                          className="button"
                          style={{ padding: '6px 12px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                        >
                          {copyFeedback ? <CheckCircle2 size={14} /> : <Clipboard size={14} />}
                          {copyFeedback ? ' Kopiert!' : ' Kopier'}
                        </button>
                        <button
                          type="button"
                          onClick={handleRegenerateTenantLink}
                          disabled={tenantLinkRegenerating}
                          className="button button-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                          title={t('listingRegenerateLinkTitle')}
                        >
                          {tenantLinkRegenerating ? (
                            <RefreshCw
                              size={14}
                              style={{ animation: 'spin 0.8s linear infinite' }}
                            />
                          ) : (
                            <RefreshCw size={14} />
                          )}
                          {tenantLinkRegenerating
                            ? ` ${t('listingRegenerating')}`
                            : ` ${t('listingNewLink')}`}
                        </button>
                      </div>
                      <p
                        style={{
                          margin: 'var(--space-2) 0 0',
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                        }}
                      >
                        Bruk «Ny lenke» hvis leietaker sier at lenken er ugyldig – send deretter den
                        nye lenken.
                      </p>
                    </div>
                  ) : (
                    <p
                      style={{
                        margin: 'var(--space-2) 0 0',
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {t('linkGeneratedWhenFormidlet')}
                    </p>
                  )}
                </div>
              )
            })()}
          </section>

          {/* 5. Bilder */}
          <div
            className={`listing-image-gallery${allImages.length === 0 ? ' listing-image-gallery--empty' : ''}`}
            style={{
              width: '100%',
              aspectRatio: '16/9',
              borderRadius: '24px',
              overflow: 'hidden',
              position: 'relative',
              cursor: allImages.length > 0 ? 'pointer' : 'default',
            }}
          >
            {allImages.length > 0 ? (
              <>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setIsFullscreen(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setIsFullscreen(true)
                    }
                  }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    cursor: 'pointer',
                  }}
                  aria-label={t('listingFullscreen')}
                >
                  <OptimizedPublicStorageImage
                    key={allImages[currentImageIndex]}
                    variant="fill"
                    src={allImages[currentImageIndex]}
                    alt={
                      listing?.address
                        ? `${listing.address} — bilde ${currentImageIndex + 1} av ${allImages.length}`
                        : `Boligbilde ${currentImageIndex + 1} av ${allImages.length}`
                    }
                    sizes="(max-width: 768px) 100vw, min(960px, 90vw)"
                    priority={currentImageIndex === 0}
                    style={{
                      objectFit: 'cover',
                      transition: 'all 0.3s',
                    }}
                  />
                </div>

                {allImages.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setCurrentImageIndex(
                          (prev) => (prev - 1 + allImages.length) % allImages.length
                        )
                      }}
                      style={{
                        position: 'absolute',
                        left: '15px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'rgba(0,0,0,0.5)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        cursor: 'pointer',
                        zIndex: 5,
                      }}
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setCurrentImageIndex((prev) => (prev + 1) % allImages.length)
                      }}
                      style={{
                        position: 'absolute',
                        right: '15px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'rgba(0,0,0,0.5)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        cursor: 'pointer',
                        zIndex: 5,
                      }}
                    >
                      <ChevronRight size={24} />
                    </button>
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '20px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'rgba(0,0,0,0.6)',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        color: 'white',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        zIndex: 5,
                      }}
                    >
                      {currentImageIndex + 1} / {allImages.length}
                    </div>
                  </>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsFullscreen(true)
                  }}
                  style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    background: 'rgba(0,0,0,0.5)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    cursor: 'pointer',
                    zIndex: 5,
                  }}
                  title={t('listingFullscreen')}
                >
                  <Maximize2 size={20} />
                </button>
              </>
            ) : (
              <label
                className={`listing-image-placeholder${
                  canOwnerEditListingDetail ? ' listing-image-placeholder--clickable' : ''
                }`}
                style={{ width: '100%', height: '100%' }}
                aria-label={
                  canOwnerEditListingDetail
                    ? `${t('listingImageDropzoneTitle')}. ${t('listingImageDropzoneHint')}`
                    : t('listingImageEmptyViewer')
                }
              >
                {canOwnerEditListingDetail && (
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleUploadMore}
                    style={{ display: 'none' }}
                  />
                )}
                <span className="listing-image-placeholder-icon-wrap" aria-hidden>
                  <ImagePlus
                    size={32}
                    strokeWidth={1.75}
                    className="listing-image-placeholder-icon"
                  />
                </span>
                <span className="listing-image-placeholder-title">
                  {canOwnerEditListingDetail
                    ? t('listingImageDropzoneTitle')
                    : t('listingImageEmptyViewer')}
                </span>
                {canOwnerEditListingDetail && (
                  <span className="listing-image-placeholder-hint">{t('listingImageDropzoneHint')}</span>
                )}
              </label>
            )}

            {canOwnerEditListingDetail && allImages.length > 0 && (
              <label
                style={{
                  position: 'absolute',
                  bottom: '20px',
                  right: '20px',
                  background: 'var(--color-royal-blue)',
                  color: 'white',
                  padding: '10px 20px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  zIndex: 6,
                }}
              >
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleUploadMore}
                  style={{ display: 'none' }}
                />
                {uploading ? <Camera size={18} style={{ opacity: 0.5 }} /> : <Camera size={18} />}
                {uploading ? t('listingImageUploading') : t('listingImageAddPhotos')}
              </label>
            )}

            <div
              style={{
                position: 'absolute',
                top: 20,
                left: 20,
                padding: '6px 16px',
                borderRadius: '20px',
                background: showGalleryFormidlet
                  ? 'var(--color-sky-blue)'
                  : listing?.status === 'Tilgjengelig'
                    ? 'var(--color-teal)'
                    : '#ef4444',
                color: 'white',
                fontWeight: 800,
                fontSize: '0.8rem',
                textTransform: showGalleryFormidlet ? 'none' : 'uppercase',
                zIndex: 5,
              }}
            >
              {showGalleryFormidlet ? 'Formidlet' : (listing?.status ?? '')}
            </div>
          </div>

          {canOwnerEditListingDetail && allImages.length > 1 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 10,
                marginTop: 'var(--space-3)',
                alignItems: 'flex-end',
              }}
            >
              {allImages.map((url, idx) => (
                <div
                  key={`${url}-${idx}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      position: 'relative',
                      width: 56,
                      height: 56,
                      borderRadius: 8,
                      overflow: 'hidden',
                      border:
                        idx === currentImageIndex
                          ? '2px solid var(--color-accent)'
                          : '1px solid var(--border-subtle)',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setCurrentImageIndex(idx)}
                      style={{
                        padding: 0,
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        width: '100%',
                        height: '100%',
                      }}
                      aria-label={`${idx + 1} / ${allImages.length}`}
                    >
                      <OptimizedPublicStorageImage
                        variant="fixed"
                        src={url}
                        alt=""
                        width={56}
                        height={56}
                        sizes="56px"
                        style={{ objectFit: 'cover', display: 'block' }}
                      />
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 2 }}>
                    <button
                      type="button"
                      className="button"
                      disabled={isSaving === 'image_urls' || idx === 0}
                      onClick={() => void handleReorderListingImage(idx, -1)}
                      style={{ padding: '2px 6px', minHeight: 28, fontSize: '0.7rem' }}
                      title={t('listingImageMoveEarlier')}
                      aria-label={t('listingImageMoveEarlier')}
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      className="button"
                      disabled={isSaving === 'image_urls' || idx >= allImages.length - 1}
                      onClick={() => void handleReorderListingImage(idx, 1)}
                      style={{ padding: '2px 6px', minHeight: 28, fontSize: '0.7rem' }}
                      title={t('listingImageMoveLater')}
                      aria-label={t('listingImageMoveLater')}
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Fullscreen: portal til document.body så fixed dekker viewport (ikke faner/layout med transform). */}
          {typeof document !== 'undefined' &&
            isFullscreen &&
            allImages.length > 0 &&
            createPortal(
              <div
                role="dialog"
                aria-modal="true"
                aria-label={t('listingFullscreen')}
                style={{
                  position: 'fixed',
                  inset: 0,
                  width: '100vw',
                  height: '100dvh',
                  maxHeight: '100vh',
                  background: 'rgba(0,0,0,0.95)',
                  zIndex: 2147483000,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxSizing: 'border-box',
                }}
                onClick={() => setIsFullscreen(false)}
              >
                <button
                  type="button"
                  onClick={() => setIsFullscreen(false)}
                  style={{
                    position: 'absolute',
                    top: 'max(16px, env(safe-area-inset-top))',
                    right: 'max(16px, env(safe-area-inset-right))',
                    background: 'none',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    padding: '10px',
                    zIndex: 2,
                  }}
                  aria-label={t('close')}
                >
                  <X size={40} />
                </button>

                <div
                  style={{
                    position: 'relative',
                    width: 'min(95vw, 1400px)',
                    height: 'min(85dvh, 900px)',
                    maxHeight: '85vh',
                    flex: '0 1 auto',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <OptimizedPublicStorageImage
                    key={`fs-${allImages[currentImageIndex]}`}
                    variant="fill"
                    src={allImages[currentImageIndex]}
                    alt={
                      listing?.address
                        ? `${listing.address} — bilde ${currentImageIndex + 1} av ${allImages.length}`
                        : `Boligbilde ${currentImageIndex + 1} av ${allImages.length}`
                    }
                    sizes="100vw"
                    style={{ objectFit: 'contain' }}
                  />
                </div>

                {allImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setCurrentImageIndex(
                          (prev) => (prev - 1 + allImages.length) % allImages.length
                        )
                      }}
                      style={{
                        position: 'absolute',
                        left: 'max(16px, env(safe-area-inset-left))',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'rgba(255,255,255,0.1)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '60px',
                        height: '60px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        cursor: 'pointer',
                        zIndex: 2,
                      }}
                      aria-label={t('listingGalleryPrev')}
                    >
                      <ChevronLeft size={40} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setCurrentImageIndex((prev) => (prev + 1) % allImages.length)
                      }}
                      style={{
                        position: 'absolute',
                        right: 'max(16px, env(safe-area-inset-right))',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'rgba(255,255,255,0.1)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '60px',
                        height: '60px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        cursor: 'pointer',
                        zIndex: 2,
                      }}
                      aria-label={t('listingGalleryNext')}
                    >
                      <ChevronRight size={40} />
                    </button>
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 'max(20px, env(safe-area-inset-bottom))',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'rgba(0,0,0,0.55)',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        color: 'white',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        zIndex: 2,
                      }}
                    >
                      {currentImageIndex + 1} / {allImages.length}
                    </div>
                  </>
                )}
              </div>,
              document.body
            )}

          {/* 6. Administrer (eier) – kun synlig for eier som ikke er i nav-visning */}
          {!isNavView && isOwner && (
            <section className="card listing-detail-card" style={{ padding: 'var(--space-6)' }}>
              <Link
                href={`/homeowner/manage`}
                className="button"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                }}
              >
                <Edit3 size={18} /> Administrer denne boligen
              </Link>
            </section>
          )}

          <style jsx>{`
            .editable-h1:hover {
              background: rgba(0, 0, 0, 0.02) !important;
            }
            .editable-h1:focus {
              background: rgba(59, 130, 246, 0.05) !important;
              border-bottom: 2px solid var(--color-sky-blue) !important;
            }
            input:focus,
            select:focus,
            textarea:focus {
              background: rgba(59, 130, 246, 0.05) !important;
              outline: none !important;
            }
            input,
            select,
            textarea {
              transition: all 0.2s;
              border-radius: 4px;
            }
            input[type='number']::-webkit-inner-spin-button,
            input[type='number']::-webkit-outer-spin-button {
              -webkit-appearance: none;
              margin: 0;
            }
          `}</style>
        </div>

        {/* Right Column */}
        {isNavView && (
          <div className="listing-details-sticky-sidebar" style={{ position: 'sticky', top: '20px' }}>
            <div
              className="card"
              style={{
                padding: 'var(--space-8)',
                border: '1px solid var(--color-royal-blue)',
                background: 'var(--color-dark-navy)',
              }}
            >
              <div style={{ marginBottom: 'var(--space-6)' }}>
                <div
                  style={{
                    fontSize: '0.85rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    opacity: 0.6,
                    marginBottom: '4px',
                    color: 'var(--text-muted)',
                  }}
                >
                  Døgnpris
                </div>
                <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {listing.price_daily},-
                </span>
              </div>

              <div
                style={{ display: 'grid', gap: 'var(--space-3)', marginBottom: 'var(--space-8)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-sm opacity-70" style={{ color: 'var(--text-muted)' }}>
                    Ukespris:
                  </span>
                  <span className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                    {listing.price_weekly},-
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-sm opacity-70" style={{ color: 'var(--text-muted)' }}>
                    Månedsleie (korttid):
                  </span>
                  <span className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                    {listing.price_monthly_short},-
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: 'var(--space-3)',
                  }}
                >
                  <span className="text-sm opacity-70" style={{ color: 'var(--text-muted)' }}>
                    Langtidsleie (per mnd):
                  </span>
                  <span className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                    {listing.price_monthly_long},-
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-sm opacity-70" style={{ color: 'var(--text-muted)' }}>
                    Depositum:
                  </span>
                  <span className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                    {listing.deposit_amount},-
                  </span>
                </div>
              </div>

              <div
                style={{
                  marginBottom: 'var(--space-4)',
                  padding: 'var(--space-3)',
                  background: 'var(--bg-app)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div
                  style={{
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    opacity: 0.65,
                    marginBottom: 'var(--space-2)',
                    color: 'var(--text-muted)',
                  }}
                >
                  {t('depositGuaranteeHeading')}
                </div>
                {listing.deposit_guarantee == null ? (
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.85rem',
                      color: 'var(--text-muted)',
                      lineHeight: 1.45,
                    }}
                  >
                    {t('depositGuaranteeNotSpecified')}
                  </p>
                ) : (
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {[
                      ['nav', 'depositGuaranteeRowNav'] as const,
                      ['other', 'depositGuaranteeRowOther'] as const,
                      ['ordinary', 'depositGuaranteeRowOrdinary'] as const,
                    ].map(([key, labelKey]) => (
                      <div
                        key={key}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: 'var(--space-3)',
                          fontSize: '0.85rem',
                          color: 'var(--text-main)',
                        }}
                      >
                        <span style={{ flex: 1, lineHeight: 1.4 }}>{t(labelKey)}</span>
                        <span style={{ fontWeight: 700, flexShrink: 0, opacity: 0.95 }}>
                          {hasDepositGuarantee(listing.deposit_guarantee, key)
                            ? t('depositGuaranteeYes')
                            : t('depositGuaranteeNo')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {ownerAgreementTerminated ? (
                <div
                  style={{
                    padding: 'var(--space-3)',
                    background: 'var(--bg-app)',
                    borderRadius: '8px',
                    marginBottom: 'var(--space-4)',
                    fontSize: '0.9rem',
                    color: 'var(--text-body)',
                  }}
                >
                  {t('expiredOwnerNoMediationShort')}
                </div>
              ) : !kommuneCanEdit ? (
                <div
                  style={{
                    padding: 'var(--space-3)',
                    background: 'var(--bg-app)',
                    borderRadius: '8px',
                    marginBottom: 'var(--space-4)',
                    fontSize: '0.9rem',
                    color: 'var(--text-body)',
                  }}
                >
                  {t('formidlingManagedByCaseworkerShort')}
                </div>
              ) : listing?.status === 'Formidla' ? (
                <div
                  style={{
                    padding: 'var(--space-3)',
                    background: 'rgba(59, 130, 246, 0.2)',
                    borderRadius: '8px',
                    marginBottom: 'var(--space-4)',
                    fontSize: '0.9rem',
                    color: 'var(--text-main)',
                  }}
                >
                  {t('formidletUseRemoveBelow')}
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: 'var(--space-4)' }}>
                    <label
                      className="label"
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        marginBottom: 'var(--space-2)',
                        display: 'block',
                      }}
                    >
                      {t('tidsspannFormidling')}
                    </label>
                    <div className="listing-sidebar-formidlet-dates">
                      <div>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            color: 'var(--text-muted)',
                            display: 'block',
                            marginBottom: '4px',
                          }}
                        >
                          {t('from')}
                        </span>
                        <DateInput
                          showCalendar
                          className="input"
                          value={formidletStart}
                          onChange={setFormidletStart}
                          max={formidletEnd || undefined}
                          placeholder={t('dateInputPlaceholder')}
                          calendarDayTone={(iso) =>
                            dayAvailabilityToneForIso(iso, availability)
                          }
                          style={{
                            padding: 'var(--space-2)',
                            fontSize: '0.85rem',
                            background: 'var(--bg-app)',
                            border: '1px solid var(--border-medium)',
                            color: 'var(--text-main)',
                            borderRadius: '8px',
                            marginBottom: 0,
                            width: '100%',
                          }}
                        />
                      </div>
                      <div>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            color: 'var(--text-muted)',
                            display: 'block',
                            marginBottom: '4px',
                          }}
                        >
                          {t('to')}
                        </span>
                        <DateInput
                          showCalendar
                          className="input"
                          value={formidletEnd}
                          onChange={setFormidletEnd}
                          min={formidletStart || undefined}
                          placeholder={t('dateInputPlaceholder')}
                          calendarDayTone={(iso) =>
                            dayAvailabilityToneForIso(iso, availability)
                          }
                          style={{
                            padding: 'var(--space-2)',
                            fontSize: '0.85rem',
                            background: 'var(--bg-app)',
                            border: '1px solid var(--border-medium)',
                            color: 'var(--text-main)',
                            borderRadius: '8px',
                            marginBottom: 0,
                            width: '100%',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <details
                    style={{
                      fontSize: '0.75rem',
                      marginBottom: 'var(--space-3)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <summary style={{ cursor: 'pointer', userSelect: 'none' }}>
                      {t('mediationNoteOptional')}
                    </summary>
                    <div
                      style={{
                        marginTop: 'var(--space-2)',
                        display: 'grid',
                        gap: 'var(--space-2)',
                      }}
                    >
                      <textarea
                        className="input"
                        rows={2}
                        maxLength={MAX_MEDIATION_NOTE_IN_NOTIFICATION}
                        value={formidletMediationNote}
                        onChange={(e) => {
                          const v = e.target.value
                          setFormidletMediationNote(v)
                          if (!v.trim()) setFormidletIncludeNoteInNotification(false)
                        }}
                        placeholder={t('mediationNotePlaceholder')}
                        style={{
                          marginBottom: 0,
                          fontSize: '0.85rem',
                          resize: 'vertical',
                          minHeight: '48px',
                          maxHeight: '120px',
                          background: 'var(--bg-app)',
                          border: '1px solid var(--border-medium)',
                          color: 'var(--text-main)',
                        }}
                      />
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 'var(--space-2)',
                          cursor: 'pointer',
                          color: 'var(--text-body)',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={formidletIncludeNoteInNotification}
                          onChange={(e) => setFormidletIncludeNoteInNotification(e.target.checked)}
                          style={{ marginTop: '2px', width: '18px', height: '18px' }}
                        />
                        <span>{t('includeMediationNoteInNotification')}</span>
                      </label>
                    </div>
                  </details>
                  <button
                    type="button"
                    onClick={handleAddFormidletPeriod}
                    disabled={formidletSending || !formidletStart || !formidletEnd}
                    className="button"
                    style={{
                      width: '100%',
                      padding: 'var(--space-4)',
                      fontSize: '1.1rem',
                      marginBottom: 'var(--space-4)',
                      opacity: formidletSending || !formidletStart || !formidletEnd ? 0.6 : 1,
                      cursor:
                        formidletSending || !formidletStart || !formidletEnd
                          ? 'not-allowed'
                          : 'pointer',
                    }}
                  >
                    {formidletSending ? t('startingFormidling') : t('startFormidling')}
                  </button>
                </>
              )}
              <div
                style={{ textAlign: 'center', fontSize: '0.8rem', opacity: 0.6, color: 'var(--text-muted)' }}
              >
                {t('agreementHistoryLogged')}
              </div>
            </div>

            <div
              className="card"
              style={{
                marginTop: 'var(--space-6)',
                padding: 'var(--space-6)',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <h3
                style={{
                  fontSize: '1rem',
                  marginBottom: 'var(--space-4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  color: 'var(--text-main)',
                }}
              >
                <User size={18} style={{ color: 'var(--text-main)' }} /> {t('landlord')}
              </h3>
              <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                  {listing.owner_name}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    fontSize: '0.9rem',
                    color: 'var(--text-body)',
                  }}
                >
                  <Phone size={14} style={{ color: 'var(--color-accent)' }} />{' '}
                  {listing.contact_phone}
                </div>
                {listing.owner_id && !ownerAgreementTerminated && (
                  <Link
                    href={`/nav/messages?with=${listing.owner_id}`}
                    className="button button-secondary"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 'var(--space-2)',
                      padding: 'var(--space-2) var(--space-4)',
                      fontSize: '0.9rem',
                      textDecoration: 'none',
                      marginTop: 'var(--space-1)',
                    }}
                  >
                    <MessageSquare size={18} /> {t('message')}
                  </Link>
                )}
                <div
                  style={{
                    marginTop: 'var(--space-2)',
                    padding: 'var(--space-3)',
                    background: 'rgba(45, 212, 191, 0.12)',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    color: 'var(--color-teal)',
                    border: '1px solid rgba(45, 212, 191, 0.3)',
                  }}
                >
                  <ShieldCheck
                    size={14}
                    style={{ display: 'inline', marginRight: '6px', color: 'var(--color-teal)' }}
                  />
                  Vilkår signert: {formatDateNo(listing.last_verified)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fullskjerm: Se rapport – stor visning med smooth tilbake */}
      {(() => {
        const expandedReport = handoverReports.find((r: any) => r.id === expandedReportId)
        if (!expandedReport) return null
        const status = expandedReport.approval_status || 'pending'
        return (
          <div
            className="report-fullscreen-overlay"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 999,
              background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'stretch',
              justifyContent: 'flex-start',
              padding: 'var(--space-4)',
              overflow: 'auto',
            }}
            onClick={() => setExpandedReportId(null)}
          >
            <div
              className="report-fullscreen-panel"
              style={{
                maxWidth: '900px',
                width: '100%',
                maxHeight: '92vh',
                margin: 'auto',
                background: 'var(--bg-card)',
                borderRadius: '16px',
                border: '1px solid var(--border-subtle)',
                boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  position: 'sticky',
                  top: 0,
                  left: 0,
                  right: 0,
                  padding: 'var(--space-4) var(--space-6)',
                  background: 'var(--bg-card)',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 'var(--space-3)',
                  zIndex: 1,
                }}
              >
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)' }}>
                  {expandedReport.reporter_type === 'homeowner' ? t('landlord') : t('tenant')}
                  {expandedReport.content?.photo_urls?.length
                    ? ` · ${expandedReport.content.photo_urls.length} bilder vedlagt`
                    : ''}
                </h3>
                <button
                  type="button"
                  onClick={() => setExpandedReportId(null)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    background: 'var(--bg-app)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                  }}
                >
                  <ArrowLeft size={18} /> {t('close')}
                </button>
              </div>
              <div
                style={{
                  padding: 'var(--space-6)',
                  fontSize: '1rem',
                  color: 'var(--text-body)',
                  lineHeight: 1.6,
                  overflow: 'auto',
                  flex: 1,
                  minHeight: 0,
                }}
              >
                <div
                  style={{
                    marginBottom: 'var(--space-4)',
                    fontSize: '0.9rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  {formatDateNo(expandedReport.created_at)}
                  {expandedReport.reporter_type !== 'tenant' && status !== 'pending' && (
                    <span
                      style={{
                        marginLeft: '12px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        background:
                          status === 'approved'
                            ? 'rgba(45, 212, 191, 0.2)'
                            : 'rgba(239, 68, 68, 0.2)',
                        color: status === 'approved' ? 'var(--color-teal)' : '#ef4444',
                      }}
                    >
                      {status === 'approved' ? 'Godkjent' : 'Ikke godkjent'}
                    </span>
                  )}
                </div>
                <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                  {expandedReport.content?.address && (
                    <p style={{ margin: 0 }}>
                      <strong style={{ color: 'var(--text-main)' }}>Adresse:</strong>{' '}
                      {expandedReport.content.address}
                    </p>
                  )}
                  {expandedReport.content?.agreement_period && (
                    <p style={{ margin: 0 }}>
                      <strong style={{ color: 'var(--text-main)' }}>Avtaleperiode:</strong>{' '}
                      {expandedReport.content.agreement_period}
                    </p>
                  )}
                  {expandedReport.content?.inventory && (
                    <p style={{ margin: 0 }}>
                      <strong style={{ color: 'var(--text-main)' }}>Inventar:</strong>{' '}
                      {expandedReport.content.inventory}
                    </p>
                  )}
                  {expandedReport.content?.keys && (
                    <p style={{ margin: 0 }}>
                      <strong style={{ color: 'var(--text-main)' }}>Nøkler:</strong>{' '}
                      {expandedReport.content.keys}
                    </p>
                  )}
                  {(expandedReport.content?.tenant_comment ||
                    expandedReport.content?.condition_description) && (
                    <p style={{ margin: 0 }}>
                      <strong style={{ color: 'var(--text-main)' }}>
                        {expandedReport.reporter_type === 'tenant'
                          ? t('tenantHandoverCommentLabel')
                          : t('conditionDescription')}
                      </strong>{' '}
                      {expandedReport.content.tenant_comment ||
                        expandedReport.content.condition_description}
                    </p>
                  )}
                  {expandedReport.request_change_comment && (
                    <p style={{ margin: 0, color: '#ef4444' }}>
                      <strong>{t('commentFromKommune')}</strong>{' '}
                      {expandedReport.request_change_comment}
                    </p>
                  )}
                </div>
                {expandedReport.content?.photo_urls?.length ? (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                      gap: 'var(--space-4)',
                      marginTop: 'var(--space-6)',
                    }}
                  >
                    {expandedReport.content.photo_urls.map((url: string, i: number) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'block',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          border: '1px solid var(--border-subtle)',
                          position: 'relative',
                          aspectRatio: '1',
                        }}
                      >
                        <OptimizedPublicStorageImage
                          variant="fill"
                          src={url}
                          alt={`Overtakelsesrapport, bilde ${i + 1}`}
                          sizes="(max-width: 768px) 45vw, 200px"
                          style={{ objectFit: 'cover' }}
                        />
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Modal: Be om endring – kommentar til utleier og send melding */}
      {requestChangeReport && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 'var(--space-4)',
          }}
          onClick={() => !requestChangeSending && setRequestChangeReport(null)}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: '16px',
              padding: 'var(--space-8)',
              maxWidth: '440px',
              width: '100%',
              border: '1px solid var(--border-subtle)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 style={{ margin: '0 0 var(--space-4)', color: 'var(--text-main)' }}>
              Be om endring i overtakelsesrapport
            </h4>
            <p
              style={{
                margin: '0 0 var(--space-4)',
                fontSize: '0.9rem',
                color: 'var(--text-body)',
              }}
            >
              Skriv en kommentar som sendes til utleier. De får melding og kan sende inn en ny
              rapport.
            </p>
            <textarea
              value={requestChangeComment}
              onChange={(e) => setRequestChangeComment(e.target.value)}
              placeholder={t('listingRequestChangePlaceholder')}
              rows={4}
              className="input"
              style={{
                width: '100%',
                marginBottom: 'var(--space-4)',
                resize: 'vertical',
                minHeight: '100px',
              }}
            />
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setRequestChangeReport(null)}
                disabled={requestChangeSending}
                style={{
                  padding: '8px 16px',
                  background: 'var(--bg-app)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  color: 'var(--text-body)',
                  cursor: requestChangeSending ? 'not-allowed' : 'pointer',
                }}
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleRequestChangeSubmit}
                disabled={requestChangeSending}
                className="button"
                style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {requestChangeSending ? (
                  'Sender…'
                ) : (
                  <>
                    <Send size={16} /> Send melding og marker som ikke godkjent
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
