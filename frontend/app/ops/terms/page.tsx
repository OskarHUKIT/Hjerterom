'use client'

import { useCallback, useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { useLanguage } from '../../../context/LanguageContext'
import OpsGdprBanner from '../components/OpsGdprBanner'
import OpsPageHeader from '../components/OpsPageHeader'
import OpsPanel from '../components/OpsPanel'
import OpsBadge from '../components/OpsBadge'
import OpsAlert from '../components/OpsAlert'
import OpsEmptyState from '../components/OpsEmptyState'
import OpsActionMenu from '../components/OpsActionMenu'
import { OpsTableSkeleton } from '../components/OpsSkeleton'
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
  const [messageTone, setMessageTone] = useState<'success' | 'error'>('success')

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
      setMessageTone('success')
      setMessage(approved ? t('opsTermsApprovedOk') : t('opsTermsRejectedOk'))
      setConfirmDoc(null)
      setNote('')
      await load()
    } catch (e) {
      setMessageTone('error')
      setMessage(e instanceof Error ? e.message : t('pageLoadStuck'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="ops-stack ops-stack--lg">
      <OpsPageHeader title={t('opsNavTerms')} lead={t('opsTermsLead')} />
      <OpsGdprBanner />

      {message ? <OpsAlert tone={messageTone}>{message}</OpsAlert> : null}

      {loading ? (
        <OpsTableSkeleton rows={4} cols={3} />
      ) : total === 0 ? (
        <OpsEmptyState title={t('opsTermsQueueEmpty')} />
      ) : (
        <div className="ops-card-list">
          {items.map((row) => (
            <OpsPanel key={row.id} padding="md">
              <div className="ops-list-card-head">
                <div>
                  <h2 className="ops-list-card-title">{row.title || t('opsUntitledDoc')}</h2>
                  <p className="ops-meta">
                    v{row.version} · {row.kommune_region || t('opsGlobalRegion')} ·{' '}
                    {row.scope ? `${t('opsTermsScope')}: ${row.scope}` : t('agreementScopeKommune')} ·{' '}
                    {row.created_at ? formatDateTimeNo(row.created_at) : '—'}
                  </p>
                  {row.created_by_name ? (
                    <p className="ops-meta">{t('opsUploadedBy').replace('{name}', row.created_by_name)}</p>
                  ) : null}
                </div>
                <OpsBadge tone="warning">{t('opsPending')}</OpsBadge>
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
                <OpsActionMenu
                  label={t('opsTableActions')}
                  items={[
                    {
                      id: 'review',
                      label: t('opsReviewDoc'),
                      onSelect: () => {
                        setConfirmDoc(row)
                        setNote('')
                      },
                    },
                    ...(pdfUrl(row)
                      ? [
                          {
                            id: 'pdf',
                            label: t('opsViewPdf'),
                            onSelect: () => window.open(pdfUrl(row), '_blank', 'noopener,noreferrer'),
                          },
                        ]
                      : []),
                  ]}
                />
              </div>
            </OpsPanel>
          ))}
        </div>
      )}

      <BottomSheet
        open={!!confirmDoc}
        onClose={() => !busyId && setConfirmDoc(null)}
        title={confirmDoc?.title || t('opsReviewDoc')}
        closeLabel={t('close')}
      >
        <p className="ops-panel-desc">{t('opsTermsApproveConfirm')}</p>
        <label className="ops-field" style={{ marginBottom: 'var(--space-4)' }}>
          <span>{t('opsNoteOptional')}</span>
          <textarea className="ops-input" value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
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
