'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Edit3, FileText, MessageSquare, Trash2 } from 'lucide-react'
import BottomSheet from '@/app/components/BottomSheet'
import { publicContactInfoFormPdfUrl } from '@/app/lib/storagePublicUrl'
import { listingAvailabilityStatusToday } from '@/app/lib/listingAvailabilityStatusToday'
import { useLanguage } from '@/context/LanguageContext'
import '@/features/listings/landlord-manage.css'

type LandlordListingActionSheetProps = {
  listing: {
    id: string
    address: string
  }
  open: boolean
  availability: Record<string, any[]>
  onClose: () => void
  onPendingDeleteListing: (listing: { id: string; address: string }) => void
}

export default function LandlordListingActionSheet({
  listing,
  open,
  availability,
  onClose,
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
              <FileText size={16} aria-hidden /> {t('contactInfoForm')}
            </a>
            <Link
              href={`/report/utleier/${listing.id}`}
              className="button hm-sheet-btn hm-sheet-btn--teal"
              onClick={onClose}
            >
              <FileText size={16} aria-hidden /> {t('fillHandoverReport')}
            </Link>
          </>
        )}

        <Link href={hubHref} className="button hm-sheet-btn hm-sheet-btn--primary" onClick={onClose}>
          {t('manageOpenListing')}
        </Link>

        <button
          type="button"
          className="button button-secondary hm-sheet-btn"
          onClick={() => {
            router.push('/nav/messages')
            onClose()
          }}
        >
          <MessageSquare size={18} aria-hidden />
          {t('messagesToKommuneShort')}
        </button>

        <button
          type="button"
          className="button button-secondary hm-sheet-btn"
          onClick={() => {
            router.push(`/listings/${listing.id}?view=owner`)
            onClose()
          }}
        >
          <Edit3 size={18} aria-hidden />
          {todayStatus === 'Formidla' ? t('viewListing') : t('editListing')}
        </button>

        {todayStatus !== 'Formidla' ? (
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
        ) : null}
      </div>
    </BottomSheet>
  )
}
