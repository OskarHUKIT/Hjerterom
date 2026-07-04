'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Clock, Compass, Edit3, FileText, Sparkles, Trash2 } from 'lucide-react'
import BottomSheet from '@/app/components/BottomSheet'
import { publicContactInfoFormPdfUrl } from '@/app/lib/storagePublicUrl'
import { listingAvailabilityStatusToday } from '@/app/lib/listingAvailabilityStatusToday'
import { useLanguage } from '@/context/LanguageContext'
import '@/features/listings/landlord-manage.css'

type ManagePanel = 'calendar' | 'events' | 'tourism'

type LandlordListingActionSheetProps = {
  listing: {
    id: string
    address: string
  }
  open: boolean
  availability: Record<string, any[]>
  centralEvents: boolean
  tourism: boolean
  isTodayAvailableOrUnset: (listing: { id: string }) => boolean
  onClose: () => void
  onOpenPeriodCalendar: (listingId: string, status: 'Tilgjengelig' | 'Utilgjengelig') => void
  onOpenListingPanel: (listingId: string, panel: ManagePanel) => void
  onPendingDeleteListing: (listing: { id: string; address: string }) => void
}

function AvailabilityToggleButtons({
  listing,
  todayStatus,
  isTodayAvailableOrUnset,
  onOpenPeriodCalendar,
  onClose,
  t,
}: {
  listing: { id: string }
  todayStatus: string
  isTodayAvailableOrUnset: (listing: { id: string }) => boolean
  onOpenPeriodCalendar: (listingId: string, status: 'Tilgjengelig' | 'Utilgjengelig') => void
  onClose: () => void
  t: (key: string) => string
}) {
  const open = (status: 'Tilgjengelig' | 'Utilgjengelig') => {
    onOpenPeriodCalendar(listing.id, status)
    onClose()
  }

  if (isTodayAvailableOrUnset(listing)) {
    return (
      <button
        type="button"
        onClick={() => open('Utilgjengelig')}
        className="button hm-btn-unavailable hm-btn-unavailable--sheet"
      >
        {t('manageRentalNav')}
      </button>
    )
  }

  if (todayStatus === 'Utilgjengelig') {
    return (
      <button
        type="button"
        onClick={() => open('Tilgjengelig')}
        className="button hm-btn-available hm-btn-available--sheet"
      >
        {t('markAvailable')}
      </button>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => open('Utilgjengelig')}
        className="button hm-btn-unavailable hm-btn-unavailable--sheet"
      >
        {t('manageRentalNav')}
      </button>
      <button
        type="button"
        onClick={() => open('Tilgjengelig')}
        className="button hm-btn-available hm-btn-available--sheet"
      >
        {t('markAvailable')}
      </button>
    </>
  )
}

export default function LandlordListingActionSheet({
  listing,
  open,
  availability,
  centralEvents,
  tourism,
  isTodayAvailableOrUnset,
  onClose,
  onOpenPeriodCalendar,
  onOpenListingPanel,
  onPendingDeleteListing,
}: LandlordListingActionSheetProps) {
  const { t } = useLanguage()
  const router = useRouter()
  const todayStatus = listingAvailabilityStatusToday(listing.id, availability)

  return (
    <BottomSheet
      open={open}
      title={String(listing.address ?? '—')}
      titleId="hm-listing-actions-sheet"
      closeLabel={t('close')}
      onClose={onClose}
      zIndex={2200}
    >
      <div className="hm-sheet-stack">
        {todayStatus === 'Formidla' && (
          <>
            <a
              href={publicContactInfoFormPdfUrl()}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="button hm-sheet-btn"
              onClick={onClose}
            >
              <FileText size={16} /> {t('contactInfoForm')}
            </a>
            <Link
              href={`/report/utleier/${listing.id}`}
              className="button hm-sheet-btn hm-sheet-btn--teal"
              onClick={onClose}
            >
              <FileText size={16} /> {t('fillHandoverReport')}
            </Link>
          </>
        )}

        {todayStatus !== 'Formidla' && (
          <div className="hm-sheet-group">
            <AvailabilityToggleButtons
              listing={listing}
              todayStatus={todayStatus}
              isTodayAvailableOrUnset={isTodayAvailableOrUnset}
              onOpenPeriodCalendar={onOpenPeriodCalendar}
              onClose={onClose}
              t={t}
            />
          </div>
        )}

        {todayStatus !== 'Formidla' && (centralEvents || tourism) && (
          <div className="hm-sheet-group">
            {centralEvents ? (
              <button
                type="button"
                className="button button-secondary hm-sheet-btn"
                onClick={() => {
                  onOpenListingPanel(listing.id, 'events')
                  onClose()
                }}
              >
                <Sparkles size={18} aria-hidden />
                {t('managePanelEvents')}
              </button>
            ) : null}
            {tourism ? (
              <button
                type="button"
                className="button button-secondary hm-sheet-btn"
                onClick={() => {
                  onOpenListingPanel(listing.id, 'tourism')
                  onClose()
                }}
              >
                <Compass size={18} aria-hidden />
                {t('managePanelTourism')}
              </button>
            ) : null}
            <button
              type="button"
              className="button button-secondary hm-sheet-btn"
              onClick={() => {
                onOpenListingPanel(listing.id, 'calendar')
                onClose()
              }}
            >
              <Clock size={18} aria-hidden />
              {t('managePanelCalendar')}
            </button>
          </div>
        )}

        {todayStatus !== 'Formidla' && (
          <>
            <button
              type="button"
              className="button button-secondary hm-sheet-btn"
              onClick={() => {
                router.push(`/listings/${listing.id}?view=owner`)
                onClose()
              }}
            >
              <Edit3 size={18} aria-hidden />
              {t('editListing')}
            </button>
            <button
              type="button"
              className="button hm-sheet-btn hm-sheet-btn--danger"
              onClick={() => {
                onPendingDeleteListing({ id: listing.id, address: listing.address })
                onClose()
              }}
            >
              <Trash2 size={18} aria-hidden />
              {t('delete')}
            </button>
          </>
        )}

        {todayStatus === 'Formidla' && (
          <button
            type="button"
            className="button button-secondary hm-sheet-btn"
            onClick={() => {
              router.push(`/listings/${listing.id}?view=owner`)
              onClose()
            }}
          >
            <Edit3 size={18} aria-hidden />
            {t('viewListing')}
          </button>
        )}
      </div>
    </BottomSheet>
  )
}
