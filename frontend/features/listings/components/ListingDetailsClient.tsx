'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase, getAuthUserDeduped } from '@/app/lib/supabase'
import { useConfirm, useToast } from '@/app/components/design-system'
import PortalPageShell from '@/app/components/design-system/PortalPageShell'
import { useListingMediation } from '@/features/mediation/hooks/useListingMediation'
import {
  ListingDetailsNavMediationPanels,
  ListingDetailsNavNotesPanel,
  ListingDetailsNavStickySidebar,
} from '@/features/mediation/views/ListingDetailsNavView'
import {
  ListingDetailsOwnerAdminLink,
  ListingDetailsOwnerEditableStyles,
  ListingDetailsOwnerGallery,
  ListingDetailsOwnerHouseRules,
} from '@/features/listings/views/ListingDetailsOwnerView'

import { useLanguage } from '@/context/LanguageContext'
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

import { Button } from '@/app/components/ui/Button'
import { OptimizedPublicStorageImage } from '@/app/components/OptimizedPublicStorageImage'
import { formatDateNo, formatDateTimeNo } from '@/app/lib/dateFormat'
import { geocodeAddressBestEffort } from '@/app/lib/geocoding'
import { getListingMapCoords, listingMapCoordsPayload } from '@/app/lib/listingMapCoords'
import { supabaseErrorMessage } from '@/app/lib/supabaseErrorMessage'
import { dayAvailabilityToneForIso } from '@/app/lib/listingDayAvailabilityTone'
import {
  listingRowFieldsForAvailabilityToday,
  formidlaPeriodIdsOverlappingToday,
} from '@/app/lib/listingAvailabilityStatusToday'
import { DateInput } from '@/app/components/DateInput'
import {
  appendMediationNoteToOwnerMessage,
  MAX_MEDIATION_NOTE_IN_NOTIFICATION,
} from '@/app/lib/formidletNotification'
import { notifyLandlordInvoiceBasisIfKonto } from '@/app/lib/invoiceBasisNotify'
import { publicContactInfoFormPdfUrl, publicDocumentsFileUrl } from '@/app/lib/storagePublicUrl'
import {
  getHouseRulesPublicUrl,
  removeHouseRulesPdfObject,
  uploadHouseRulesPdf,
} from '@/app/lib/houseRulesPdf'

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

const HandoverReport = dynamic(() => import('@/app/components/HandoverReport'), {
  ssr: false,
  loading: () => <DeferredChunkPlaceholder minHeight={140} />,
})
const InvoiceBasisSection = dynamic(() => import('@/app/listings/[id]/InvoiceBasisSection'), {
  ssr: false,
  loading: () => <DeferredChunkPlaceholder minHeight={96} />,
})

import {
  DEPOSIT_GUARANTEE_VALUES,
  hasDepositGuarantee,
  normalizeListingImageUrls,
  listingHasFormidlaPeriod,
  listingDetailsErrMessage as errMessage,
} from '@/features/listings/lib/listingDetailsUtils'
import { useListingDetailsQuery } from '@/features/listings/hooks/useListingDetailsQuery'
import { useListingDetailsOwnerActions } from '@/features/listings/hooks/useListingDetailsOwnerActions'
import { useTermsGate } from '@/features/auth/hooks/useTermsGate'
import ListingDetailsAddressSection from '@/features/listings/components/ListingDetailsAddressSection'
import ListingDetailsPropertySection from '@/features/listings/components/ListingDetailsPropertySection'
import ListingDetailsAvailabilitySection from '@/features/listings/components/ListingDetailsAvailabilitySection'
import ListingDetailsHandoverSection from '@/features/listings/components/ListingDetailsHandoverSection'
import ListingDetailsHandoverModals from '@/features/listings/components/ListingDetailsHandoverModals'
import type { ListingAvailabilityRow } from '@/app/lib/listingUiTypes'

export default function ListingDetailsClient() {
  const { id: idParam } = useParams()
  const id = typeof idParam === 'string' ? idParam : idParam?.[0] ?? ''
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useLanguage()
  const toast = useToast()
  const confirmDialog = useConfirm()
  const { requireActiveAgreement } = useTermsGate()
  const viewMode = searchParams.get('view') // 'nav' eller 'owner'
  const isNavView = viewMode === 'nav'

  const {
    listing,
    setListing,
    availability,
    setAvailability,
    loading,
    navNotes,
    setNavNotes,
    currentUser,
    handoverReports,
    setHandoverReports,
    hasActiveAgreement,
    regionAccessDenied,
    kommuneCanEdit,
    viewerIsKommuneStaff,
    viewerIsEventStaff,
    ownerAgreementTerminated,
    tenantReportToken,
    setTenantReportToken,
    mediationReservation,
    loadMediationReservation,
  } = useListingDetailsQuery({ id, isNavView, router })
  const mediation = useListingMediation({
    id, listing, availability, setListing, setAvailability, isNavView,
    kommuneCanEdit, ownerAgreementTerminated, currentUser, mediationReservation,
    loadMediationReservation, confirmDialog, toast, t,
  })
  const { calendarMonth, setCalendarMonth, pendingDeletePeriod, setPendingDeletePeriod, getStatusForDate, handleRemovePeriod, formidletStart, formidletEnd } = mediation


  const [newNote, setNewNote] = useState('')
  const [copyFeedback, setCopyFeedback] = useState(false)
  const [showHandoverForm, setShowHandoverForm] = useState(false)
  const [tenantLinkRegenerating, setTenantLinkRegenerating] = useState(false)
  const [reportTimeFilter, setReportTimeFilter] = useState<'all' | '7d' | '30d'>('all')
  const [reportTimeFilterOpen, setReportTimeFilterOpen] = useState(false)
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null)
  const [requestChangeReport, setRequestChangeReport] = useState<any | null>(null)
  const [requestChangeComment, setRequestChangeComment] = useState('')
  const [requestChangeSending, setRequestChangeSending] = useState(false)
  const [showNavNotes, setShowNavNotes] = useState(false)

  // Gallery state
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [houseRulesBusy, setHouseRulesBusy] = useState(false)
  const [isSaving, setIsSaving] = useState<string | null>(null)


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

  const {
    translateType,
    handleUpdateField,
    handlePetPolicyChange,
    handleRegenerateTenantLink,
    handleUploadMore,
    handleReorderListingImage,
    handleHouseRulesFileChange,
    handleHouseRulesRemove,
    handleAddNote,
    handleCopyLink,
    refetchHandoverReports,
    handleApproveReport,
    handleRequestChangeSubmit,
    filteredHandoverReports,
  } = useListingDetailsOwnerActions({
    id,
    listing,
    setListing,
    currentUser,
    isOwner,
    isNavView,
    hasActiveAgreement,
    showGalleryFormidlet,
    canOwnerEditListingDetail,
    allImages,
    navNotes,
    setNavNotes,
    handoverReports,
    setHandoverReports,
    ownerAgreementTerminated,
    tenantLinkRegenerating,
    setTenantLinkRegenerating,
    setTenantReportToken,
    reportTimeFilter,
    requestChangeReport,
    setRequestChangeReport,
    requestChangeComment,
    setRequestChangeComment,
    setRequestChangeSending,
    newNote,
    setNewNote,
    setIsSaving,
    setUploading,
    setCurrentImageIndex,
    setHouseRulesBusy,
    setCopyFeedback,
    loading,
    confirmDialog,
    toast,
    t,
  })

  const notFoundHref = isNavView ? '/nav/database' : currentUser ? '/homeowner/manage' : '/'
  const notFoundLabel = isNavView ? t('backToHousingBank') : currentUser ? t('backToMyProperties') : t('backToHome')
  const loadingOrError = (() => {
    if (loading) return { loading: true as const }
    if (!listing) {
      if (isNavView && currentUser) {
        return { error: (
          <div style={{ textAlign: 'center', padding: 'var(--space-10)', maxWidth: '480px', margin: '0 auto' }}>
            <h2 style={{ color: 'var(--text-main)', marginBottom: 'var(--space-3)' }}>{t('noAccessThisListing')}</h2>
            <p style={{ color: 'var(--text-body)', marginBottom: 'var(--space-6)' }}>{t('listingNavEmptyListingBody')}</p>
            <Link href={notFoundHref} className="button" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <ArrowLeft size={18} /> {notFoundLabel}
            </Link>
          </div>
        ) }
      }
      return { error: (
        <div style={{ textAlign: 'center', padding: 'var(--space-10)' }}>
          <h2 style={{ color: 'var(--text-main)' }}>{t('listingNotFoundTitle')}</h2>
          <p style={{ color: 'var(--text-body)', marginTop: 'var(--space-3)', maxWidth: '420px', marginInline: 'auto' }}>{t('listingNotFoundBody')}</p>
          <Link href={notFoundHref} className="button" style={{ marginTop: 'var(--space-4)' }}>{notFoundLabel}</Link>
        </div>
      ) }
    }
    if (regionAccessDenied) {
      return { error: (
        <div style={{ textAlign: 'center', padding: 'var(--space-10)', maxWidth: '480px', margin: '0 auto' }}>
          <h2 style={{ color: 'var(--text-main)', marginBottom: 'var(--space-3)' }}>{t('noAccessThisListing')}</h2>
          <p style={{ color: 'var(--text-body)', marginBottom: 'var(--space-6)' }}>{t('listingInRegionDesc').replace('{city}', listing?.city ?? '')}</p>
          <Link href="/nav/database" className="button" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <ArrowLeft size={18} /> {t('backToHousingBank')}
          </Link>
        </div>
      ) }
    }
    return null
  })()
  if (loadingOrError) return <PortalPageShell loading={loadingOrError.loading} error={loadingOrError.error} />
  if (!listing) return null

  return (
    <main className="container listing-details-main">
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
          href={
            isNavView
              ? viewerIsEventStaff
                ? '/nav/event/database'
                : '/nav/database'
              : '/homeowner/manage'
          }
          className="nav-link listing-details-back-link"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
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
          <ListingDetailsAddressSection
            listing={listing}
            setListing={setListing}
            isNavView={isNavView}
            isOwner={isOwner}
            showNavNotes={showNavNotes}
            setShowNavNotes={setShowNavNotes}
            navNotes={navNotes}
            canOwnerEditListingDetail={canOwnerEditListingDetail}
            showGalleryFormidlet={showGalleryFormidlet}
            handleUpdateField={handleUpdateField}
            t={t}
          />

          {/* Interne notater (kommune) – vises når man trykker på notat-ikonet */}

          {isNavView && showNavNotes ? (
            <ListingDetailsNavNotesPanel navNotes={navNotes} newNote={newNote} setNewNote={setNewNote} onAddNote={handleAddNote} t={t} />
          ) : null}

          <ListingDetailsPropertySection
            listing={listing}
            setListing={setListing}
            canOwnerEditListingDetail={canOwnerEditListingDetail}
            isOwner={isOwner}
            isNavView={isNavView}
            viewerIsKommuneStaff={viewerIsKommuneStaff}
            ownerAgreementTerminated={ownerAgreementTerminated}
            handleUpdateField={handleUpdateField}
            handlePetPolicyChange={handlePetPolicyChange}
            translateType={translateType}
            isSaving={isSaving}
            t={t}
          />

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
              </div>
            </section>
          )}

          <ListingDetailsAvailabilitySection
            listing={listing}
            availability={availability}
            isNavView={isNavView}
            canOwnerEditListingDetail={canOwnerEditListingDetail}
            showGalleryFormidlet={showGalleryFormidlet}
            kommuneCanEdit={kommuneCanEdit}
            ownerAgreementTerminated={ownerAgreementTerminated}
            currentUser={currentUser}
            mediationReservation={mediationReservation}
            mediation={mediation}
            pendingDeletePeriod={pendingDeletePeriod}
            setPendingDeletePeriod={setPendingDeletePeriod}
            calendarMonth={calendarMonth}
            setCalendarMonth={setCalendarMonth}
            getStatusForDate={getStatusForDate}
            formidletStart={formidletStart}
            formidletEnd={formidletEnd}
            handleRemovePeriod={handleRemovePeriod}
            t={t}
          />

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

          <ListingDetailsOwnerHouseRules listing={listing} hasHouseRulesPdf={hasHouseRulesPdf} houseRulesPublicUrl={houseRulesPublicUrl} canOwnerEditListingDetail={canOwnerEditListingDetail} showGalleryFormidlet={showGalleryFormidlet} isOwner={isOwner} isNavView={isNavView} houseRulesBusy={houseRulesBusy} onHouseRulesFileChange={handleHouseRulesFileChange} onHouseRulesRemove={handleHouseRulesRemove} t={t} />

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
            onRequireSignTerms={() => {
              requireActiveAgreement(hasActiveAgreement, (listing?.city || '').trim(), `/listings/${id}`, {
                silent: true,
              })
            }}
            t={t}
          />

          <ListingDetailsHandoverSection
            id={id}
            listing={listing}
            availability={availability}
            isNavView={isNavView}
            ownerAgreementTerminated={ownerAgreementTerminated}
            handoverReports={handoverReports}
            filteredHandoverReports={filteredHandoverReports}
            reportTimeFilter={reportTimeFilter}
            setReportTimeFilter={setReportTimeFilter}
            reportTimeFilterOpen={reportTimeFilterOpen}
            setReportTimeFilterOpen={setReportTimeFilterOpen}
            showHandoverForm={showHandoverForm}
            setShowHandoverForm={setShowHandoverForm}
            expandedReportId={expandedReportId}
            setExpandedReportId={setExpandedReportId}
            refetchHandoverReports={refetchHandoverReports}
            handleApproveReport={handleApproveReport}
            setRequestChangeReport={setRequestChangeReport}
            setRequestChangeComment={setRequestChangeComment}
            tenantReportToken={tenantReportToken}
            tenantLinkRegenerating={tenantLinkRegenerating}
            handleRegenerateTenantLink={handleRegenerateTenantLink}
            copyFeedback={copyFeedback}
            setCopyFeedback={setCopyFeedback}
            t={t}
          />

          <ListingDetailsOwnerGallery
            listing={listing}
            allImages={allImages}
            canOwnerEditListingDetail={canOwnerEditListingDetail}
            showGalleryFormidlet={showGalleryFormidlet}
            currentImageIndex={currentImageIndex}
            setCurrentImageIndex={setCurrentImageIndex}
            isFullscreen={isFullscreen}
            setIsFullscreen={setIsFullscreen}
            uploading={uploading}
            isSaving={isSaving}
            onUploadMore={handleUploadMore}
            onReorderImage={handleReorderListingImage}
            t={t}
          />
          <ListingDetailsOwnerAdminLink isNavView={isNavView} isOwner={isOwner} />
          <ListingDetailsOwnerEditableStyles />

        </div>

        {isNavView ? (
          <ListingDetailsNavStickySidebar
            listing={listing}
            availability={availability}
            kommuneCanEdit={kommuneCanEdit}
            ownerAgreementTerminated={ownerAgreementTerminated}
            mediation={mediation}
            t={t}
          />
        ) : null}

      </div>

          <ListingDetailsHandoverModals
            handoverReports={handoverReports}
            expandedReportId={expandedReportId}
            setExpandedReportId={setExpandedReportId}
            requestChangeReport={requestChangeReport}
            setRequestChangeReport={setRequestChangeReport}
            requestChangeComment={requestChangeComment}
            setRequestChangeComment={setRequestChangeComment}
            requestChangeSending={requestChangeSending}
            handleRequestChangeSubmit={handleRequestChangeSubmit}
            t={t}
          />

    </main>
  )
}
