'use client'

import { useToast } from '@/app/components/design-system'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bell,
  CheckCircle2,
  Clock,
  MessageSquare,
  ShieldCheck,
  FileText,
  User,
  Trash2,
  Info,
  AlertTriangle,
  Send,
  Home,
  Receipt,
} from 'lucide-react'
import { getAuthUserDeduped, supabase } from '../../lib/supabase'
import { devWarn } from '@/app/lib/appLogger'
import { formatDateTimeNo } from '../../lib/dateFormat'
import { useLanguage } from '../../../context/LanguageContext'
import { isKommuneStaffRole } from '../../lib/kommuneRoles'
import { getOverviewBackLink } from '../../lib/overviewBackNav'
import { useLandlordNavGateQuery } from '../../hooks/useLandlordNavGateQuery'
import type { NotificationsListPayload } from '../../lib/queries/notificationsListQuery'
import {
  fetchNotificationsList,
  notificationsListQueryKey,
} from '../../lib/queries/notificationsListQuery'
import { kommuneNotificationSiblingIds } from '../../lib/notificationSiblings'
import { setNotificationStatus } from '../../lib/setNotificationStatus'
import { QK } from '../../lib/queries/queryKeys'
import { landlordOnboardingKey, LANDLORD_ONBOARDING_PREFIX } from '../../lib/landlordOnboarding'
import LoadingPlaceholder from '../../components/LoadingPlaceholder'

const PushPermissionCard = dynamic(() => import('../../components/PushPermissionCard'), {
  ssr: false,
})

const LandlordOnboardingModal = dynamic(() => import('../../components/LandlordOnboardingModal'), {
  ssr: false,
})

export default function NavNotifications() {
  const { t } = useLanguage()
  const toast = useToast()
  const pathname = usePathname()
  const queryClient = useQueryClient()
  const gateQ = useLandlordNavGateQuery()
  const gateReady = gateQ.data?.kind === 'ready'
  const gateData = gateQ.data
  const roleFromGate =
    gateData?.kind === 'ready'
      ? gateData.profile?.role ??
        (gateData.user.user_metadata?.role as string | undefined) ??
        null
      : null
  const userIdFromGate = gateData?.kind === 'ready' ? gateData.user.id : null
  const listQ = useQuery({
    queryKey: notificationsListQueryKey,
    queryFn: () => fetchNotificationsList(queryClient),
    enabled: gateReady,
    staleTime: 30_000,
    gcTime: 10 * 60 * 1000,
  })
  const listPayload = listQ.data
  const notifications = listPayload?.rows ?? []
  const listPending = listQ.isPending
  const role = listPayload?.role ?? roleFromGate
  const currentUserId = listPayload?.userId ?? userIdFromGate
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(false)
  const [emailPrefSaving, setEmailPrefSaving] = useState(false)
  const [showLandlordNotificationsIntro, setShowLandlordNotificationsIntro] = useState(false)

  useEffect(() => {
    if (listPayload != null) {
      setEmailNotificationsEnabled(listPayload.emailNotificationsEnabled)
      return
    }
    if (gateData?.kind === 'ready' && gateData.profile) {
      setEmailNotificationsEnabled(gateData.profile.email_notifications_enabled === true)
    }
  }, [listPayload, gateData])

  useEffect(() => {
    if (!gateReady) return
    if (listPending || !currentUserId) return
    if (role == null) return
    if (isKommuneStaffRole(role)) return
    if (typeof window === 'undefined') return
    const key = landlordOnboardingKey(LANDLORD_ONBOARDING_PREFIX.notifications, currentUserId)
    if (!localStorage.getItem(key)) setShowLandlordNotificationsIntro(true)
  }, [gateReady, listPending, currentUserId, role])

  const dismissLandlordNotificationsIntro = () => {
    if (currentUserId && typeof window !== 'undefined') {
      localStorage.setItem(
        landlordOnboardingKey(LANDLORD_ONBOARDING_PREFIX.notifications, currentUserId),
        '1'
      )
    }
    setShowLandlordNotificationsIntro(false)
  }

  const handleStatusChange = async (id: string, newStatus: 'unread' | 'completed') => {
    const previous = queryClient.getQueryData<NotificationsListPayload | null>(
      notificationsListQueryKey
    )
    const user = await getAuthUserDeduped()
    const resolverId = newStatus === 'completed' ? (user?.id ?? 'me') : null
    const target = previous?.rows.find((n) => n.id === id)
    const isKommuneStaff = isKommuneStaffRole(role)
    const siblingIds = new Set(
      target && isKommuneStaff
        ? target.event_id
          ? (previous?.rows ?? [])
              .filter((n) => n.event_id === target.event_id)
              .map((n) => n.id)
          : kommuneNotificationSiblingIds(previous?.rows ?? [], target)
        : [id]
    )
    const resolvedAt = newStatus === 'completed' ? new Date().toISOString() : null

    queryClient.setQueryData<NotificationsListPayload | null>(
      notificationsListQueryKey,
      (prev) => {
        if (!prev) return prev
        return {
          ...prev,
          rows: prev.rows.map((n) =>
            siblingIds.has(n.id)
              ? {
                  ...n,
                  status: newStatus,
                  resolved_by: resolverId,
                  resolved_at: resolvedAt,
                }
              : n
          ),
        }
      }
    )
    try {
      const result = await setNotificationStatus(id, newStatus)
      if (!result.ok) throw new Error(result.error)
      if (isKommuneStaff && result.updated < 2) {
        devWarn(
          `[notifications] expected shared update for kommune event, got updated=${result.updated}`
        )
      }
      void queryClient.invalidateQueries({ queryKey: QK.headerBundle })
      void queryClient.invalidateQueries({ queryKey: QK.notificationsList })
    } catch (err: any) {
      queryClient.setQueryData(notificationsListQueryKey, previous)
      toast(t('errNotificationUpdate') + err.message, 'error')
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'NEW_MESSAGE':
        return <MessageSquare size={18} />
      case 'NEW_REPORT':
        return <FileText size={18} />
      case 'TERMS_SIGNED':
        return <ShieldCheck size={18} />
      case 'AGREEMENT_ENDED':
        return <AlertTriangle size={18} />
      case 'HOUSE_FORMIDLET':
        return <Home size={18} />
      case 'FAKTURAGRUNNLAG_REQUEST':
        return <Receipt size={18} />
      case 'HANDOVER_REMINDER':
        return <AlertTriangle size={18} />
      case 'LANDLORD_RESIGN_REQUEST':
        return <Send size={18} />
      case 'RESIGN_REQUEST_APPROVED':
      case 'RESIGN_REQUEST_REJECTED':
        return <ShieldCheck size={18} />
      default:
        return <Bell size={18} />
    }
  }

  if (gateQ.isError) {
    return (
      <main className="container" style={{ padding: 'var(--space-8)', maxWidth: 560 }}>
        <p style={{ color: 'var(--text-body)', marginBottom: 'var(--space-4)', lineHeight: 1.5 }}>
          {t('manageDataLoadTimeout')}
        </p>
        <button type="button" className="button" onClick={() => void gateQ.refetch()}>
          {t('retryLoad')}
        </button>
      </main>
    )
  }

  if (!gateReady) {
    return (
      <main className="container">
        <LoadingPlaceholder minHeight={200} />
      </main>
    )
  }

  const overviewBack = getOverviewBackLink(pathname, role, t)

  return (
    <main className="container">
      <LandlordOnboardingModal
        open={showLandlordNotificationsIntro}
        title={t('landlordNotificationsTitle')}
        titleId="landlord-notifications-intro-title"
        onDismiss={dismissLandlordNotificationsIntro}
        ctaLabel={t('landlordNotificationsCta')}
        icon={Bell}
        iconAccent="blue"
        skipLinkLabel={t('onboardingSkipIntro')}
        onSkip={dismissLandlordNotificationsIntro}
      >
        <p
          style={{
            margin: '0 0 var(--space-4)',
            fontSize: '1rem',
            color: 'var(--text-body)',
            lineHeight: 1.55,
          }}
        >
          {t('landlordNotificationsLead')}
        </p>
        <ul
          style={{
            margin: '0 0 var(--space-5)',
            paddingLeft: '1.25rem',
            color: 'var(--text-body)',
            lineHeight: 1.65,
            fontSize: '0.95rem',
          }}
        >
          <li style={{ marginBottom: 'var(--space-2)' }}>{t('landlordNotificationsBullet1')}</li>
          <li style={{ marginBottom: 'var(--space-2)' }}>{t('landlordNotificationsBullet2')}</li>
          <li>{t('landlordNotificationsBullet3')}</li>
        </ul>
        <div
          style={{
            marginBottom: 'var(--space-6)',
            padding: 'var(--space-4)',
            borderRadius: 12,
            background: 'rgba(45, 212, 191, 0.1)',
            border: '1px solid rgba(45, 212, 191, 0.28)',
          }}
        >
          <h2
            style={{
              margin: '0 0 var(--space-2)',
              fontSize: '0.85rem',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--color-teal)',
            }}
          >
            {t('landlordNotificationsExpectTitle')}
          </h2>
          <p
            style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: 1.55 }}
          >
            {t('landlordNotificationsExpectBody')}
          </p>
        </div>
      </LandlordOnboardingModal>

      <div
        style={{
          marginBottom: 'var(--space-8)',
          width: '100%',
          maxWidth: 'min(900px, 100%)',
          paddingLeft: 'max(0px, env(safe-area-inset-left))',
          paddingRight: 'max(0px, env(safe-area-inset-right))',
        }}
      >
        {overviewBack && (
          <Link
            href={overviewBack.href}
            className="nav-link"
            style={{
              marginLeft: '-1rem',
              marginBottom: 'var(--space-2)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
            }}
          >
            ← {overviewBack.label}
          </Link>
        )}
        <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2.75rem)' }}>{t('notifications')}</h1>
        <p style={{ fontSize: 'clamp(0.95rem, 3vw, 1.125rem)', opacity: 0.8, lineHeight: 1.5 }}>
          {role === 'kommune_ansatt' || role === 'kommune_admin'
            ? t('notificationsSharedDesc')
            : t('notificationsUserDesc')}
        </p>
      </div>

      <PushPermissionCard />

      <div
        className="card"
        style={{
          padding: 'var(--space-5)',
          marginBottom: 'var(--space-6)',
          width: '100%',
          maxWidth: 'min(640px, 100%)',
          boxSizing: 'border-box',
        }}
      >
        <label
          htmlFor="notifications-email-enabled"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 'var(--space-3)',
            cursor: 'pointer',
          }}
        >
          <input
            id="notifications-email-enabled"
            name="email_notifications_enabled"
            type="checkbox"
            checked={emailNotificationsEnabled}
            disabled={emailPrefSaving}
            onChange={async (e) => {
              const v = e.target.checked
              setEmailNotificationsEnabled(v)
              setEmailPrefSaving(true)
              try {
                const u = await getAuthUserDeduped()
                if (!u) return
                const { error } = await supabase
                  .from('profiles')
                  .update({ email_notifications_enabled: v })
                  .eq('id', u.id)
                if (error) throw error
              } catch (err: any) {
                setEmailNotificationsEnabled(!v)
                toast(err?.message || t('notificationsSaveSettingError'), 'error')
              } finally {
                setEmailPrefSaving(false)
              }
            }}
            style={{ width: 18, height: 18, marginTop: 2, flexShrink: 0 }}
          />
          <span>
            <span style={{ fontWeight: 600, color: 'var(--text-main)', display: 'block' }}>
              {t('emailNotificationsToggle')}
            </span>
            <span
              style={{
                fontSize: '0.85rem',
                color: 'var(--text-muted)',
                display: 'block',
                marginTop: 4,
              }}
            >
              {t('emailNotificationsHint')}
            </span>
          </span>
        </label>
      </div>

      {listPending ? (
        <LoadingPlaceholder minHeight={200} />
      ) : listQ.isError ? (
        <div
          className="card"
          style={{
            padding: 'var(--space-6)',
            marginBottom: 'var(--space-6)',
            maxWidth: 'min(640px, 100%)',
          }}
        >
          <p style={{ color: 'var(--text-body)', marginBottom: 'var(--space-4)', lineHeight: 1.5 }}>
            {t('manageDataLoadTimeout')}
          </p>
          <button type="button" className="button" onClick={() => void listQ.refetch()}>
            {t('retryLoad')}
          </button>
        </div>
      ) : notifications.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gap: 'var(--space-4)',
            gridTemplateColumns: 'minmax(0, 1fr)',
          }}
        >
          {notifications.map((notif) => {
            const isFormidletNotif =
              (notif.type === 'HOUSE_FORMIDLET' || notif.type === 'HANDOVER_REMINDER') &&
              notif.listing_id
            const isInvoiceBasisNotif = notif.type === 'FAKTURAGRUNNLAG_REQUEST' && notif.listing_id
            const messageLink =
              notif.type === 'NEW_MESSAGE'
                ? (role === 'kommune_ansatt' || role === 'kommune_admin') && notif.related_user_id
                  ? `/nav/messages?with=${notif.related_user_id}`
                  : '/nav/messages'
                : notif.type === 'LANDLORD_RESIGN_REQUEST' &&
                    (role === 'kommune_ansatt' || role === 'kommune_admin') &&
                    notif.related_user_id
                  ? `/nav/users?id=${notif.related_user_id}`
                : !isFormidletNotif &&
                    notif.type === 'NEW_REPORT' &&
                    notif.listing_id &&
                    (role === 'kommune_ansatt' || role === 'kommune_admin')
                  ? `/listings/${notif.listing_id}?view=nav#overtakelsesrapport`
                  : null
            const cardContent = (
              <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background:
                      notif.status === 'unread'
                        ? 'rgba(59, 130, 246, 0.1)'
                        : 'rgba(32, 187, 175, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: notif.status === 'unread' ? 'var(--color-accent)' : 'var(--color-teal)',
                  }}
                >
                  {getIcon(notif.type)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>
                    {notif.title}
                  </h3>
                  <p
                    style={{
                      margin: '4px 0 0',
                      color: 'var(--text-body)',
                      lineHeight: 1.5,
                      wordBreak: 'break-word',
                    }}
                  >
                    {notif.message}
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      gap: 'var(--space-4)',
                      marginTop: '10px',
                      fontSize: '0.85rem',
                      color: 'var(--text-muted)',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> {formatDateTimeNo(notif.created_at)}
                    </span>
                    {notif.resolved_by && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={12} />
                        {(role === 'kommune_ansatt' || role === 'kommune_admin') &&
                        notif.resolved_by !== currentUserId
                          ? t('resolvedByColleague')
                          : t('resolvedByYou')}
                      </span>
                    )}
                    {messageLink && !isFormidletNotif && (
                      <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
                        →{' '}
                        {notif.type === 'NEW_REPORT'
                          ? t('viewReport')
                          : notif.type === 'LANDLORD_RESIGN_REQUEST'
                            ? t('notifGoToUserProfile')
                            : t('goToMessage')}
                      </span>
                    )}
                  </div>
                  {isFormidletNotif && (
                    <div
                      style={{
                        display: 'flex',
                        gap: 'var(--space-2)',
                        marginTop: 'var(--space-3)',
                        flexWrap: 'wrap',
                      }}
                    >
                      <Link
                        href={`/listings/${notif.listing_id}?view=owner#kontaktinfo`}
                        className="button"
                        style={{
                          padding: '6px 12px',
                          fontSize: '0.8rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          textDecoration: 'none',
                        }}
                      >
                        <FileText size={14} /> {t('contactInfoForm')}
                      </Link>
                      <Link
                        href={`/report/utleier/${notif.listing_id}`}
                        className="button"
                        style={{
                          padding: '6px 12px',
                          fontSize: '0.8rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          textDecoration: 'none',
                          background: 'var(--color-teal)',
                          color: 'white',
                          border: 'none',
                        }}
                      >
                        <FileText size={14} /> {t('fillHandoverReport')}
                      </Link>
                    </div>
                  )}
                  {isInvoiceBasisNotif && (
                    <div
                      style={{
                        display: 'flex',
                        gap: 'var(--space-2)',
                        marginTop: 'var(--space-3)',
                        flexWrap: 'wrap',
                      }}
                    >
                      <Link
                        href={`/listings/${notif.listing_id}?view=owner#fakturagrunnlag`}
                        scroll={false}
                        className="button notif-invoice-basis-link"
                        style={{
                          padding: '6px 12px',
                          fontSize: '0.8rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          textDecoration: 'none',
                          background: 'var(--color-royal-blue)',
                          color: 'white',
                          border: 'none',
                          minHeight: 'var(--touch-target, 44px)',
                        }}
                      >
                        <Receipt size={14} /> {t('invoiceBasisOpenForm')}
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )
            return (
              <div
                key={notif.id}
                className={`card notif-card ${notif.status}`}
                style={{
                  padding: 'var(--space-6)',
                  opacity: notif.status === 'completed' ? 0.88 : 1,
                  borderLeft: `4px solid ${notif.status === 'unread' ? 'var(--color-accent)' : 'var(--color-teal)'}`,
                  transition: 'all 0.2s',
                }}
              >
                <div className="notif-card-inner">
                  {messageLink && !isFormidletNotif ? (
                    <Link
                      href={messageLink}
                      style={{ flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit' }}
                    >
                      {cardContent}
                    </Link>
                  ) : (
                    <div style={{ flex: 1, minWidth: 0, width: '100%' }}>{cardContent}</div>
                  )}
                  <div
                    className="notif-card-actions"
                    style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {notif.status === 'unread' ? (
                      <button
                        onClick={() => handleStatusChange(notif.id, 'completed')}
                        className="button"
                        style={{
                          padding: '8px 16px',
                          background: 'var(--color-teal)',
                          color: 'white',
                        }}
                      >
                        {t('markDone')}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStatusChange(notif.id, 'unread')}
                        className="button button-secondary"
                        style={{ padding: '8px 16px', fontWeight: 500 }}
                      >
                        {t('markUnread')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-10)' }}>
          <Info
            size={40}
            className="empty-state-icon"
            style={{ margin: '0 auto var(--space-3)' }}
          />
          <p>{t('noNotifications')}</p>
        </div>
      )}

      <style jsx>{`
        .notif-card-inner {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: var(--space-3);
        }
        .notif-card-actions {
          align-self: flex-start;
        }
        @media (max-width: 900px) {
          .notif-card-inner {
            flex-direction: column;
            align-items: stretch;
          }
          .notif-card-actions {
            align-self: stretch;
            justify-content: stretch;
            width: 100%;
            margin-top: var(--space-2);
          }
          .notif-card-actions button {
            flex: 1;
            min-height: var(--touch-target, 44px);
          }
          .notif-invoice-basis-link {
            width: 100%;
            justify-content: center;
            box-sizing: border-box;
          }
        }
        /* Trange skjermer (eldre iPhone, små Android): kortet får 48px luft i alle
           retninger fra inline-stilen, som spiser hele 320px-viewporten. Reduserer
           luft + lar grid-itemet krympe under min-content. */
        @media (max-width: 480px) {
          .notif-card {
            padding: var(--space-3) !important;
            min-width: 0;
          }
        }
        .notif-card.unread {
          background: rgba(59, 130, 246, 0.02);
        }
        .notif-card.unread:hover {
          background: rgba(59, 130, 246, 0.05);
        }
      `}</style>
    </main>
  )
}
