'use client'

import { useLanguage } from '@/context/LanguageContext'
import '@/features/listings/landlord-manage.css'

type PendingDeleteListing = {
  id: string
  address: string
}

type PendingDeletePeriod = {
  id: string
  listingId: string
}

type ConfirmDeleteDialogProps = {
  pendingDeleteListing: PendingDeleteListing | null
  onCancelListing: () => void
  onConfirmListing: () => void
  pendingDeletePeriod: PendingDeletePeriod | null
  onCancelPeriod: () => void
  onConfirmPeriod: () => void
}

export default function ConfirmDeleteDialog({
  pendingDeleteListing,
  onCancelListing,
  onConfirmListing,
  pendingDeletePeriod,
  onCancelPeriod,
  onConfirmPeriod,
}: ConfirmDeleteDialogProps) {
  const { t } = useLanguage()

  return (
    <>
      {pendingDeleteListing && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-delete-listing-title"
          className="hm-confirm-backdrop hm-confirm-backdrop--listing"
          onClick={onCancelListing}
        >
          <div className="card hm-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p id="confirm-delete-listing-title" className="hm-confirm-body">
              {t('confirmDeleteListing').replace('{address}', pendingDeleteListing.address)}
            </p>
            <div className="hm-confirm-actions">
              <button type="button" className="button hm-confirm-cancel" onClick={onCancelListing}>
                {t('cancel')}
              </button>
              <button
                type="button"
                className="button hm-confirm-danger"
                onClick={() => void onConfirmListing()}
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
          className="hm-confirm-backdrop hm-confirm-backdrop--period"
          onClick={onCancelPeriod}
        >
          <div
            className="card hm-confirm-dialog hm-confirm-dialog--narrow"
            onClick={(e) => e.stopPropagation()}
          >
            <p id="confirm-remove-title" className="hm-confirm-body">
              {t('confirmRemovePeriod')}
            </p>
            <div className="hm-confirm-actions">
              <button type="button" className="button hm-confirm-cancel" onClick={onCancelPeriod}>
                {t('cancel')}
              </button>
              <button type="button" className="button hm-confirm-danger" onClick={onConfirmPeriod}>
                {t('remove')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
