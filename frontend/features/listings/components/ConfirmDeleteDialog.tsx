'use client'

import { useLanguage } from '@/context/LanguageContext'

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
          onClick={onCancelListing}
        >
          <div
            className="card"
            style={{
              maxWidth: 440,
              padding: 'var(--space-6)',
              boxShadow: 'var(--shadow-lg, 0 10px 40px rgba(0,0,0,0.2))',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p
              id="confirm-delete-listing-title"
              style={{ margin: '0 0 var(--space-4)', fontSize: '1rem', lineHeight: 1.5 }}
            >
              {t('confirmDeleteListing').replace('{address}', pendingDeleteListing.address)}
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="button"
                style={{ background: 'var(--bg-app)', border: '1px solid var(--border-subtle)' }}
                onClick={onCancelListing}
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                className="button"
                style={{ background: '#dc2626', color: 'white', border: 'none' }}
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
          onClick={onCancelPeriod}
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
            <p id="confirm-remove-title" style={{ margin: '0 0 var(--space-4)', fontSize: '1rem' }}>
              {t('confirmRemovePeriod')}
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="button"
                style={{ background: 'var(--bg-app)', border: '1px solid var(--border-subtle)' }}
                onClick={onCancelPeriod}
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                className="button"
                style={{ background: '#dc2626', color: 'white', border: 'none' }}
                onClick={onConfirmPeriod}
              >
                {t('remove')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
