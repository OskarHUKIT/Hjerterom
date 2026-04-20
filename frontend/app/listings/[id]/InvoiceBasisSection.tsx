'use client'

import React, { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { FileText, Download, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { TranslationKey } from '../../../lib/translations'
import { formatDateNo } from '../../lib/dateFormat'
import { pdf } from '@react-pdf/renderer'
import { InvoiceBasisDocument } from '../../lib/pdf/InvoiceBasisDocument'
import { buildInvoiceBasisPdfPayload } from '../../lib/pdf/invoiceBasisPayload'
import { logError } from '@/app/lib/appLogger'

type TFn = (key: TranslationKey) => string

type FormidlaRow = { id: string; start_date: string; end_date: string }

type BasisRow = {
  listing_id: string
  listing_availability_id?: string | null
  account_number: string | null
  amount_nok: number | null
  signature_confirmed_at?: string | null
}

function formatListingAddressLine(a: {
  listingAddress?: string | null
  listingCity?: string | null
  listingPostalCode?: string | null
}): string {
  const addr = (a.listingAddress ?? '').trim()
  const pc = a.listingPostalCode?.toString().trim() ?? ''
  const city = (a.listingCity ?? '').trim()
  const line2 = [pc, city].filter(Boolean).join(' ').trim()
  return [addr, line2].filter(Boolean).join('\n')
}

function periodLabel(p: FormidlaRow) {
  return `${formatDateNo(p.start_date)} – ${formatDateNo(p.end_date)}`
}

/** Sammenlign kontonummer uavhengig av mellomrom og punktum (f.eks. 1234 56 78901 vs 1234.56.78901). */
function normalizeAccountNumberInput(s: string): string {
  return s.replace(/\D/g, '')
}

/** Supabase/PostgREST-feil er ofte plain objects, ikke Error – unngår «[object Object]» i UI */
function formatErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message
  if (e !== null && typeof e === 'object') {
    const o = e as { message?: unknown; details?: unknown; hint?: unknown }
    if (typeof o.message === 'string' && o.message) return o.message
    if (typeof o.details === 'string' && o.details) return o.details
    if (typeof o.hint === 'string' && o.hint) return o.hint
  }
  try {
    return JSON.stringify(e)
  } catch {
    return String(e)
  }
}

/** Nedlasting via <a download> etter async fetch – må være i DOM (Safari/Chrome). */
function triggerPdfDownload(blob: Blob, filename: string) {
  const blobUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = filename
  a.rel = 'noopener'
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 5000)
}

export default function InvoiceBasisSection(props: {
  listingId: string
  paymentMethod: string | null | undefined
  listingAddress?: string | null
  listingCity?: string | null
  listingPostalCode?: string | null
  ownerName?: string | null
  isOwner: boolean
  isNavView: boolean
  hasActiveAgreement: boolean
  /** Utleierens avtale avsluttet – ingen nye utbetalinger/fakturagrunnlag-handlinger fra kommune */
  ownerAgreementTerminated?: boolean
  onRequireSignTerms: () => void
  t: TFn
}) {
  const {
    listingId,
    paymentMethod,
    listingAddress,
    listingCity,
    listingPostalCode,
    ownerName,
    isOwner,
    isNavView,
    hasActiveAgreement,
    ownerAgreementTerminated,
    onRequireSignTerms,
    t,
  } = props
  const isKonto = paymentMethod === 'konto'
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [formidlaPeriods, setFormidlaPeriods] = useState<FormidlaRow[]>([])
  const [mediationPeriodId, setMediationPeriodId] = useState('')
  const [form, setForm] = useState({
    account_number: '',
    amount_nok: '',
  })
  const [accountNumberRepeat, setAccountNumberRepeat] = useState('')
  const [confirmAccountCorrect, setConfirmAccountCorrect] = useState(false)
  const [confirmSign, setConfirmSign] = useState(false)
  const [loadedSignatureAt, setLoadedSignatureAt] = useState<string | null>(null)
  const [saveFeedback, setSaveFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const load = useCallback(async () => {
    if (!isKonto || (!isOwner && !isNavView)) return
    setLoading(true)
    try {
      const [availRes, basisRes] = await Promise.all([
        supabase
          .from('listing_availability')
          .select('id, start_date, end_date, status')
          .eq('listing_id', listingId)
          .eq('status', 'Formidla')
          .order('start_date', { ascending: false }),
        supabase
          .from('listing_invoice_basis')
          .select('*')
          .eq('listing_id', listingId)
          .maybeSingle(),
      ])
      if (availRes.error) throw availRes.error
      if (basisRes.error) throw basisRes.error

      const periods = (
        (availRes.data || []) as {
          id: string
          start_date: string
          end_date: string
          status: string
        }[]
      )
        .filter((p) => p.status === 'Formidla')
        .map(({ id, start_date, end_date }) => ({ id, start_date, end_date }))
      setFormidlaPeriods(periods)

      const row = basisRes.data as BasisRow | null
      if (row) {
        const sigAt = row.signature_confirmed_at ?? null
        setLoadedSignatureAt(sigAt)
        setConfirmSign(!!sigAt)
        setForm({
          account_number: row.account_number ?? '',
          amount_nok: row.amount_nok != null ? String(row.amount_nok) : '',
        })
        setAccountNumberRepeat('')
        setConfirmAccountCorrect(false)
        const saved = row.listing_availability_id?.trim() ?? ''
        if (saved && periods.some((p) => p.id === saved)) {
          setMediationPeriodId(saved)
        } else if (periods.length === 1) {
          setMediationPeriodId(periods[0].id)
        } else {
          setMediationPeriodId('')
        }
      } else {
        setLoadedSignatureAt(null)
        setConfirmSign(false)
        setAccountNumberRepeat('')
        setConfirmAccountCorrect(false)
        setMediationPeriodId(periods.length === 1 ? periods[0].id : '')
      }
    } catch (e) {
      logError(e)
    } finally {
      setLoading(false)
    }
  }, [isKonto, isOwner, isNavView, listingId])

  useEffect(() => {
    void load()
  }, [load])

  if (!isKonto || (!isOwner && !isNavView)) return null

  const buildPayload = () => {
    const amountParsed =
      form.amount_nok.trim() === '' ? null : parseFloat(form.amount_nok.replace(',', '.'))
    return {
      listing_id: listingId,
      listing_availability_id: mediationPeriodId.trim() || null,
      creditor_name: null,
      organization_number: null,
      kid_reference: null,
      period_description: null,
      notes: null,
      account_number: form.account_number.trim() || null,
      amount_nok: amountParsed != null && !Number.isNaN(amountParsed) ? amountParsed : null,
      signature_confirmed_at: confirmSign ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }
  }

  const handleSave = async () => {
    if (!isOwner || isNavView) return
    if (!hasActiveAgreement) {
      onRequireSignTerms()
      return
    }
    if (formidlaPeriods.length >= 1 && !mediationPeriodId.trim()) {
      setSaveFeedback({ type: 'error', message: t('invoiceMediationPeriodRequired') })
      return
    }
    const accNorm = normalizeAccountNumberInput(form.account_number)
    if (accNorm.length > 0) {
      if (normalizeAccountNumberInput(accountNumberRepeat) !== accNorm) {
        setSaveFeedback({ type: 'error', message: t('invoiceAccountMismatch') })
        return
      }
      if (!confirmAccountCorrect) {
        setSaveFeedback({ type: 'error', message: t('invoiceAccountConfirmRequired') })
        return
      }
    }
    setSaveFeedback(null)
    setSaving(true)
    try {
      const { error } = await supabase
        .from('listing_invoice_basis')
        .upsert(buildPayload(), { onConflict: 'listing_id' })
      if (error) throw error
      setSaveFeedback({ type: 'success', message: t('invoiceBasisSaved') })
      await load()
    } catch (e: unknown) {
      setSaveFeedback({ type: 'error', message: t('errorPrefix') + formatErrorMessage(e) })
    } finally {
      setSaving(false)
    }
  }

  const downloadPdf = async () => {
    if (isOwner && !isNavView && !hasActiveAgreement) {
      alert(t('signAgreementToEdit'))
      onRequireSignTerms()
      return
    }

    setPdfLoading(true)
    try {
      const { data: listing, error: listErr } = await supabase
        .from('listings')
        .select('address, city, postal_code, owner_name')
        .eq('id', listingId)
        .maybeSingle()

      if (listErr || !listing) {
        throw new Error(listErr?.message ?? 'Fant ikke boligen')
      }

      const { data: basis, error: basisErr } = await supabase
        .from('listing_invoice_basis')
        .select('signature_confirmed_at, account_number, amount_nok, listing_availability_id')
        .eq('listing_id', listingId)
        .maybeSingle()

      if (basisErr) throw basisErr

      const b = basis as {
        signature_confirmed_at?: string | null
        account_number?: string | null
        amount_nok?: number | null
        listing_availability_id?: string | null
      } | null

      let agreementStart: string | null = null
      let agreementEnd: string | null = null
      if (b?.listing_availability_id) {
        const { data: av } = await supabase
          .from('listing_availability')
          .select('start_date, end_date, status')
          .eq('id', b.listing_availability_id)
          .maybeSingle()
        const row = av as { start_date: string; end_date: string; status: string } | null
        if (row && row.status === 'Formidla') {
          agreementStart = row.start_date
          agreementEnd = row.end_date
        }
      }

      const payload = buildInvoiceBasisPdfPayload({
        address: listing.address,
        postalCode: (listing as { postal_code?: string | null }).postal_code,
        city: listing.city,
        ownerName: listing.owner_name,
        agreementStart,
        agreementEnd,
        amountNok: b?.amount_nok != null ? Number(b.amount_nok) : null,
        accountNumber: b?.account_number ?? null,
        signatureConfirmedAt: b?.signature_confirmed_at ?? null,
      })

      const blob = await pdf(
        React.createElement(InvoiceBasisDocument, { data: payload }) as React.ReactElement
      ).toBlob()
      if (blob.size === 0) throw new Error('Tom PDF')

      const safe = `fakturagrunnlag-${listingId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 8)}.pdf`
      triggerPdfDownload(blob, safe)
    } catch (e: unknown) {
      alert(t('invoicePdfError') + ': ' + formatErrorMessage(e))
    } finally {
      setPdfLoading(false)
    }
  }

  const spinStyle: CSSProperties = {
    animation: 'app-spin 0.9s linear infinite',
    display: 'inline-block',
  }

  const selectedPeriod = formidlaPeriods.find((p) => p.id === mediationPeriodId)

  if (loading) {
    return (
      <section
        id="fakturagrunnlag"
        className="card no-hover listing-detail-card invoice-basis-section"
        style={{ padding: 'var(--space-8)', scrollMarginTop: '88px' }}
      >
        <style jsx global>{`
          @keyframes app-spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
        <p
          style={{
            margin: 0,
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Loader2 size={18} style={spinStyle} /> {t('loadingPleaseWait')}
        </p>
      </section>
    )
  }

  return (
    <section
      id="fakturagrunnlag"
      className="card no-hover listing-detail-card invoice-basis-section"
      style={{ padding: 'var(--space-8)', scrollMarginTop: '88px' }}
    >
      <style jsx global>{`
        @keyframes app-spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
      <h3
        style={{
          margin: '0 0 var(--space-4)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          color: 'var(--text-main)',
        }}
      >
        <FileText size={20} style={{ color: 'var(--color-accent)' }} /> {t('invoiceBasisTitle')}
      </h3>
      <p
        style={{
          margin: '0 0 var(--space-4)',
          color: 'var(--text-body)',
          fontSize: '0.95rem',
          lineHeight: 1.6,
        }}
      >
        {t('invoiceBasisDesc')}
      </p>

      {isNavView && (
        <p
          style={{ margin: '0 0 var(--space-4)', fontSize: '0.85rem', color: 'var(--text-muted)' }}
        >
          {t('invoiceBasisKommuneHint')}
        </p>
      )}
      {isNavView && ownerAgreementTerminated && (
        <p
          style={{
            margin: '0 0 var(--space-4)',
            fontSize: '0.9rem',
            color: 'var(--text-body)',
            lineHeight: 1.55,
          }}
        >
          {t('expiredOwnerNoMediationNav')}
        </p>
      )}

      <div
        style={{
          marginBottom: 'var(--space-4)',
          padding: 'var(--space-4)',
          borderRadius: 8,
          border: '1px solid var(--border-subtle)',
          background: 'var(--bg-card)',
        }}
      >
        <div style={{ marginBottom: 14 }}>
          <span className="label" style={{ display: 'block', marginBottom: 4 }}>
            {t('invoiceListingAddressLabel')}
          </span>
          <p
            style={{
              margin: 0,
              whiteSpace: 'pre-line',
              fontWeight: 600,
              color: 'var(--text-main)',
            }}
          >
            {formatListingAddressLine({ listingAddress, listingCity, listingPostalCode }) || '—'}
          </p>
          <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {t('invoiceAutoFromListing')}
          </p>
        </div>
        <div style={{ marginBottom: selectedPeriod ? 14 : 0 }}>
          <span className="label" style={{ display: 'block', marginBottom: 4 }}>
            {t('invoiceListingOwnerLabel')}
          </span>
          <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-main)' }}>
            {(ownerName ?? '').trim() || '—'}
          </p>
        </div>
        {selectedPeriod ? (
          <div>
            <span className="label" style={{ display: 'block', marginBottom: 4 }}>
              {t('invoiceMediationPeriod')}
            </span>
            <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-main)' }}>
              {periodLabel(selectedPeriod)}
            </p>
            <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {t('invoiceMediationPeriodHint')}
            </p>
          </div>
        ) : null}
      </div>

      <div style={{ display: 'grid', gap: 'var(--space-4)', maxWidth: 520 }}>
        <div>
          <label className="label">{t('invoiceMediationPeriod')}</label>
          {isOwner && !isNavView ? (
            formidlaPeriods.length === 0 ? (
              <p style={{ margin: '8px 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                {t('invoiceNoFormidlaPeriodYet')}
              </p>
            ) : (
              <select
                className="input"
                value={mediationPeriodId}
                onChange={(e) => setMediationPeriodId(e.target.value)}
                style={{ width: '100%', marginTop: 4 }}
              >
                <option value="">{t('invoiceSelectMediationPeriod')}</option>
                {formidlaPeriods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {periodLabel(p)}
                  </option>
                ))}
              </select>
            )
          ) : (
            <p style={{ margin: '8px 0 0', fontWeight: 600, color: 'var(--text-main)' }}>
              {selectedPeriod
                ? periodLabel(selectedPeriod)
                : formidlaPeriods.length === 0
                  ? '—'
                  : t('invoiceSelectMediationPeriod')}
            </p>
          )}
          <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {t('invoiceMediationPeriodHint')}
          </p>
        </div>

        <div>
          <label className="label">{t('invoiceAccount')}</label>
          <input
            className="input"
            value={form.account_number}
            onChange={(e) => {
              const v = e.target.value
              setForm((f) => ({ ...f, account_number: v }))
              setConfirmAccountCorrect(false)
            }}
            disabled={!isOwner || isNavView}
            autoComplete="off"
            style={{ width: '100%', marginTop: 4 }}
          />
          {isOwner && !isNavView ? (
            <>
              <label className="label" style={{ marginTop: 'var(--space-3)' }}>
                {t('invoiceAccountRepeat')}
              </label>
              <input
                className="input"
                value={accountNumberRepeat}
                onChange={(e) => setAccountNumberRepeat(e.target.value)}
                autoComplete="off"
                style={{ width: '100%', marginTop: 4 }}
              />
              <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {t('invoiceAccountDoubleEntryHint')}
              </p>
            </>
          ) : null}
        </div>
        <div>
          <label className="label">{t('invoiceAmount')}</label>
          <input
            className="input"
            type="text"
            inputMode="decimal"
            value={form.amount_nok}
            onChange={(e) => setForm((f) => ({ ...f, amount_nok: e.target.value }))}
            disabled={!isOwner || isNavView}
            style={{ width: '100%', marginTop: 4 }}
          />
        </div>
      </div>

      {isOwner && !isNavView && (
        <div style={{ marginTop: 'var(--space-4)', maxWidth: 520, display: 'grid', gap: 14 }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              cursor: 'pointer',
              fontSize: '0.92rem',
              lineHeight: 1.55,
              color: 'var(--text-body)',
            }}
          >
            <input
              type="checkbox"
              checked={confirmAccountCorrect}
              onChange={(e) => setConfirmAccountCorrect(e.target.checked)}
              style={{ marginTop: 3, flexShrink: 0 }}
            />
            <span>{t('invoiceAccountCorrectConfirmLabel')}</span>
          </label>
          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              cursor: 'pointer',
              fontSize: '0.92rem',
              lineHeight: 1.55,
              color: 'var(--text-body)',
            }}
          >
            <input
              type="checkbox"
              checked={confirmSign}
              onChange={(e) => setConfirmSign(e.target.checked)}
              style={{ marginTop: 3, flexShrink: 0 }}
            />
            <span>{t('invoiceSignatureConfirmLabel')}</span>
          </label>
          {confirmSign && loadedSignatureAt ? (
            <p style={{ margin: '10px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {t('invoiceSignatureConfirmedAt').replace('{date}', formatDateNo(loadedSignatureAt))}
            </p>
          ) : null}
        </div>
      )}

      {saveFeedback ? (
        <div
          role={saveFeedback.type === 'error' ? 'alert' : 'status'}
          style={{
            marginTop: 'var(--space-4)',
            maxWidth: 520,
            padding: 'var(--space-3)',
            borderRadius: 8,
            border: `1px solid ${saveFeedback.type === 'success' ? '#15803d' : '#b91c1c'}`,
            background:
              saveFeedback.type === 'success'
                ? 'rgba(21, 128, 61, 0.09)'
                : 'rgba(185, 28, 28, 0.08)',
            color: 'var(--text-main)',
            fontSize: '0.95rem',
          }}
        >
          {saveFeedback.message}
        </div>
      ) : null}

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--space-3)',
          marginTop: 'var(--space-6)',
        }}
      >
        {isOwner && !isNavView && (
          <button
            type="button"
            className="button"
            onClick={() => void handleSave()}
            disabled={saving}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            {saving ? <Loader2 size={18} style={spinStyle} /> : <FileText size={18} />}
            {saving ? t('invoiceSaving') : t('invoiceSave')}
          </button>
        )}
        {(isOwner || isNavView) && (
          <button
            type="button"
            className="button"
            onClick={() => void downloadPdf()}
            disabled={pdfLoading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--color-teal)',
              color: 'white',
              border: 'none',
            }}
          >
            {pdfLoading ? <Loader2 size={18} /> : <Download size={18} />}
            {pdfLoading ? t('invoicePdfPreparing') : t('invoiceDownloadPdf')}
          </button>
        )}
      </div>
    </section>
  )
}
