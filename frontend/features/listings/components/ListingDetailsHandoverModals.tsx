'use client'

import { ArrowLeft, Send } from 'lucide-react'
import { OptimizedPublicStorageImage } from '@/app/components/OptimizedPublicStorageImage'
import { formatDateNo } from '@/app/lib/dateFormat'
import type { TranslationKey } from '@/lib/translations'

export type ListingDetailsHandoverModalsProps = {
  handoverReports: any[]
  expandedReportId: string | null
  setExpandedReportId: (id: string | null) => void
  requestChangeReport: any
  setRequestChangeReport: (r: any) => void
  requestChangeComment: string
  setRequestChangeComment: (s: string) => void
  requestChangeSending: boolean
  handleRequestChangeSubmit: () => Promise<void>
  t: (key: any) => string
}

export default function ListingDetailsHandoverModals(props: ListingDetailsHandoverModalsProps) {
  const {
    handoverReports,
    expandedReportId,
    setExpandedReportId,
    requestChangeReport,
    setRequestChangeReport,
    requestChangeComment,
    setRequestChangeComment,
    requestChangeSending,
    handleRequestChangeSubmit,
    t,
  } = props

  const expandedReport = handoverReports.find((r: any) => r.id === expandedReportId)
  const expandedStatus = expandedReport?.approval_status || 'pending'

  return (
    <>
      {expandedReport && (
        <div
          className="report-fullscreen-overlay"
          onClick={() => setExpandedReportId(null)}
        >
          <div className="report-fullscreen-panel" onClick={(e) => e.stopPropagation()}>
            <div className="report-fullscreen-header">
              <h3 className="report-fullscreen-title">
                {expandedReport.reporter_type === 'homeowner' ? t('landlord') : t('tenant')}
                {expandedReport.content?.photo_urls?.length
                  ? ` · ${expandedReport.content.photo_urls.length} bilder vedlagt`
                  : ''}
              </h3>
              <button
                type="button"
                onClick={() => setExpandedReportId(null)}
                className="report-fullscreen-back-btn"
              >
                <ArrowLeft size={18} /> {t('close')}
              </button>
            </div>
            <div className="report-fullscreen-body">
              <div className="report-fullscreen-meta">
                {formatDateNo(expandedReport.created_at)}
                {expandedReport.reporter_type !== 'tenant' && expandedStatus !== 'pending' && (
                  <span
                    className={`listing-handover-status-badge listing-handover-status-badge--${
                      expandedStatus === 'approved' ? 'approved' : 'rejected'
                    }`}
                  >
                    {expandedStatus === 'approved' ? 'Godkjent' : 'Ikke godkjent'}
                  </span>
                )}
              </div>
              <div className="report-fullscreen-fields">
                {expandedReport.content?.address && (
                  <p className="report-fullscreen-field">
                    <strong>Adresse:</strong> {expandedReport.content.address}
                  </p>
                )}
                {expandedReport.content?.agreement_period && (
                  <p className="report-fullscreen-field">
                    <strong>Avtaleperiode:</strong> {expandedReport.content.agreement_period}
                  </p>
                )}
                {expandedReport.content?.inventory && (
                  <p className="report-fullscreen-field">
                    <strong>Inventar:</strong> {expandedReport.content.inventory}
                  </p>
                )}
                {expandedReport.content?.keys && (
                  <p className="report-fullscreen-field">
                    <strong>Nøkler:</strong> {expandedReport.content.keys}
                  </p>
                )}
                {(expandedReport.content?.tenant_comment ||
                  expandedReport.content?.condition_description) && (
                  <p className="report-fullscreen-field">
                    <strong>
                      {expandedReport.reporter_type === 'tenant'
                        ? t('tenantHandoverCommentLabel')
                        : t('conditionDescription')}
                    </strong>{' '}
                    {expandedReport.content.tenant_comment ||
                      expandedReport.content.condition_description}
                  </p>
                )}
                {expandedReport.request_change_comment && (
                  <p className="report-fullscreen-kommune-note">
                    <strong>{t('commentFromKommune')}</strong>{' '}
                    {expandedReport.request_change_comment}
                  </p>
                )}
              </div>
              {expandedReport.content?.photo_urls?.length ? (
                <div className="report-fullscreen-photos">
                  {expandedReport.content.photo_urls.map((url: string, i: number) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="report-fullscreen-photo-link"
                    >
                      <OptimizedPublicStorageImage
                        variant="fill"
                        src={url}
                        alt={`Overtakelsesrapport, bilde ${i + 1}`}
                        sizes="(max-width: 768px) 45vw, 200px"
                        className="report-fullscreen-photo-img"
                      />
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {requestChangeReport && (
        <div
          className="listing-handover-modal-backdrop"
          onClick={() => !requestChangeSending && setRequestChangeReport(null)}
        >
          <div className="listing-handover-modal" onClick={(e) => e.stopPropagation()}>
            <h4 className="listing-handover-modal-title">
              Be om endring i overtakelsesrapport
            </h4>
            <p className="listing-handover-modal-body">
              Skriv en kommentar som sendes til utleier. De får melding og kan sende inn en ny
              rapport.
            </p>
            <textarea
              value={requestChangeComment}
              onChange={(e) => setRequestChangeComment(e.target.value)}
              placeholder={t('listingRequestChangePlaceholder')}
              rows={4}
              className="input listing-handover-modal-textarea"
            />
            <div className="listing-handover-modal-actions">
              <button
                type="button"
                onClick={() => setRequestChangeReport(null)}
                disabled={requestChangeSending}
                className="listing-handover-modal-cancel"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleRequestChangeSubmit}
                disabled={requestChangeSending}
                className="button listing-handover-modal-submit"
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
    </>
  )
}
