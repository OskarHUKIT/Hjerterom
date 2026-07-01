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
  const { handoverReports, expandedReportId, setExpandedReportId, requestChangeReport, setRequestChangeReport, requestChangeComment, setRequestChangeComment, requestChangeSending, handleRequestChangeSubmit, t } = props
  return (
    <>
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
    </>
  )
}
