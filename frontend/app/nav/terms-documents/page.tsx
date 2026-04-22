'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, FileText, Plus, ExternalLink, Info, Check } from 'lucide-react'
import { supabase, getAuthUserDeduped } from '../../lib/supabase'
import { useLanguage } from '../../../context/LanguageContext'
import { formatDateTimeNo } from '../../lib/dateFormat'
import {
  parseKommuneRegions,
  parseTermsRegionField,
  termsRegionVisibleToUser,
  kommuneRegionForTermsDocument,
} from '../../lib/kommuneRegions'
import { isKommuneAdminRole } from '../../lib/kommuneRoles'
import LoadingPlaceholder from '../../components/LoadingPlaceholder'
import { devWarn } from '@/app/lib/appLogger'

const PDF_MAX_BYTES = 12 * 1024 * 1024

/** Standard PDF i Storage (samme som sign-agreement-fallback). */
const DEFAULT_TERMS_STORAGE_PATH = 'VilkarsavtaleBoligbanken.pdf'

function regionPathSegment(region: string): string {
  const t = region.trim()
  if (!t) return 'global'
  const s = t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return s || 'global'
}

function displayRegionList(regionsLower: string[]): string {
  if (regionsLower.length === 0) return ''
  return regionsLower
    .map((r) =>
      r
        .split(/[\s-]+/)
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ')
    )
    .join(', ')
}

type TermsRow = {
  id: string
  title: string
  body: string | null
  version: number
  kommune_region: string | null
  effective_from: string | null
  created_at: string | null
  pdf_bucket: string | null
  pdf_storage_path: string | null
  approved_for_utleier_signing: boolean | null
}

type ListRow = { kind: 'storage_default' } | { kind: 'db'; row: TermsRow }

type ApprovalFilter = 'all' | 'pending' | 'approved'

export default function TermsDocumentsPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [kommuneCanEdit, setKommuneCanEdit] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [myRegions, setMyRegions] = useState<string[]>([])
  const [rows, setRows] = useState<TermsRow[]>([])
  const [region, setRegion] = useState('')
  /** For kommune_admin: which assigned areas this PDF applies to (multi-select when len > 1). */
  const [adminSelectedRegions, setAdminSelectedRegions] = useState<string[]>([])
  const [title, setTitle] = useState('Vilkår for bruk av Boly')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [approvalFilter, setApprovalFilter] = useState<ApprovalFilter>('all')

  const isAdmin = isKommuneAdminRole(userRole)

  useEffect(() => {
    ;(async () => {
      const user = await getAuthUserDeduped()
      if (!user) {
        router.push('/login')
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, kommune_can_edit, kommune_region')
        .eq('id', user.id)
        .maybeSingle()
      const role = user.user_metadata?.role || profile?.role
      if (!isKommuneAdminRole(role)) {
        setAuthorized(false)
        setLoading(false)
        return
      }
      setAuthorized(true)
      setUserRole(profile?.role || role || null)
      setKommuneCanEdit(role === 'kommune_admin' || profile?.kommune_can_edit !== false)

      let regionRaw: string | string[] | null = profile?.kommune_region ?? null
      if ((regionRaw == null || String(regionRaw).trim() === '') && user.email) {
        const rpcRes = await supabase.rpc('get_whitelist_region_for_email', { p_email: user.email })
        const fromRpc =
          typeof rpcRes.data === 'string'
            ? rpcRes.data
            : Array.isArray(rpcRes.data) && rpcRes.data?.length
              ? rpcRes.data[0]
              : null
        if (fromRpc && String(fromRpc).trim()) regionRaw = fromRpc
        else {
          const tableRes = await supabase
            .from('kommune_access_list')
            .select('region')
            .ilike('email', user.email)
            .eq('is_active', true)
            .limit(1)
          const fromTable = tableRes.data?.[0]?.region
          if (fromTable && String(fromTable).trim()) regionRaw = fromTable
        }
      }
      const parsed = parseKommuneRegions(regionRaw)
      setMyRegions(parsed)
      setLoading(false)
    })()
  }, [router])

  useEffect(() => {
    if (!isKommuneAdminRole(userRole)) return
    if (myRegions.length === 1) {
      setAdminSelectedRegions([myRegions[0]])
    } else if (myRegions.length > 1) {
      setAdminSelectedRegions((prev) => {
        if (prev.length === 0) return [...myRegions]
        const kept = prev.filter((p) => myRegions.includes(p))
        return kept.length > 0 ? kept : [...myRegions]
      })
    } else {
      setAdminSelectedRegions([])
    }
  }, [userRole, myRegions])

  const fetchRows = async () => {
    const { data, error: err } = await supabase
      .from('terms_documents')
      .select(
        'id, title, body, version, kommune_region, effective_from, created_at, pdf_bucket, pdf_storage_path, approved_for_utleier_signing'
      )
      .order('kommune_region', { ascending: true, nullsFirst: false })
      .order('version', { ascending: false })
    if (err) {
      setError(err.message)
      return
    }
    setRows((data as TermsRow[]) || [])
  }

  useEffect(() => {
    if (authorized) fetchRows()
  }, [authorized])

  const defaultStoragePdfUrl = useMemo(() => {
    const { data } = supabase.storage.from('documents').getPublicUrl(DEFAULT_TERMS_STORAGE_PATH)
    return data.publicUrl
  }, [])

  const visibleDbRows = useMemo(() => {
    return rows.filter((r) => {
      const kr = r.kommune_region
      if (kr == null || !String(kr).trim()) return true
      const docRegs = parseTermsRegionField(kr)
      return termsRegionVisibleToUser(docRegs, myRegions)
    })
  }, [rows, myRegions])

  const pendingDbCount = useMemo(
     
    () => visibleDbRows.filter((r) => r.approved_for_utleier_signing !== true).length,
    [visibleDbRows]
  )
  const approvedDbCount = visibleDbRows.length - pendingDbCount

  const filteredDbRows = useMemo(() => {
    if (approvalFilter === 'pending') {
      return visibleDbRows.filter((r) => r.approved_for_utleier_signing !== true)
    }
    if (approvalFilter === 'approved') {
      return visibleDbRows.filter((r) => r.approved_for_utleier_signing === true)
    }
    return visibleDbRows
  }, [visibleDbRows, approvalFilter])

  /** The storage-default row is always relevant context and stays visible across filters. */
  const listRows: ListRow[] = useMemo(() => {
    const out: ListRow[] = [{ kind: 'storage_default' }]
    for (const row of filteredDbRows) {
      out.push({ kind: 'db', row })
    }
    return out
  }, [filteredDbRows])

  const publicPdfUrl = (row: TermsRow) => {
    const bucket = row.pdf_bucket || 'documents'
    const path = row.pdf_storage_path
    if (!path) return null
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  }

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!kommuneCanEdit || !title.trim() || !pdfFile) return
    if (isAdmin) {
      if (adminSelectedRegions.length === 0) {
        setError(t('termsAdminRegionRequired'))
        return
      }
      const invalid = adminSelectedRegions.some((r) => !myRegions.includes(r))
      if (myRegions.length > 0 && invalid) {
        setError(t('termsAdminRegionInvalid'))
        return
      }
    }
    if (pdfFile.type !== 'application/pdf') {
      setError(t('termsPdfInvalidType'))
      return
    }
    if (pdfFile.size > PDF_MAX_BYTES) {
      setError(t('termsPdfTooLarge'))
      return
    }
    setSaving(true)
    setError(null)
    const kommuneRegion = isAdmin
      ? kommuneRegionForTermsDocument(adminSelectedRegions)
      : region.trim() || null
    let maxQ = supabase
      .from('terms_documents')
      .select('version')
      .order('version', { ascending: false })
      .limit(1)
    if (kommuneRegion) maxQ = maxQ.eq('kommune_region', kommuneRegion)
    else maxQ = maxQ.is('kommune_region', null)
    const { data: maxRow } = await maxQ.maybeSingle()
    const nextVersion = (maxRow?.version ?? 0) + 1
    const segPathSource = isAdmin
      ? adminSelectedRegions.length > 1
        ? [...adminSelectedRegions].sort((a, b) => a.localeCompare(b, 'nb')).join('-')
        : adminSelectedRegions[0] || ''
      : region || ''
    const seg = regionPathSegment(segPathSource)
    const path = `terms/${seg}/v${nextVersion}_${crypto.randomUUID()}.pdf`

    const { error: upErr } = await supabase.storage.from('documents').upload(path, pdfFile, {
      contentType: 'application/pdf',
      upsert: false,
    })
    if (upErr) {
      setSaving(false)
      setError(upErr.message)
      return
    }

    const { data: inserted, error: insErr } = await supabase
      .from('terms_documents')
      .insert({
        title: title.trim(),
        pdf_storage_path: path,
        pdf_bucket: 'documents',
        version: nextVersion,
        kommune_region: kommuneRegion,
      })
      .select('id')
      .maybeSingle()
    if (insErr) {
      await supabase.storage.from('documents').remove([path])
      setSaving(false)
      setError(insErr.message)
      return
    }
    if (inserted?.id) {
      const { error: notifyErr } = await supabase.functions.invoke('notify-terms-central-review', {
        body: { terms_document_id: inserted.id },
      })
      if (notifyErr) {
        devWarn('notify-terms-central-review:', notifyErr.message)
      }
    }
    setSaving(false)
    setPdfFile(null)
    fetchRows()
  }

  if (loading || authorized === null) {
    return (
      <main className="container">
        <LoadingPlaceholder minHeight={320} />
      </main>
    )
  }

  if (!authorized) {
    return (
      <main className="container">
        <p>{t('noAccessDesc')}</p>
        <Link href="/">{t('goHome')}</Link>
      </main>
    )
  }

  const desc = isAdmin ? t('termsDocumentsDescAdmin') : t('termsDocumentsDesc')

  return (
    <main className="container" style={{ maxWidth: 900 }}>
      <Link
        href="/nav/database"
        className="nav-link"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 16 }}
      >
        <ArrowLeft size={18} /> {t('back')}
      </Link>
      <h1 style={{ fontSize: '2rem', marginBottom: 8 }}>{t('termsDocumentsTitle')}</h1>
      <p style={{ color: 'var(--text-body)', marginBottom: 12, lineHeight: 1.5 }}>{desc}</p>
      <p
        className="text-sm"
        style={{ color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.5 }}
      >
        {t('termsCentralWorkflowNote')}
      </p>

      {!kommuneCanEdit ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {t('formidlingManagedByCaseworker')}
        </p>
      ) : (
        <form
          className="card"
          style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-6)' }}
          onSubmit={handlePublish}
        >
          <h2
            style={{
              fontSize: '1.1rem',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Plus size={20} /> {t('termsUploadNewVersionHeading')}
          </h2>
          {error && <p style={{ color: '#f87171', marginBottom: 12 }}>{error}</p>}
          {isAdmin && myRegions.length === 0 && (
            <p style={{ color: '#fbbf24', marginBottom: 12, fontSize: '0.95rem' }}>
              {t('termsAdminNoRegions')}
            </p>
          )}
          {isAdmin ? (
            <>
              <div className="label">{t('termsRegionLabelAdmin')}</div>
              {myRegions.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-muted)', marginBottom: 12 }}>
                  —
                </p>
              ) : myRegions.length === 1 ? (
                <p className="input" style={{ marginBottom: 12, background: 'var(--bg-app)' }}>
                  {displayRegionList(myRegions)}
                </p>
              ) : (
                <div style={{ marginBottom: 12 }}>
                  <p
                    className="text-sm"
                    style={{ color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.45 }}
                  >
                    {t('termsRegionMultiHint')}
                  </p>
                  <fieldset
                    style={{
                      border: 'none',
                      padding: 0,
                      margin: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                  >
                    {myRegions.map((r, ri) => (
                      <label
                        key={r}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          cursor: 'pointer',
                          fontSize: '0.95rem',
                        }}
                      >
                        <input
                          id={`terms-doc-region-${ri}`}
                          name={`terms_region_choice_${ri}`}
                          type="checkbox"
                          checked={adminSelectedRegions.includes(r)}
                          onChange={() => {
                            setAdminSelectedRegions((prev) =>
                              prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
                            )
                          }}
                        />
                        <span>{displayRegionList([r])}</span>
                      </label>
                    ))}
                  </fieldset>
                </div>
              )}
            </>
          ) : (
            <>
              <label className="label" htmlFor="terms-doc-region">
                {t('termsRegionLabel')}
              </label>
              <input
                id="terms-doc-region"
                name="terms_region"
                className="input"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder={t('regionPlaceholder')}
                autoComplete="off"
                style={{ marginBottom: 12 }}
              />
            </>
          )}
          <label className="label" htmlFor="terms-doc-title">
            {t('termsTitleLabel')}
          </label>
          <input
            id="terms-doc-title"
            name="terms_title"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoComplete="off"
            style={{ marginBottom: 12 }}
          />
          <label className="label" htmlFor="terms-doc-pdf">
            {t('termsPdfLabel')}
          </label>
          <p className="text-sm" style={{ color: 'var(--text-muted)', marginBottom: 8 }}>
            {t('termsPdfHint')}
          </p>
          <input
            id="terms-doc-pdf"
            name="terms_pdf"
            type="file"
            accept="application/pdf"
            className="input"
            style={{ marginBottom: 16, padding: '8px 0' }}
            onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="submit"
            className="button"
            disabled={
              saving ||
              !pdfFile ||
              (isAdmin && (myRegions.length === 0 || adminSelectedRegions.length === 0))
            }
          >
            <FileText size={18} />{' '}
            {saving ? t('termsPublishing') : t('termsSubmitForCentralReview')}
          </button>
        </form>
      )}

      <h2 style={{ fontSize: '1.15rem', marginBottom: 12 }}>{t('termsListHeading')}</h2>
      <p
        className="text-sm"
        style={{ color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}
      >
        <Info size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
        {t('termsSigningPriorityHint')}
      </p>
      {pendingDbCount > 0 && (
        <div
          role="status"
          style={{
            padding: 'var(--space-3) var(--space-4)',
            marginBottom: 'var(--space-4)',
            background: '#fffbeb',
            border: '1px solid #fcd34d',
            borderRadius: 12,
            color: '#78350f',
            lineHeight: 1.5,
            fontWeight: 600,
          }}
        >
          {pendingDbCount === 1
            ? t('termsOverviewPendingBannerOne')
            : t('termsOverviewPendingBannerMany').replace('{count}', String(pendingDbCount))}
        </div>
      )}
      <div
        role="tablist"
        aria-label={t('termsListHeading')}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 16,
        }}
      >
        {(
          [
            { id: 'all' as ApprovalFilter, label: t('termsOverviewFilterAll'), count: visibleDbRows.length },
            { id: 'pending' as ApprovalFilter, label: t('termsOverviewFilterPending'), count: pendingDbCount },
            { id: 'approved' as ApprovalFilter, label: t('termsOverviewFilterApproved'), count: approvedDbCount },
          ]
        ).map((tab) => {
          const active = approvalFilter === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setApprovalFilter(tab.id)}
              className="button"
              style={{
                padding: '6px 14px',
                fontSize: '0.9rem',
                background: active ? 'var(--brand-primary)' : 'var(--bg-app)',
                color: active ? 'var(--text-on-brand, #fff)' : 'var(--text-body)',
                border: active ? '1px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
                borderRadius: 999,
              }}
            >
              {tab.label} · {tab.count}
            </button>
          )
        })}
      </div>
      {approvalFilter !== 'all' && filteredDbRows.length === 0 && (
        <p
          className="text-sm"
          style={{
            color: 'var(--text-muted)',
            marginBottom: 12,
            fontStyle: 'italic',
          }}
        >
          {t('termsOverviewEmptyFiltered')}
        </p>
      )}
      {listRows.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>{t('termsEmpty')}</p>
      ) : (
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {listRows.map((item) => {
            if (item.kind === 'storage_default') {
              return (
                <li key="storage-default" className="card" style={{ padding: 'var(--space-4)' }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>
                    {t('termsDefaultStorageTitle')}
                  </div>
                  <div className="text-sm" style={{ color: 'var(--text-muted)', marginBottom: 8 }}>
                    {t('termsScopeGlobal')}
                  </div>
                  <p
                    className="text-sm"
                    style={{ color: 'var(--text-body)', marginBottom: 12, lineHeight: 1.5 }}
                  >
                    {t('termsSigningInfoStorageDefault')}
                  </p>
                  <a
                    href={defaultStoragePdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="nav-link"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <ExternalLink size={16} /> {t('termsOpenPdf')}
                  </a>
                </li>
              )
            }
            const r = item.row
            const pdfUrl = publicPdfUrl(r)
            const globalDb = !r.kommune_region || !String(r.kommune_region).trim()
            const docRegs = parseTermsRegionField(r.kommune_region)
            const scopeLabel = globalDb
              ? t('termsScopeGlobal')
              : t('termsScopeMunicipalities').replace('{areas}', displayRegionList(docRegs))

            let signingInfo = ''
            if (globalDb) {
              signingInfo = t('termsSigningInfoGlobal')
            } else {
              signingInfo = t('termsSigningInfoRegional').replace(
                '{regions}',
                displayRegionList(docRegs)
              )
            }

            const isApproved = r.approved_for_utleier_signing === true
            const badgeStyle = isApproved
              ? {
                  background: '#dcfce7',
                  color: '#14532d',
                  border: '1px solid #86efac',
                }
              : {
                  background: '#fef3c7',
                  color: '#78350f',
                  border: '1px solid #fcd34d',
                }

            return (
              <li
                key={r.id}
                className="card"
                style={{
                  padding: 'var(--space-4)',
                  borderLeft: `4px solid ${isApproved ? '#22c55e' : '#f59e0b'}`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 12,
                    flexWrap: 'wrap',
                    marginBottom: 8,
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{r.title}</div>
                  <span
                    style={{
                      ...badgeStyle,
                      padding: '4px 10px',
                      borderRadius: 999,
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    {isApproved ? <Check size={14} /> : <Info size={14} />}
                    {isApproved
                      ? t('termsApprovedForLandlordsBadge')
                      : t('termsPendingCentralBadge')}
                  </span>
                </div>
                <div className="text-sm" style={{ color: 'var(--text-muted)', marginBottom: 12 }}>
                  v{r.version}
                  {` · ${scopeLabel}`}
                  {r.effective_from
                    ? ` · ${t('termsOverviewUploadedAt').replace('{date}', formatDateTimeNo(r.effective_from))}`
                    : ''}
                </div>
                <p
                  className="text-sm"
                  style={{ color: 'var(--text-body)', marginBottom: 12, lineHeight: 1.5 }}
                >
                  {signingInfo}
                </p>
                {pdfUrl ? (
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="nav-link"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <ExternalLink size={16} /> {t('termsOpenPdf')}
                  </a>
                ) : r.body ? (
                  <pre
                    style={{
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'inherit',
                      fontSize: '0.9rem',
                      maxHeight: 160,
                      overflow: 'auto',
                      color: 'var(--text-body)',
                    }}
                  >
                    {r.body.length > 600 ? `${r.body.slice(0, 600)}…` : r.body}
                  </pre>
                ) : (
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {t('termsNoPdfOrText')}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
