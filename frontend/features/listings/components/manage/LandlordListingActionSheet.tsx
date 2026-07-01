'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Clock, Compass, Edit3, FileText, Sparkles, Trash2 } from 'lucide-react'
import BottomSheet from '@/app/components/BottomSheet'
import { publicContactInfoFormPdfUrl } from '@/app/lib/storagePublicUrl'
import { listingAvailabilityStatusToday } from '@/app/lib/listingAvailabilityStatusToday'
import { useLanguage } from '@/context/LanguageContext'

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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {todayStatus === 'Formidla' && (
          <>
            <a
              href={publicContactInfoFormPdfUrl()}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="button"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: 'var(--space-3) var(--space-4)',
                fontSize: '0.9rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                textDecoration: 'none',
                boxSizing: 'border-box',
              }}
              onClick={onClose}
            >
              <FileText size={16} /> {t('contactInfoForm')}
            </a>
            <Link
              href={`/report/utleier/${listing.id}`}
              className="button"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: 'var(--space-3) var(--space-4)',
                fontSize: '0.9rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                textDecoration: 'none',
                background: 'var(--color-teal)',
                color: 'white',
                border: 'none',
                boxSizing: 'border-box',
              }}
              onClick={onClose}
            >
              <FileText size={16} /> {t('fillHandoverReport')}
            </Link>
          </>
        )}
        {todayStatus !== 'Formidla' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {isTodayAvailableOrUnset(listing) ? (
              <button
                type="button"
                onClick={() => {
                  onOpenPeriodCalendar(listing.id, 'Utilgjengelig')
                  onClose()
                }}
                className="button"
                style={{
                  padding: 'var(--space-3) var(--space-4)',
                  fontSize: '0.9rem',
                  borderRadius: '8px',
                  width: '100%',
                  background: 'rgba(239, 68, 68, 0.12)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  cursor: 'pointer',
                }}
              >
                {t('manageRentalNav')}
              </button>
            ) : todayStatus === 'Utilgjengelig' ? (
              <button
                type="button"
                onClick={() => {
                  onOpenPeriodCalendar(listing.id, 'Tilgjengelig')
                  onClose()
                }}
                className="button"
                style={{
                  padding: 'var(--space-3) var(--space-4)',
                  fontSize: '0.9rem',
                  borderRadius: '8px',
                  width: '100%',
                  background: 'rgba(32, 187, 175, 0.12)',
                  color: 'var(--color-teal)',
                  border: '1px solid rgba(32, 187, 175, 0.25)',
                  cursor: 'pointer',
                }}
              >
                {t('markAvailable')}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onOpenPeriodCalendar(listing.id, 'Utilgjengelig')
                    onClose()
                  }}
                  className="button"
                  style={{
                    padding: 'var(--space-3) var(--space-4)',
                    fontSize: '0.9rem',
                    borderRadius: '8px',
                    width: '100%',
                    background: 'rgba(239, 68, 68, 0.12)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    cursor: 'pointer',
                  }}
                >
                  {t('manageRentalNav')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onOpenPeriodCalendar(listing.id, 'Tilgjengelig')
                    onClose()
                  }}
                  className="button"
                  style={{
                    padding: 'var(--space-3) var(--space-4)',
                    fontSize: '0.9rem',
                    borderRadius: '8px',
                    width: '100%',
                    background: 'rgba(32, 187, 175, 0.12)',
                    color: 'var(--color-teal)',
                    border: '1px solid rgba(32, 187, 175, 0.25)',
                    cursor: 'pointer',
                  }}
                >
                  {t('markAvailable')}
                </button>
              </>
            )}
          </div>
        )}
        {todayStatus !== 'Formidla' && (centralEvents || tourism) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {centralEvents ? (
              <button
                type="button"
                className="button button-secondary"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: 'var(--space-3) var(--space-4)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
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
                className="button button-secondary"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: 'var(--space-3) var(--space-4)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
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
              className="button button-secondary"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: 'var(--space-3) var(--space-4)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
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
              className="button button-secondary"
              style={{
                width: '100%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-3) var(--space-4)',
              }}
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
              className="button"
              style={{
                width: '100%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-3) var(--space-4)',
                background: 'rgba(239, 68, 68, 0.08)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.25)',
              }}
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
            className="button button-secondary"
            style={{
              width: '100%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-3) var(--space-4)',
            }}
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
