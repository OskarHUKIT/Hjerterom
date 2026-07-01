'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ShieldCheck, Eye, CalendarPlus, RotateCcw } from 'lucide-react'
import type { NavDatabaseListingRow, ListingAvailabilityRow } from '@/app/lib/listingUiTypes'
import type { ListingDayAvailabilityStatus } from '@/app/lib/listingAvailabilityStatusToday'
import type { NavDbColumn } from '@/features/mediation/lib/navDatabaseColumns'
import type { TranslationKey } from '@/lib/translations'

export type NavDatabaseMobileListViewProps = {
  listings: NavDatabaseListingRow[]
  availability: Record<string, ListingAvailabilityRow[]>
  visibleColumns: string[]
  allColumns: NavDbColumn[]
  activeTab: 'Tilgjengelig' | 'Utilgjengelig' | 'Formidlet' | 'Ikke markert'
  kommuneCanEdit: boolean
  translateValue: (
    colId: string,
    value: unknown,
    listing: NavDatabaseListingRow,
    statusForToday?: ListingDayAvailabilityStatus | null
  ) => React.ReactNode
  getStatusForToday: (
    listingId: string,
    availMap: Record<string, ListingAvailabilityRow[]>
  ) => ListingDayAvailabilityStatus
  prefetchListingDetail: (id: string) => void
  openFormidletModal: (listing: NavDatabaseListingRow) => void
  openFormidletExtendModal: (listing: NavDatabaseListingRow) => void
  handleRemoveFormidlet: (id: string, address: string) => void
  t: (key: TranslationKey) => string
}

export default function NavDatabaseMobileListView({
  listings,
  availability,
  visibleColumns,
  allColumns,
  activeTab,
  kommuneCanEdit,
  translateValue,
  getStatusForToday,
  prefetchListingDetail,
  openFormidletModal,
  openFormidletExtendModal,
  handleRemoveFormidlet,
  t,
}: NavDatabaseMobileListViewProps) {
  const router = useRouter()
  const ALL_COLUMNS = allColumns
  return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {listings.map((l) => (
                <div
                  key={l.id}
                  className="card"
                  style={{
                    padding: 'var(--space-4)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/listings/${l.id}?view=nav`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        router.push(`/listings/${l.id}?view=nav`)
                      }
                    }}
                    onMouseEnter={() => prefetchListingDetail(l.id)}
                    onFocus={() => prefetchListingDetail(l.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                      {ALL_COLUMNS.filter((col) => visibleColumns.includes(col.id)).map((col) => (
                        <div
                          key={col.id}
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 'var(--space-2)',
                            alignItems: 'baseline',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              color: 'var(--text-muted)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                            }}
                          >
                            {col.label}
                          </span>
                          <span style={{ fontSize: '0.95rem', color: 'var(--text-main)', textAlign: 'right' }}>
                            {col.id === 'status'
                              ? translateValue(
                                  col.id,
                                  l[col.id],
                                  l,
                                  getStatusForToday(l.id, availability)
                                )
                              : translateValue(col.id, l[col.id], l)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 'var(--space-2)',
                      marginTop: 'var(--space-4)',
                      paddingTop: 'var(--space-3)',
                      borderTop: '1px solid var(--border-subtle)',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Link
                      href={`/listings/${l.id}?view=nav`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 'var(--touch-target)',
                        minWidth: 'var(--touch-target)',
                        padding: 'var(--space-2)',
                        background: 'rgba(59, 130, 246, 0.1)',
                        borderRadius: '10px',
                        color: 'var(--color-sky-blue)',
                      }}
                      title={t('seeDetails')}
                      aria-label={t('seeDetails')}
                    >
                      <Eye size={18} />
                    </Link>
                    {activeTab === 'Tilgjengelig' && kommuneCanEdit && (
                      <button
                        type="button"
                        onClick={() => openFormidletModal(l)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minHeight: 'var(--touch-target)',
                          minWidth: 'var(--touch-target)',
                          padding: 'var(--space-2)',
                          background: 'rgba(59, 130, 246, 0.1)',
                          borderRadius: '10px',
                          color: 'var(--color-sky-blue)',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                        title={t('dbTitleAddFormidletPeriod')}
                        aria-label={t('dbTitleAddFormidletPeriod')}
                      >
                        <ShieldCheck size={18} />
                      </button>
                    )}
                    {activeTab === 'Formidlet' && kommuneCanEdit && (
                      <>
                        <button
                          type="button"
                          onClick={() => openFormidletExtendModal(l)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: 'var(--touch-target)',
                            minWidth: 'var(--touch-target)',
                            padding: 'var(--space-2)',
                            background: 'rgba(59, 130, 246, 0.1)',
                            borderRadius: '10px',
                            color: 'var(--color-sky-blue)',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                          title={t('dbTitleExtendPeriod')}
                          aria-label={t('dbTitleExtendPeriod')}
                        >
                          <CalendarPlus size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveFormidlet(l.id, String(l.address ?? ''))}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: 'var(--touch-target)',
                            minWidth: 'var(--touch-target)',
                            padding: 'var(--space-2)',
                            background: 'rgba(239, 68, 68, 0.1)',
                            borderRadius: '10px',
                            color: '#ef4444',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                          title={t('dbTitleRemoveMediation')}
                          aria-label={t('dbTitleRemoveMediation')}
                        >
                          <RotateCcw size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

  )
}
