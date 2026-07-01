'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MessageSquare, User, ChevronRight, Home, Users, MessageCircle } from 'lucide-react'
import LoadingPlaceholder from '@/app/components/LoadingPlaceholder'
import { supabase } from '@/app/lib/supabase'
import type { TranslationKey } from '@/lib/translations'
import type { ConversationRow } from '@/features/messaging/types/navMessages'

export type NavMessagesKommuneSidebarProps = {
  conversationsLoading: boolean
  conversations: ConversationRow[]
  withUserId: string | null
  withAreaId: string | null
  messagesPickerTab: 'landlords' | 'staff' | 'los'
  onMessagesPickerTabChange: (tab: 'landlords' | 'staff' | 'los') => void
  messagesContactSearch: string
  onMessagesContactSearchChange: (q: string) => void
  losInMessagesEnabled: boolean
  filteredLandlordsForPicker: { id: string; name: string }[]
  filteredColleaguesForPicker: { id: string; name: string }[]
  landlordAccounts: { id: string; name: string }[]
  colleagues: { id: string; name: string }[]
  showMessagesPickerSearch: boolean
  landlordsWithoutThread: { id: string; name: string }[]
  t: (key: TranslationKey) => string
}

export default function NavMessagesKommuneSidebar({
  conversationsLoading,
  conversations,
  withUserId,
  withAreaId,
  messagesPickerTab,
  onMessagesPickerTabChange,
  messagesContactSearch,
  onMessagesContactSearchChange,
  losInMessagesEnabled,
  filteredLandlordsForPicker,
  filteredColleaguesForPicker,
  landlordAccounts,
  colleagues,
  showMessagesPickerSearch,
  landlordsWithoutThread,
  t,
}: NavMessagesKommuneSidebarProps) {
  const router = useRouter()
  const setMessagesPickerTab = onMessagesPickerTabChange
  const setMessagesContactSearch = onMessagesContactSearchChange
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
            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <h3
                style={{
                  marginBottom: 'var(--space-3)',
                  fontSize: '1rem',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <MessageSquare size={18} style={{ opacity: 0.85 }} /> {t('conversations')}
              </h3>
              {conversationsLoading ? (
                <LoadingPlaceholder minHeight={120} />
              ) : conversations.length === 0 ? (
                <p className="text-sm" style={{ opacity: 0.6, margin: 0 }}>
                  {t('noMessagesYet')}
                </p>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-2)',
                    minWidth: 0,
                    maxHeight: 'min(32vh, 260px)',
                    overflowY: 'auto',
                    WebkitOverflowScrolling: 'touch',
                  }}
                >
                  {conversations.map((c) => (
                    <Link
                      key={`${c.userId}:${c.serviceAreaId}`}
                      href={`/nav/messages?with=${c.userId}&area=${c.serviceAreaId}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-3)',
                        padding: 'var(--space-3)',
                        borderRadius: '10px',
                        background:
                          withUserId === c.userId && withAreaId === c.serviceAreaId
                            ? 'rgba(59, 130, 246, 0.15)'
                            : 'rgba(255,255,255, 0.03)',
                        textDecoration: 'none',
                        color: 'inherit',
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          flexShrink: 0,
                          borderRadius: '50%',
                          background: 'rgba(59, 130, 246, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <User size={16} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                        <div
                          style={{
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {c.name}
                        </div>
                        {c.areaName ? (
                          <div className="text-sm" style={{ opacity: 0.55, fontSize: '0.78rem' }}>
                            {c.areaName}
                          </div>
                        ) : null}
                        <div
                          className="text-sm"
                          style={{
                            opacity: 0.6,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {c.lastMessage}
                        </div>
                      </div>
                      <ChevronRight size={16} style={{ opacity: 0.5, flexShrink: 0 }} />
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <div
                role="tablist"
                aria-label={t('messages')}
                style={{
                  display: 'flex',
                  gap: '8px',
                  flexShrink: 0,
                }}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={messagesPickerTab === 'landlords'}
                  onClick={() => {
                    setMessagesPickerTab('landlords')
                    setMessagesContactSearch('')
                  }}
                  style={{
                    flex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border:
                      messagesPickerTab === 'landlords'
                        ? '1px solid rgba(59, 130, 246, 0.45)'
                        : '1px solid var(--border-subtle)',
                    background:
                      messagesPickerTab === 'landlords'
                        ? 'rgba(59, 130, 246, 0.18)'
                        : 'var(--bg-subtle)',
                    color: 'var(--text-main)',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                  }}
                >
                  <Home size={16} style={{ opacity: 0.9, flexShrink: 0 }} />
                  {t('tabLandlords')}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={messagesPickerTab === 'staff'}
                  onClick={() => {
                    setMessagesPickerTab('staff')
                    setMessagesContactSearch('')
                  }}
                  style={{
                    flex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border:
                      messagesPickerTab === 'staff'
                        ? '1px solid rgba(59, 130, 246, 0.45)'
                        : '1px solid var(--border-subtle)',
                    background:
                      messagesPickerTab === 'staff'
                        ? 'rgba(59, 130, 246, 0.18)'
                        : 'var(--bg-subtle)',
                    color: 'var(--text-main)',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                  }}
                >
                  <Users size={16} style={{ opacity: 0.9, flexShrink: 0 }} />
                  {t('tabStaff')}
                </button>
                {losInMessagesEnabled ? (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={messagesPickerTab === 'los'}
                    onClick={() => {
                      setMessagesPickerTab('los')
                      setMessagesContactSearch('')
                    }}
                    style={{
                      flex: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border:
                        messagesPickerTab === 'los'
                          ? '1px solid rgba(45, 212, 191, 0.45)'
                          : '1px solid var(--border-subtle)',
                      background:
                        messagesPickerTab === 'los'
                          ? 'rgba(45, 212, 191, 0.14)'
                          : 'var(--bg-subtle)',
                      color: 'var(--text-main)',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                    }}
                  >
                    <MessageCircle size={16} style={{ opacity: 0.9, flexShrink: 0 }} />
                    {t('tabLos')}
                  </button>
                ) : null}
              </div>

              <div
                role="tabpanel"
                style={{
                  maxHeight: 'min(18vh, 148px)',
                  overflowY: 'auto',
                  WebkitOverflowScrolling: 'touch',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-2)',
                  minHeight: 0,
                }}
              >
                {messagesPickerTab === 'los' ? (
                  <div
                    style={{
                      padding: 'var(--space-3)',
                      borderRadius: '10px',
                      background: 'rgba(45, 212, 191, 0.08)',
                      border: '1px solid rgba(45, 212, 191, 0.25)',
                    }}
                  >
                    <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: '0.9rem' }}>
                      {t('messagesLosPanelTitle')}
                    </p>
                    <p style={{ margin: '0 0 12px', fontSize: '0.82rem', lineHeight: 1.5, opacity: 0.85 }}>
                      {t('messagesLosPanelDesc')}
                    </p>
                    <Link
                      href="/nav/los-inbox"
                      className="button button-accent"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: '0.85rem',
                        padding: '8px 12px',
                        textDecoration: 'none',
                      }}
                    >
                      {t('messagesLosPanelCta')} <ChevronRight size={16} aria-hidden />
                    </Link>
                  </div>
                ) : messagesPickerTab === 'landlords' ? (
                  landlordAccounts.length === 0 ? (
                    <p className="text-sm" style={{ opacity: 0.65, margin: 0 }}>
                      {t('messagesNoLandlordsInRegion')}
                    </p>
                  ) : landlordsWithoutThread.length === 0 ? (
                    <p className="text-sm" style={{ opacity: 0.65, margin: 0 }}>
                      {t('messagesLandlordsAllInConversations')}
                    </p>
                  ) : filteredLandlordsForPicker.length === 0 ? (
                    <p className="text-sm" style={{ opacity: 0.65, margin: 0 }}>
                      {t('noUsersMatch')}
                    </p>
                  ) : (
                    filteredLandlordsForPicker.map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => {
                          void supabase
                            .rpc('resolve_staff_landlord_thread_area', { p_landlord_id: l.id })
                            .then(({ data, error }) => {
                              if (error || !data) return
                              router.push(`/nav/messages?with=${l.id}&area=${data}`)
                            })
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-3)',
                          padding: 'var(--space-3)',
                          borderRadius: '10px',
                          background:
                            withUserId === l.id
                              ? 'rgba(59, 130, 246, 0.15)'
                              : 'rgba(255,255,255,0.03)',
                          textDecoration: 'none',
                          color: 'inherit',
                          minWidth: 0,
                          border: 'none',
                          width: '100%',
                          textAlign: 'left',
                          cursor: 'pointer',
                        }}
                      >
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            flexShrink: 0,
                            borderRadius: '50%',
                            background: 'rgba(59, 130, 246, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <User size={16} />
                        </div>
                        <div
                          style={{
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1,
                          }}
                        >
                          {l.name}
                        </div>
                        <ChevronRight size={16} style={{ opacity: 0.5, flexShrink: 0 }} />
                      </button>
                    ))
                  )
                ) : colleagues.length === 0 ? (
                  <p className="text-sm" style={{ opacity: 0.65, margin: 0 }}>
                    {t('noColleaguesWithEdit')}
                  </p>
                ) : filteredColleaguesForPicker.length === 0 ? (
                  <p className="text-sm" style={{ opacity: 0.65, margin: 0 }}>
                    {t('noUsersMatch')}
                  </p>
                ) : (
                  filteredColleaguesForPicker.map((c) => (
                    <Link
                      key={c.id}
                      href={`/nav/messages?with=${c.id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-3)',
                        padding: 'var(--space-3)',
                        borderRadius: '10px',
                        background:
                          withUserId === c.id
                            ? 'rgba(59, 130, 246, 0.15)'
                            : 'rgba(255,255,255,0.03)',
                        textDecoration: 'none',
                        color: 'inherit',
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          flexShrink: 0,
                          borderRadius: '50%',
                          background: 'rgba(34, 197, 94, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <User size={16} />
                      </div>
                      <div
                        style={{
                          fontWeight: 600,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: 1,
                        }}
                      >
                        {c.name}
                      </div>
                      <ChevronRight size={16} style={{ opacity: 0.5, flexShrink: 0 }} />
                    </Link>
                  ))
                )}
              </div>
              {showMessagesPickerSearch ? (
                <input
                  type="search"
                  value={messagesContactSearch}
                  onChange={(e) => setMessagesContactSearch(e.target.value)}
                  placeholder={t('messagesPickerSearchPlaceholder')}
                  aria-label={t('messagesPickerSearchAria')}
                  autoComplete="off"
                  style={{
                    width: '100%',
                    marginTop: 2,
                    padding: '5px 9px',
                    fontSize: '0.78rem',
                    lineHeight: 1.35,
                    borderRadius: 8,
                    border: '1px solid var(--border-subtle)',
                    background: 'rgba(255,255,255,0.035)',
                    color: 'var(--text-main)',
                    opacity: 0.92,
                    boxSizing: 'border-box',
                  }}
                />
              ) : null}
            </div>
          </aside>
  )
}
