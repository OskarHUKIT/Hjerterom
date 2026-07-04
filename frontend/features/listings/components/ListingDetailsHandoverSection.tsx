'use client'

import type { Dispatch, SetStateAction } from 'react'
import dynamic from 'next/dynamic'
import { FileText, ChevronDown, RefreshCw, CheckCircle2, Clipboard } from 'lucide-react'
import { formatDateNo } from '@/app/lib/dateFormat'
import { listingHasFormidlaPeriod } from '@/features/listings/lib/listingDetailsUtils'
import type { TranslationKey } from '@/lib/translations'

const HandoverReport = dynamic(() => import('@/app/components/HandoverReport'), { ssr: false })

const FILTER_LABELS = {
  all: 'Alle',
  '7d': 'Siste 7 dager',
  '30d': 'Siste 30 dager',
} as const

export type ListingDetailsHandoverSectionProps = {
  id: string
  listing: any
  availability: any[]
  isNavView: boolean
  ownerAgreementTerminated: boolean
  handoverReports: any[]
  filteredHandoverReports: any[]
  reportTimeFilter: 'all' | '7d' | '30d'
  setReportTimeFilter: (v: 'all' | '7d' | '30d') => void
  reportTimeFilterOpen: boolean
  setReportTimeFilterOpen: Dispatch<SetStateAction<boolean>>
  showHandoverForm: boolean
  setShowHandoverForm: (v: boolean) => void
  expandedReportId: string | null
  setExpandedReportId: (id: string | null) => void
  refetchHandoverReports: () => void
  handleApproveReport: (reportId: string) => Promise<void>
  setRequestChangeReport: (r: any) => void
  setRequestChangeComment: (s: string) => void
  tenantReportToken: string | null
  tenantLinkRegenerating: boolean
  handleRegenerateTenantLink: () => Promise<void>
  copyFeedback: boolean
  setCopyFeedback: (v: boolean) => void
  t: (key: any) => string
}

function reportSummary(report: any, t: (key: any) => string) {
  const body =
    report.content?.tenant_comment ||
    report.content?.condition_description ||
    report.content?.general_condition ||
    'Rapport'
  const bodyStr = body.toString()
  return (
    <>
      {report.reporter_type === 'homeowner' ? t('landlord') : t('tenant')}
      {report.content?.pdf_url
        ? ' – PDF lastet opp'
        : ` – ${bodyStr.slice(0, 60)}${bodyStr.length > 60 ? '…' : ''}`}
      {report.content?.photo_urls?.length
        ? ` · ${report.content.photo_urls.length} bilder vedlagt`
        : ''}
    </>
  )
}

export default function ListingDetailsHandoverSection(props: ListingDetailsHandoverSectionProps) {
  const {
    id,
    listing,
    availability,
    isNavView,
    ownerAgreementTerminated,
    handoverReports,
    filteredHandoverReports,
    reportTimeFilter,
    setReportTimeFilter,
    reportTimeFilterOpen,
    setReportTimeFilterOpen,
    showHandoverForm,
    setShowHandoverForm,
    expandedReportId,
    setExpandedReportId,
    refetchHandoverReports,
    handleApproveReport,
    setRequestChangeReport,
    setRequestChangeComment,
    tenantReportToken,
    tenantLinkRegenerating,
    handleRegenerateTenantLink,
    copyFeedback,
    setCopyFeedback,
    t,
  } = props

  const isFormidlet =
    listing?.status === 'Formidla' || listingHasFormidlaPeriod(availability)
  const showTenantLink = isNavView && isFormidlet && !ownerAgreementTerminated

  return (
    <section
      id="overtakelsesrapport"
      className="card no-hover listing-detail-card listing-handover-section"
    >
      <div className="listing-handover-header">
        <h3 className="listing-handover-title">
          <FileText size={20} /> {t('handoverReports')}
        </h3>
        <div className="listing-handover-toolbar">
          {handoverReports.length > 0 && (
            <div className="listing-handover-filter">
              <button
                type="button"
                onClick={() => setReportTimeFilterOpen((prev) => !prev)}
                className="listing-handover-filter-btn"
              >
                <span>{FILTER_LABELS[reportTimeFilter]}</span>
                <ChevronDown
                  size={16}
                  className={`listing-handover-filter-chevron${
                    reportTimeFilterOpen ? ' listing-handover-filter-chevron--open' : ''
                  }`}
                />
              </button>
              {reportTimeFilterOpen && (
                <>
                  <div
                    className="listing-handover-filter-backdrop"
                    onClick={() => setReportTimeFilterOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="listing-handover-filter-menu">
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
                      >
                        {FILTER_LABELS[value]}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          {!isNavView && !showHandoverForm && (
            <button
              type="button"
              onClick={() => setShowHandoverForm(true)}
              className="button listing-handover-btn-compact"
            >
              Ny rapport
            </button>
          )}
        </div>
      </div>

      {showHandoverForm ? (
        <div className="listing-handover-form-wrap">
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
            type="button"
            onClick={() => setShowHandoverForm(false)}
            className="listing-handover-cancel-btn"
          >
            {t('cancel')}
          </button>
        </div>
      ) : null}

      <div className="listing-handover-list">
        {filteredHandoverReports.length > 0 ? (
          filteredHandoverReports.map((report) => {
            const status = report.approval_status || 'pending'
            const isPending = status === 'pending'
            const previewText = (
              report.content?.tenant_comment ||
              report.content?.condition_description ||
              ''
            ).toString()

            return (
              <div key={report.id} className="listing-handover-item">
                <div className="listing-handover-item-header">
                  <div className="listing-handover-item-body">
                    <div className="listing-handover-item-title">
                      {reportSummary(report, t)}
                    </div>
                    <div className="listing-handover-item-meta">
                      {formatDateNo(report.created_at)}
                      {report.reporter_type !== 'tenant' && status !== 'pending' && (
                        <span
                          className={`listing-handover-status-badge listing-handover-status-badge--${
                            status === 'approved' ? 'approved' : 'rejected'
                          }`}
                        >
                          {status === 'approved' ? 'Godkjent' : 'Ikke godkjent'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="listing-handover-item-actions">
                    {report.content?.pdf_url && (
                      <a
                        href={report.content.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="button listing-handover-btn-xs"
                      >
                        Se PDF
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setExpandedReportId(report.id)}
                      className="listing-handover-view-btn"
                    >
                      Se rapport
                    </button>
                  </div>
                </div>

                {(report.content?.tenant_comment || report.content?.condition_description) &&
                  expandedReportId !== report.id && (
                    <div className="listing-handover-preview">
                      {previewText.slice(0, 120)}
                      {previewText.length > 120 ? '…' : ''}
                    </div>
                  )}

                {isNavView && isPending && report.reporter_type !== 'tenant' && (
                  <div className="listing-handover-approval-row">
                    <button
                      type="button"
                      onClick={() => handleApproveReport(report.id)}
                      className="button listing-handover-btn-nav"
                    >
                      Godkjenn
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRequestChangeReport(report)
                        setRequestChangeComment('')
                      }}
                      className="button listing-handover-btn-warning"
                    >
                      Be om endring
                    </button>
                  </div>
                )}
              </div>
            )
          })
        ) : (
          <p className="text-sm italic listing-handover-empty">
            Ingen overtakelsesrapporter er registrert ennå.
          </p>
        )}
      </div>

      {showTenantLink && (
        <div className="listing-handover-tenant-link">
          <p className="listing-handover-tenant-link-text">
            <strong>{t('linkForTenant')}</strong> {t('linkForTenantDesc')}
          </p>
          {tenantReportToken ? (
            <div>
              <div className="listing-handover-tenant-link-row">
                <code className="listing-code">
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
                  className="button listing-handover-btn-nowrap"
                >
                  {copyFeedback ? <CheckCircle2 size={14} /> : <Clipboard size={14} />}
                  {copyFeedback ? ' Kopiert!' : ' Kopier'}
                </button>
                <button
                  type="button"
                  onClick={handleRegenerateTenantLink}
                  disabled={tenantLinkRegenerating}
                  className="button button-secondary listing-handover-btn-nowrap"
                  title={t('listingRegenerateLinkTitle')}
                >
                  {tenantLinkRegenerating ? (
                    <RefreshCw size={14} className="listing-handover-spin" />
                  ) : (
                    <RefreshCw size={14} />
                  )}
                  {tenantLinkRegenerating
                    ? ` ${t('listingRegenerating')}`
                    : ` ${t('listingNewLink')}`}
                </button>
              </div>
              <p className="listing-handover-tenant-hint">
                Bruk «Ny lenke» hvis leietaker sier at lenken er ugyldig – send deretter den nye
                lenken.
              </p>
            </div>
          ) : (
            <p className="listing-handover-tenant-pending">{t('linkGeneratedWhenFormidlet')}</p>
          )}
        </div>
      )}
    </section>
  )
}
