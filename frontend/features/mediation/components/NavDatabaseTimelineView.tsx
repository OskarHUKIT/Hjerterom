'use client'

import { useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Info } from 'lucide-react'
import NavDatabaseTimelineColorHelp from '@/features/mediation/components/NavDatabaseTimelineColorHelp'
import { formatDateNo } from '@/app/lib/dateFormat'
import { useLanguage } from '@/context/LanguageContext'
import type { NavDatabaseListingRow, ListingAvailabilityRow } from '@/app/lib/listingUiTypes'
import type { ListingDayAvailabilityStatus } from '@/app/lib/listingAvailabilityStatusToday'
import type { NavDbColumn } from '@/features/mediation/lib/navDatabaseColumns'
import type { TranslationKey } from '@/lib/translations'

export type NavDatabaseTimelineViewProps = {
  listings: NavDatabaseListingRow[]
  availability: Record<string, ListingAvailabilityRow[]>
  visibleColumns: string[]
  allColumns: NavDbColumn[]
  timelineOffset: number
  onTimelineOffsetChange: (offset: number) => void
  timelineColorHelpOpen: boolean
  onTimelineColorHelpOpenChange: (open: boolean) => void
  isMobile: boolean
  listingMatchesFilter: (listingId: string) => boolean
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
  t: (key: TranslationKey) => string
}

export default function NavDatabaseTimelineView({
  listings,
  availability,
  visibleColumns,
  allColumns,
  timelineOffset,
  onTimelineOffsetChange,
  timelineColorHelpOpen,
  onTimelineColorHelpOpenChange,
  isMobile,
  listingMatchesFilter,
  translateValue,
  getStatusForToday,
  prefetchListingDetail,
  t,
}: NavDatabaseTimelineViewProps) {
  const router = useRouter()
  const { locale } = useLanguage()
  const dateLocaleTag = locale === 'no' ? 'nb-NO' : locale === 'se' ? 'se' : 'en-GB'
  const timelineScrollRef = useRef<HTMLDivElement>(null)
  const setTimelineOffset = onTimelineOffsetChange
  const setTimelineColorHelpOpen = onTimelineColorHelpOpenChange
  const listingMatchesMapTimelineStatusFilter = listingMatchesFilter
  const ALL_COLUMNS = allColumns
  return (
            <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
              <NavDatabaseTimelineColorHelp
                open={timelineColorHelpOpen}
                isMobile={isMobile}
                onClose={() => setTimelineColorHelpOpen(false)}
                t={t}
              />
              <div
                ref={timelineScrollRef}
                className="card"
                style={{ padding: 'var(--space-6)', overflowX: 'auto', position: 'relative' }}
              >
                <button
                  type="button"
                  onClick={() => setTimelineColorHelpOpen(true)}
                  aria-label={t('timelineColorHelpTitle')}
                  title={t('timelineColorHelpTitle')}
                  style={{
                    position: 'absolute',
                    top: 'var(--space-3)',
                    right: 'var(--space-3)',
                    zIndex: 5,
                    background: 'rgba(59, 130, 246, 0.12)',
                    border: '1px solid rgba(59, 130, 246, 0.35)',
                    borderRadius: '10px',
                    padding: 'var(--space-2) var(--space-3)',
                    cursor: 'pointer',
                    color: 'var(--color-sky-blue)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Info size={18} aria-hidden />
                </button>
                <div style={{ minWidth: '860px', paddingRight: '44px' }}>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      marginBottom: 'var(--space-4)',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    {/* Rad 1: Måneder og År.
                        Alle tre rader (måneder, uker/dag, dato-celler) deler samme
                        CSS Grid-mal: `repeat(60, minmax(0, 1fr))`. Det er den eneste
                        måten å garantere at kolonne `i` har samme x-posisjon i alle
                        rader uansett browser-pikselavrunding — flex med `flex: N`
                        på etiketter + `flex: 1` på 60 celler driftet subpikselvis
                        og var det «logiske» problemet med markører som flytter seg
                        relativt til datoblokkene når slideren ble brukt. */}
                    <div
                      style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                    >
                      <div style={{ width: '220px', flexShrink: 0 }}></div>
                      <div
                        style={{
                          flex: 1,
                          display: 'grid',
                          gridTemplateColumns: 'repeat(60, minmax(0, 1fr))',
                        }}
                      >
                        {Array.from({ length: 60 }).map((_, i) => {
                          const d = new Date()
                          d.setDate(d.getDate() + i + timelineOffset)
                          const isFirstOfMonth = d.getDate() === 1
                          const isJan1st = d.getMonth() === 0 && d.getDate() === 1

                          if (isFirstOfMonth || i === 0) {
                            // Finn ut hvor mange dager denne måneden har igjen i visningen
                            let daysInView = 0
                            for (let j = i; j < 60; j++) {
                              const nextD = new Date()
                              nextD.setDate(nextD.getDate() + j + timelineOffset)
                              if (nextD.getDate() === 1 && j !== i) break
                              daysInView++
                            }

                            return (
                              <div
                                key={i}
                                style={{
                                  /* Eksplisitt start- og span: etiketten ligger
                                   *  alltid i nøyaktig kolonne `i+1` over `daysInView`
                                   *  spor — auto-flow ville landet på samme sted
                                   *  her (loopen produserer ingen hull), men
                                   *  eksplisitt plassering fjerner enhver tvil. */
                                  gridColumnStart: i + 1,
                                  gridColumnEnd: `span ${daysInView}`,
                                  minWidth: 0,
                                  borderLeft: '2px solid var(--color-sky-blue)',
                                  padding: 'var(--space-1) var(--space-2)',
                                  fontSize: 'clamp(0.62rem, 0.25vw + 0.55rem, 0.72rem)',
                                  fontWeight: 700,
                                  color: 'var(--color-sky-blue)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {d.toLocaleDateString(dateLocaleTag, {
                                  month: 'long',
                                  year: isJan1st || i === 0 ? 'numeric' : undefined,
                                })}
                              </div>
                            )
                          }
                          return null
                        })}
                      </div>
                    </div>
                    {/* Rad 2: Uker og dager */}
                    <div style={{ display: 'flex' }}>
                      <div
                        style={{
                          width: '220px',
                          flexShrink: 0,
                          fontWeight: 700,
                          fontSize: 'clamp(0.7rem, 0.25vw + 0.62rem, 0.78rem)',
                          opacity: 0.5,
                          display: 'flex',
                          alignItems: 'center',
                          paddingLeft: 'var(--space-2)',
                        }}
                      >
                        {t('dbPropertyRowHeader')}
                      </div>
                      <div
                        style={{
                          flex: 1,
                          display: 'grid',
                          gridTemplateColumns: 'repeat(60, minmax(0, 1fr))',
                        }}
                      >
                        {Array.from({ length: 60 }).map((_, i) => {
                          const d = new Date()
                          d.setDate(d.getDate() + i + timelineOffset)
                          const isMonday = d.getDay() === 1

                          // Beregn ukenummer
                          const getWeek = (date: Date) => {
                            const tempDate = new Date(date.getTime())
                            tempDate.setHours(0, 0, 0, 0)
                            tempDate.setDate(tempDate.getDate() + 3 - ((tempDate.getDay() + 6) % 7))
                            const week1 = new Date(tempDate.getFullYear(), 0, 4)
                            return (
                              1 +
                              Math.round(
                                ((tempDate.getTime() - week1.getTime()) / 86400000 -
                                  3 +
                                  ((week1.getDay() + 6) % 7)) /
                                  7
                              )
                            )
                          }

                          return (
                            <div
                              key={i}
                              style={{
                                minWidth: 0,
                                textAlign: 'center',
                                fontSize: 'clamp(0.52rem, 0.2vw + 0.48rem, 0.6rem)',
                                borderLeft: isMonday ? '1px solid rgba(59, 130, 246, 0.3)' : 'none',
                                padding: 'var(--space-1) 0',
                                opacity: isMonday ? 1 : 0.4,
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 'clamp(0.44rem, 0.15vw + 0.42rem, 0.52rem)',
                                  fontWeight: 600,
                                  visibility: isMonday ? 'visible' : 'hidden',
                                }}
                              >
                                U{getWeek(d)}
                              </div>
                              <span className={isMonday ? '' : 'timeline-date-optional'}>
                                {d.getDate()}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gap: '2px' }}>
                    {listings.filter((l) => listingMatchesMapTimelineStatusFilter(l.id)).map((l) => (
                      <div
                        key={l.id}
                        style={{
                          display: 'flex',
                          alignItems: 'stretch',
                          minHeight: 'clamp(1.75rem, 2vh + 1rem, 2rem)',
                          background: 'rgba(255,255,255,0.01)',
                          borderRadius: '4px',
                        }}
                      >
                        <div
                          onClick={() => router.push(`/listings/${l.id}?view=nav`)}
                          onMouseEnter={() => prefetchListingDetail(l.id)}
                          style={{
                            width: '220px',
                            flexShrink: 0,
                            fontSize: 'clamp(0.68rem, 0.2vw + 0.6rem, 0.76rem)',
                            padding: 'var(--space-1) var(--space-2)',
                            cursor: 'pointer',
                            fontWeight: 500,
                            opacity: 0.9,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            gap: 2,
                            boxSizing: 'border-box',
                          }}
                        >
                          <div
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontWeight: 600,
                            }}
                          >
                            {l.address}
                          </div>
                          {ALL_COLUMNS.filter(
                            (col) => visibleColumns.includes(col.id) && col.id !== 'address'
                          ).map((col) => (
                            <div
                              key={col.id}
                              style={{
                                fontSize: 'clamp(0.58rem, 0.16vw + 0.5rem, 0.66rem)',
                                opacity: 0.88,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {col.id === 'status'
                                ? translateValue(
                                    col.id,
                                    l[col.id],
                                    l,
                                    getStatusForToday(l.id, availability)
                                  )
                                : translateValue(col.id, l[col.id], l)}
                            </div>
                          ))}
                        </div>
                        <div
                          style={{
                            flex: 1,
                            display: 'grid',
                            gridTemplateColumns: 'repeat(60, minmax(0, 1fr))',
                            height: 'clamp(1.1rem, 1.2vw + 0.75rem, 1.25rem)',
                            /* Samme grid-mal som header-radene over (måneder +
                             *  uker/dag): `repeat(60, minmax(0, 1fr))`. Browseren
                             *  bruker da samme kolonneberegning for alle tre
                             *  rader, så kolonne `i` har identisk x-posisjon
                             *  uansett `timelineOffset`. Eldre flex-versjon led
                             *  av subpiksel-avrunding (flex: daysInView vs flex: 1
                             *  × 60) som ga synlig drift når slideren ble brukt. */
                            alignSelf: 'center',
                          }}
                        >
                          {Array.from({ length: 60 }).map((_, i) => {
                            const date = new Date()
                            date.setHours(0, 0, 0, 0)
                            date.setDate(date.getDate() + i + timelineOffset)

                            const isWeekend = date.getDay() === 0 || date.getDay() === 6

                            // Finn alle perioder som overlapper med denne dagen
                            const periodsOnDay =
                              availability[l.id]?.filter((p) => {
                                const start = new Date(String(p.start_date ?? ''))
                                start.setHours(0, 0, 0, 0)
                                const end = new Date(String(p.end_date ?? ''))
                                end.setHours(0, 0, 0, 0)
                                return date >= start && date <= end
                              }) || []

                            const isFormidlet = periodsOnDay.some((p) => p.status === 'Formidla')
                            const isAvailable = periodsOnDay.some(
                              (p) => p.status === 'Tilgjengelig' || !p.status
                            )
                            const isUnavailable = periodsOnDay.some(
                              (p) => p.status === 'Utilgjengelig'
                            )

                            let bgColor = 'rgba(255,255,255,0.06)'
                            let opacity = 1
                            let title = `${l.address}: ${formatDateNo(date)}`

                            if (isFormidlet) {
                              bgColor = 'var(--color-sky-blue)'
                              opacity = 0.9
                              title += ' - Formidlet'
                              if (isUnavailable) {
                                bgColor = '#991b1b' // Mørkerød konflikt
                                title += ' !!! KONFLIKT MED UTILGJENGELIG !!!'
                              }
                            } else if (isAvailable) {
                              bgColor = 'var(--color-teal)'
                              opacity = 0.8
                              title += ' - TILGJENGELIG'
                              if (isUnavailable) {
                                bgColor = '#991b1b' // Mørkerød konflikt
                                title += ' !!! KONFLIKT MED UTILGJENGELIG !!!'
                              }
                            } else if (isUnavailable) {
                              bgColor = '#ef4444'
                              opacity = 0.6
                              title += ' - UTILGJENGELIG'
                            } else if (isWeekend) {
                              bgColor = 'rgba(255,255,255,0.03)'
                            }

                            const isConflict = isFormidlet && isUnavailable
                            return (
                              <div
                                key={i}
                                title={title}
                                style={{
                                  minWidth: 0,
                                  background: bgColor,
                                  borderRadius: '1px',
                                  opacity: opacity,
                                  /* Cellen er nøyaktig ett gridspor bred (1/60 av W).
                                   *  1px-border på venstre kant gir visuelt skille
                                   *  mellom dager uten å forstyrre kolonnebredden
                                   *  (globalt `box-sizing: border-box`). */
                                  border: isConflict ? '1px solid #f87171' : undefined,
                                  borderLeft: isConflict
                                    ? '1px solid #f87171'
                                    : i === 0
                                      ? '1px solid transparent'
                                      : '1px solid var(--bg-card)',
                                  animation: isConflict ? 'pulse 2s infinite' : 'none',
                                }}
                              />
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div
                className="card"
                style={{
                  padding: 'var(--space-4)',
                  display: 'grid',
                  gap: 'var(--space-2)',
                  marginTop: 'var(--space-4)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 'var(--space-6)',
                    marginBottom: 'var(--space-2)',
                    fontSize: 'clamp(0.72rem, 0.2vw + 0.66rem, 0.8rem)',
                    opacity: 0.8,
                  }}
                >
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    title={t('calendarLegendAvailableInfo')}
                  >
                    <div
                      style={{
                        width: 'clamp(10px, 1.1vw, 12px)',
                        height: 'clamp(10px, 1.1vw, 12px)',
                        background: 'var(--color-teal)',
                        borderRadius: '2px',
                      }}
                    />{' '}
                    {t('available')}
                  </div>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    title={t('calendarLegendFormidletInfo')}
                  >
                    <div
                      style={{
                        width: 'clamp(10px, 1.1vw, 12px)',
                        height: 'clamp(10px, 1.1vw, 12px)',
                        background: 'var(--color-sky-blue)',
                        borderRadius: '2px',
                      }}
                    />{' '}
                    {t('formidlet')}
                  </div>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    title={t('calendarLegendUnavailableInfo')}
                  >
                    <div
                      style={{
                        width: 'clamp(10px, 1.1vw, 12px)',
                        height: 'clamp(10px, 1.1vw, 12px)',
                        background: '#ef4444',
                        borderRadius: '2px',
                      }}
                    />{' '}
                    {t('unavailable')}
                  </div>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    title={t('calendarLegendConflictInfo')}
                  >
                    <div
                      style={{
                        width: 'clamp(10px, 1.1vw, 12px)',
                        height: 'clamp(10px, 1.1vw, 12px)',
                        background: '#991b1b',
                        borderRadius: '2px',
                      }}
                    />{' '}
                    {t('timelineLegendConflictShort')}
                  </div>
                </div>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span style={{ fontSize: 'clamp(0.78rem, 0.2vw + 0.7rem, 0.85rem)', fontWeight: 600 }}>
                    {t('dbTimelineControls')}
                  </span>
                  <button
                    onClick={() => {
                      setTimelineOffset(0)
                      /* Scroll-resetten må kjøres ALLTID (også når offset alt er 0),
                       *  ellers blir knappen død når brukeren har scrollet sideveis
                       *  uten å ha rørt slideren. */
                      timelineScrollRef.current?.scrollTo({ left: 0, behavior: 'smooth' })
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-sky-blue)',
                      cursor: 'pointer',
                      fontSize: 'clamp(0.72rem, 0.2vw + 0.65rem, 0.8rem)',
                    }}
                  >
                    {t('dbGoToToday')}
                  </button>
                </div>
                <div
                  style={{
                    position: 'relative',
                    height: 'clamp(1.1rem, 1.2vw + 0.75rem, 1.25rem)',
                    margin: 'var(--space-2) 0',
                  }}
                >
                  <input
                    type="range"
                    min="-30"
                    max="365"
                    value={timelineOffset}
                    onChange={(e) => setTimelineOffset(parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      cursor: 'pointer',
                      accentColor: 'var(--color-accent)',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      zIndex: 2,
                    }}
                  />
                  {/* Markering for "I dag" på slideren */}
                  <div
                    style={{
                      position: 'absolute',
                      left: `${(30 / (365 + 30)) * 100}%`,
                      top: '-5px',
                      bottom: '-5px',
                      width: '2px',
                      background: 'var(--color-sky-blue)',
                      zIndex: 1,
                      opacity: 0.5,
                    }}
                  ></div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 'clamp(0.62rem, 0.18vw + 0.56rem, 0.7rem)',
                    opacity: 0.5,
                  }}
                >
                  <span>{t('dbTimelineRangePast')}</span>
                  <span
                    style={{ color: 'var(--color-sky-blue)', fontWeight: 700, marginLeft: '-15%' }}
                  >
                    {t('dbTimelineRangeToday')}
                  </span>
                  <span>{t('dbTimelineRangeFuture')}</span>
                </div>
              </div>
            </div>

  )
}
