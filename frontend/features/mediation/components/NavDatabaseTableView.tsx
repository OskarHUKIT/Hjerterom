'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  ArrowUpDown,
  CalendarPlus,
  Eye,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react'
import type { ListingAvailabilityRow, NavDatabaseListingRow } from '@/app/lib/listingUiTypes'
import type { ListingDayAvailabilityStatus } from '@/app/lib/listingAvailabilityStatusToday'
import type { NavDbColumn } from '@/features/mediation/lib/navDatabaseColumns'
import type { ReactNode } from 'react'

type NavDatabaseTableViewProps = {
  listings: NavDatabaseListingRow[]
  availability: Record<string, ListingAvailabilityRow[]>
  visibleColumnIds: string[]
  allColumns: NavDbColumn[]
  activeTab: 'Tilgjengelig' | 'Utilgjengelig' | 'Formidlet' | 'Ikke markert'
  kommuneCanEdit: boolean
  isMobile: boolean
  translateValue: (
    id: string,
    val: unknown,
    listing?: NavDatabaseListingRow,
    statusForToday?: ListingDayAvailabilityStatus | null
  ) => ReactNode
  getStatusForToday: (
    lid: string,
    avail: Record<string, ListingAvailabilityRow[]>
  ) => ListingDayAvailabilityStatus
  toggleSort: (field: string) => void
  prefetchListingDetail: (id: string) => void
  openFormidletModal: (listing: NavDatabaseListingRow) => void
  openFormidletExtendModal: (listing: NavDatabaseListingRow) => void
  handleRemoveFormidlet: (id: string, address: string) => void
  actionColumnLabel: string
  seeDetailsLabel: string
  addFormidletTitle: string
  extendTitle: string
  removeMediationTitle: string
}

const ROW_HEIGHT = 52

export default function NavDatabaseTableView({
  listings,
  availability,
  visibleColumnIds,
  allColumns,
  activeTab,
  kommuneCanEdit,
  isMobile,
  translateValue,
  getStatusForToday,
  toggleSort,
  prefetchListingDetail,
  openFormidletModal,
  openFormidletExtendModal,
  handleRemoveFormidlet,
  actionColumnLabel,
  seeDetailsLabel,
  addFormidletTitle,
  extendTitle,
  removeMediationTitle,
}: NavDatabaseTableViewProps) {
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)
  const cols = allColumns.filter((col) => visibleColumnIds.includes(col.id))

  const virtualizer = useVirtualizer({
    count: listings.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  })

  return (
    <div className="card db-table-wrapper" style={{ padding: 0, overflow: 'hidden' }}>
      <div
        ref={scrollRef}
        style={{
          overflow: 'auto',
          WebkitOverflowScrolling: 'touch',
          minHeight: '200px',
          maxHeight: 'min(70vh, 900px)',
        }}
      >
        <table
          className="db-table"
          style={{
            width: '100%',
            minWidth: visibleColumnIds.length <= 2 && isMobile ? '100%' : '600px',
            borderCollapse: 'collapse',
            fontSize: '0.9rem',
          }}
        >
          <thead>
            <tr style={{ background: 'rgba(59, 130, 246, 0.1)', textAlign: 'left' }}>
              {cols.map((col) => (
                <th
                  key={col.id}
                  style={{ padding: 'var(--space-4)', cursor: 'pointer' }}
                  onClick={() => toggleSort(col.id)}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {col.label} <ArrowUpDown size={14} style={{ flexShrink: 0 }} />
                  </div>
                </th>
              ))}
              <th style={{ padding: 'var(--space-4)' }}>{actionColumnLabel}</th>
            </tr>
          </thead>
          <tbody>
            {virtualizer.getVirtualItems().length > 0 && (
              <tr aria-hidden style={{ height: virtualizer.getVirtualItems()[0]?.start ?? 0 }}>
                <td colSpan={cols.length + 1} style={{ padding: 0, border: 'none' }} />
              </tr>
            )}
            {virtualizer.getVirtualItems().map((vRow) => {
              const l = listings[vRow.index]
              const i = vRow.index
              return (
                <tr
                  key={l.id}
                  onClick={() => router.push(`/listings/${l.id}?view=nav`)}
                  style={{
                    borderTop: '1px solid var(--border-subtle)',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(59, 130, 246, 0.04)',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    height: ROW_HEIGHT,
                  }}
                  onMouseEnter={(e) => {
                    prefetchListingDetail(l.id)
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background =
                      i % 2 === 0 ? 'transparent' : 'rgba(59, 130, 246, 0.04)'
                  }}
                >
                  {cols.map((col) => (
                    <td key={col.id} style={{ padding: 'var(--space-4)' }}>
                      {col.id === 'status'
                        ? translateValue(
                            col.id,
                            l[col.id as keyof NavDatabaseListingRow],
                            l,
                            getStatusForToday(l.id, availability)
                          )
                        : translateValue(col.id, l[col.id as keyof NavDatabaseListingRow], l)}
                    </td>
                  ))}
                  <td style={{ padding: 'var(--space-4)' }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <Link
                        href={`/listings/${l.id}?view=nav`}
                        style={{
                          padding: '6px',
                          background: 'rgba(59, 130, 246, 0.1)',
                          borderRadius: '6px',
                          color: 'var(--color-sky-blue)',
                        }}
                        title={seeDetailsLabel}
                      >
                        <Eye size={16} />
                      </Link>
                      {activeTab === 'Tilgjengelig' && kommuneCanEdit && (
                        <button
                          type="button"
                          onClick={() => openFormidletModal(l)}
                          style={{
                            padding: '6px',
                            background: 'rgba(59, 130, 246, 0.1)',
                            borderRadius: '6px',
                            color: 'var(--color-sky-blue)',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                          title={addFormidletTitle}
                        >
                          <ShieldCheck size={16} />
                        </button>
                      )}
                      {activeTab === 'Formidlet' && kommuneCanEdit && (
                        <>
                          <button
                            type="button"
                            onClick={() => openFormidletExtendModal(l)}
                            style={{
                              padding: '6px',
                              background: 'rgba(59, 130, 246, 0.1)',
                              borderRadius: '6px',
                              color: 'var(--color-sky-blue)',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                            title={extendTitle}
                          >
                            <CalendarPlus size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveFormidlet(l.id, String(l.address ?? ''))}
                            style={{
                              padding: '6px',
                              background: 'rgba(239, 68, 68, 0.1)',
                              borderRadius: '6px',
                              color: '#ef4444',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                            title={removeMediationTitle}
                          >
                            <RotateCcw size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
            {virtualizer.getVirtualItems().length > 0 && (
              <tr
                aria-hidden
                style={{
                  height:
                    virtualizer.getTotalSize() -
                    (virtualizer.getVirtualItems().at(-1)?.end ?? 0),
                }}
              >
                <td colSpan={cols.length + 1} style={{ padding: 0, border: 'none' }} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
