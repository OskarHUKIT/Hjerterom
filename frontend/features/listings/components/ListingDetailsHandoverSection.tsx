'use client'

import type { Dispatch, SetStateAction } from 'react'
import dynamic from 'next/dynamic'
import { FileText, ChevronDown, RefreshCw, CheckCircle2, Clipboard } from 'lucide-react'
import { formatDateNo } from '@/app/lib/dateFormat'
import { listingHasFormidlaPeriod } from '@/features/listings/lib/listingDetailsUtils'
import type { TranslationKey } from '@/lib/translations'

const HandoverReport = dynamic(() => import('@/app/components/HandoverReport'), { ssr: false })

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

export default function ListingDetailsHandoverSection(props: ListingDetailsHandoverSectionProps) {
  const { id, listing, availability, isNavView, ownerAgreementTerminated, handoverReports, filteredHandoverReports, reportTimeFilter, setReportTimeFilter, reportTimeFilterOpen, setReportTimeFilterOpen, showHandoverForm, setShowHandoverForm, expandedReportId, setExpandedReportId, refetchHandoverReports, handleApproveReport, setRequestChangeReport, setRequestChangeComment, tenantReportToken, tenantLinkRegenerating, handleRegenerateTenantLink, copyFeedback, setCopyFeedback, t } = props
  return (
    <>
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
    </>
  )
}
