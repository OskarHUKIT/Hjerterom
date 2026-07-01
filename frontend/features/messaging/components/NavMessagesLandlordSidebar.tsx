'use client'

import Link from 'next/link'
import { MessageSquare, ChevronRight } from 'lucide-react'
import LoadingPlaceholder from '@/app/components/LoadingPlaceholder'
import { channelBadgeEmoji } from '@/app/lib/messageChannelLabels'
import type { TranslationKey } from '@/lib/translations'
import type {
  LandlordAreaThread,
  LandlordEventThread,
  GuestBookingThread,
} from '@/features/messaging/types/navMessages'

export type NavMessagesLandlordSidebarProps = {
  landlordMessagesTab: 'social' | 'event' | 'guest'
  onLandlordMessagesTabChange: (tab: 'social' | 'event' | 'guest') => void
  conversationsLoading: boolean
  guestBookingThreads: GuestBookingThread[]
  landlordEventThreads: LandlordEventThread[]
  landlordAreaThreads: LandlordAreaThread[]
  withBookingId: string | null
  withEventId: string | null
  withAreaId: string | null
  t: (key: TranslationKey) => string
}

export default function NavMessagesLandlordSidebar({
  landlordMessagesTab,
  onLandlordMessagesTabChange,
  conversationsLoading,
  guestBookingThreads,
  landlordEventThreads,
  landlordAreaThreads,
  withBookingId,
  withEventId,
  withAreaId,
  t,
}: NavMessagesLandlordSidebarProps) {
  const setLandlordMessagesTab = onLandlordMessagesTabChange
  return (
<aside
            className="card"
            style={{
              padding: 'var(--space-4)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              minWidth: 0,
              gap: 'var(--space-4)',
            }}
          >
            <h3
              style={{
                marginBottom: 0,
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <MessageSquare size={18} style={{ opacity: 0.85 }} /> {t('conversations')}
            </h3>
            {(guestBookingThreads.length > 0 || landlordEventThreads.length > 0) ? (
              <div role="tablist" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={landlordMessagesTab === 'social'}
                  onClick={() => setLandlordMessagesTab('social')}
                  className="button"
                  style={{
                    flex: 1,
                    minWidth: 72,
                    fontSize: '0.78rem',
                    padding: '6px 8px',
                    opacity: landlordMessagesTab === 'social' ? 1 : 0.65,
                  }}
                >
                  {t('landlordMsgTabSocial')}
                </button>
                {landlordEventThreads.length > 0 ? (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={landlordMessagesTab === 'event'}
                    onClick={() => setLandlordMessagesTab('event')}
                    className="button"
                    style={{
                      flex: 1,
                      minWidth: 72,
                      fontSize: '0.78rem',
                      padding: '6px 8px',
                      opacity: landlordMessagesTab === 'event' ? 1 : 0.65,
                    }}
                  >
                    {t('landlordMsgTabEvent')}
                  </button>
                ) : null}
                {guestBookingThreads.length > 0 ? (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={landlordMessagesTab === 'guest'}
                    onClick={() => setLandlordMessagesTab('guest')}
                    className="button"
                    style={{
                      flex: 1,
                      minWidth: 72,
                      fontSize: '0.78rem',
                      padding: '6px 8px',
                      opacity: landlordMessagesTab === 'guest' ? 1 : 0.65,
                    }}
                  >
                    {t('landlordMsgTabGuest')}
                  </button>
                ) : null}
              </div>
            ) : null}
            {conversationsLoading ? (
              <LoadingPlaceholder minHeight={120} />
            ) : landlordMessagesTab === 'guest' ? (
              guestBookingThreads.length === 0 ? (
                <p className="text-sm" style={{ opacity: 0.6, margin: 0 }}>
                  {t('landlordGuestThreadsEmpty')}
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {guestBookingThreads.map((g) => (
                    <Link
                      key={g.bookingId}
                      href={`/nav/messages?booking=${g.bookingId}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-3)',
                        padding: 'var(--space-3)',
                        borderRadius: '10px',
                        background:
                          withBookingId === g.bookingId
                            ? 'rgba(59, 130, 246, 0.15)'
                            : 'rgba(255,255,255,0.03)',
                        textDecoration: 'none',
                        color: 'inherit',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600 }}>
                          {channelBadgeEmoji('guest_booking')} {g.guestLabel}
                        </div>
                        <div className="text-sm" style={{ opacity: 0.6 }}>
                          {g.listingAddress}
                        </div>
                        {g.lastPreview ? (
                          <div
                            className="text-sm"
                            style={{
                              opacity: 0.6,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {g.lastPreview}
                          </div>
                        ) : null}
                      </div>
                      <ChevronRight size={16} style={{ opacity: 0.5, flexShrink: 0 }} />
                    </Link>
                  ))}
                </div>
              )
            ) : landlordMessagesTab === 'event' ? (
              landlordEventThreads.length === 0 ? (
                <p className="text-sm" style={{ opacity: 0.6, margin: 0 }}>
                  {t('landlordEventThreadsEmpty')}
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {landlordEventThreads.map((ev) => (
                    <Link
                      key={ev.eventId}
                      href={`/nav/messages?event=${ev.eventId}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-3)',
                        padding: 'var(--space-3)',
                        borderRadius: '10px',
                        background:
                          withEventId === ev.eventId
                            ? 'rgba(168, 85, 247, 0.15)'
                            : 'rgba(255,255,255,0.03)',
                        textDecoration: 'none',
                        color: 'inherit',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600 }}>
                          {channelBadgeEmoji('event_caseworker')} {t('msgChannelEvent')}
                        </div>
                        <div className="text-sm" style={{ opacity: 0.6 }}>
                          {ev.eventName}
                        </div>
                        {ev.lastMessage ? (
                          <div className="text-sm" style={{ opacity: 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {ev.lastMessage}
                          </div>
                        ) : null}
                      </div>
                      <ChevronRight size={16} style={{ opacity: 0.5, flexShrink: 0 }} />
                    </Link>
                  ))}
                </div>
              )
            ) : landlordAreaThreads.length === 0 ? (
              <p className="text-sm" style={{ opacity: 0.6, margin: 0 }}>
                {t('noMessagesYet')}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {landlordAreaThreads.map((a) => (
                  <Link
                    key={a.serviceAreaId}
                    href={`/nav/messages?area=${a.serviceAreaId}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-3)',
                      padding: 'var(--space-3)',
                      borderRadius: '10px',
                      background:
                        withAreaId === a.serviceAreaId
                          ? 'rgba(59, 130, 246, 0.15)'
                          : 'rgba(255,255,255,0.03)',
                      textDecoration: 'none',
                      color: 'inherit',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>
                        {channelBadgeEmoji('social_caseworker')} {t('msgChannelSocial')} · {a.name}
                      </div>
                      {a.lastMessage ? (
                        <div className="text-sm" style={{ opacity: 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {a.lastMessage}
                        </div>
                      ) : null}
                    </div>
                    <ChevronRight size={16} style={{ opacity: 0.5, flexShrink: 0 }} />
                  </Link>
                ))}
              </div>
            )}
          </aside>
  )
}
