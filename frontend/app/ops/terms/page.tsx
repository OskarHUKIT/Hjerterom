'use client'

import { useCallback, useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { useLanguage } from '../../../context/LanguageContext'
import OpsGdprBanner from '../components/OpsGdprBanner'
import LoadingPlaceholder from '../../components/LoadingPlaceholder'
import { Button, buttonClassName } from '../../components/ui/Button'
import BottomSheet from '../../components/BottomSheet'
import { opsApproveTerms, opsListPendingTerms, type OpsTermsItem } from '../../lib/opsApi'
import { publicDocumentsFileUrl } from '../../lib/storagePublicUrl'
import { formatDateTimeNo } from '../../lib/dateFormat'

export default function OpsTermsPage() {
  const { t } = useLanguage()
  const [items, setItems] = useState<OpsTermsItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmDoc, setConfirmDoc] = useState<OpsTermsItem | null>(null)
  const [note, setNote] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await opsListPendingTerms(null, 50, 0)
      setItems(res.items)
      setTotal(res.total)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const pdfUrl = (row: OpsTermsItem) => {
    if (!row.pdf_storage_path) return ''
    return publicDocumentsFileUrl(row.pdf_storage_path)
  }

  const handleApprove = async (approved: boolean) => {
    if (!confirmDoc) return
    setBusyId(confirmDoc.id)
    setMessage(null)
    try {
      await opsApproveTerms(confirmDoc.id, approved, note.trim() || null)
      setMessage(approved ? t('opsTermsApprovedOk') : t('opsTermsRejectedOk'))
      setConfirmDoc(null)
      setNote('')
      await load()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t('pageLoadStuck'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <h1 className="ops-page-title">{t('opsNavTerms')}</h1>
      <p className="ops-page-lead">{t('opsTermsLead')}</p>
      <OpsGdprBanner />

      {message ? (
        <p style={{ marginBottom: 'var(--space-4)', color: 'var(--color-accent)' }}>{message}</p>
      ) : null}

      {loading ? (
        <LoadingPlaceholder minHeight={200} />
      ) : total === 0 ? (
        <div className="card" style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
          <p>{t('opsTermsQueueEmpty')}</p>
        </div>
      ) : (
        <div className="ops-card-list">
          {items.map((row) => (
            <article key={row.id} className="card ops-list-card">
              <div className="ops-list-card-head">
                <div>
                  <h2 className="ops-list-card-title">{row.title || t('opsUntitledDoc')}</h2>
                  <p className="ops-meta">
                    v{row.version} · {row.kommune_region || t('opsGlobalRegion')} ·{' '}
                    {row.created_at ? formatDateTimeNo(row.created_at) : '—'}
                  </p>
                  {row.created_by_name ? (
                    <p className="ops-meta">{t('opsUploadedBy').replace('{name}', row.created_by_name)}</p>
                  ) : null}
                </div>
              </div>
              <div className="ops-actions-row">
                {pdfUrl(row) ? (
                  <a
                    href={pdfUrl(row)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonClassName('secondary')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0.65rem 1rem' }}
                  >
                    <ExternalLink size={16} /> {t('opsViewPdf')}
                  </a>
                ) : null}
                <Button
                  variant="primary"
                  disabled={busyId === row.id}
                  onClick={() => {
                    setConfirmDoc(row)
                    setNote('')
                  }}
                >
                  {t('opsReviewDoc')}
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <BottomSheet
        open={!!confirmDoc}
        onClose={() => !busyId && setConfirmDoc(null)}
        title={confirmDoc?.title || t('opsReviewDoc')}
        closeLabel={t('close')}
      >
        <p style={{ marginTop: 0, color: 'var(--text-body)', lineHeight: 1.5 }}>{t('opsTermsApproveConfirm')}</p>
        <label style={{ display: 'grid', gap: 8, marginBottom: 'var(--space-4)' }}>
          <span>{t('opsNoteOptional')}</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            style={{
              width: '100%',
              padding: '0.65rem',
              borderRadius: 10,
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-app)',
              color: 'var(--text-main)',
            }}
          />
        </label>
        <div className="ops-actions-row">
          <Button variant="primary" disabled={!!busyId} onClick={() => void handleApprove(true)}>
            {t('opsApprove')}
          </Button>
          <Button variant="secondary" disabled={!!busyId} onClick={() => void handleApprove(false)}>
            {t('opsReject')}
          </Button>
        </div>
      </BottomSheet>
    </div>
  )
}
