'use client'

import { useToast } from '@/app/components/design-system'
import { useState, useEffect, useRef, useMemo } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  MessageSquare,
  ArrowLeft,
  User,
  ChevronRight,
  Users,
  MessageCircle,
  Home,
} from 'lucide-react'
import { supabase } from '@/app/lib/supabase'
import { formatDateTimeNo } from '@/app/lib/dateFormat'
import { useLanguage } from '@/context/LanguageContext'
import { isKommuneStaffRole } from '@/app/lib/kommuneRoles'
import { landlordOnboardingKey, LANDLORD_ONBOARDING_PREFIX } from '@/app/lib/landlordOnboarding'
import LoadingPlaceholder from '@/app/components/LoadingPlaceholder'
import { usePlatformMode } from '@/context/PlatformModeContext'
import { useChatUserBootstrap } from '@/app/hooks/useChatUserBootstrap'
import ChatComposer, { MAX_IMAGES_PER_MESSAGE } from '@/features/messaging/components/ChatComposer'
import ChatMessageBubble from '@/features/messaging/components/ChatMessageBubble'
import GuestBookingChatPanel from '@/features/messaging/components/GuestBookingChatPanel'
import MessageQuickRepliesPanel from '@/features/messaging/components/MessageQuickRepliesPanel'
import {
  sendEventCaseworkerBroadcast,
  sendSocialCaseworkerMessage,
} from '@/features/messaging/lib/chatSend'
import { channelBadgeEmoji } from '@/app/lib/messageChannelLabels'
import { useNavMessagesThreads } from '@/features/messaging/hooks/useNavMessagesThreads'
import { useNavMessagesRealtimeChat } from '@/features/messaging/hooks/useNavMessagesRealtimeChat'
import NavMessagesKommuneSidebar from '@/features/messaging/components/NavMessagesKommuneSidebar'
import NavMessagesLandlordSidebar from '@/features/messaging/components/NavMessagesLandlordSidebar'

const LandlordOnboardingModal = dynamic(() => import('@/app/components/LandlordOnboardingModal'), {
  ssr: false,
})

import type {
  ConversationRow,
  LandlordAreaThread,
  LandlordEventThread,
  GuestBookingThread,
} from '@/features/messaging/types/navMessages'

export default function NavMessagesPage() {
  const { t, locale } = useLanguage()
  const toast = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const withUserId = searchParams.get('with')
  const withAreaId = searchParams.get('area')
  const withBookingId = searchParams.get('booking')
  const withEventId = searchParams.get('event')

  const chatBoot = useChatUserBootstrap()
  const bootOk = chatBoot.data?.kind === 'ok' ? chatBoot.data : null
  const currentUser = bootOk?.user ?? null
  const role = bootOk?.role ?? null
  const kommuneCanEdit = bootOk?.kommuneCanEdit ?? true
  const myKommuneRegion = bootOk?.myKommuneRegion ?? null
  const profileResolved = Boolean(bootOk)
  const isKommune = role === 'kommune_ansatt' || role === 'kommune_admin'

  const {
    loading,
    conversationsLoading,
    conversations,
    landlordAreaThreads,
    landlordEventThreads,
    guestBookingThreads,
    colleagues,
    landlordAccounts,
  } = useNavMessagesThreads({
    profileResolved,
    currentUser,
    isKommune,
    myKommuneRegion,
    withUserId,
    withAreaId,
    kommuneCanEdit,
  })

  const { messages, setMessages, otherUser, threadSenderLabelById } = useNavMessagesRealtimeChat({
    profileResolved,
    currentUser,
    isKommune,
    withUserId,
    withAreaId,
    withEventId,
    conversations,
    landlordAreaThreads,
    landlordEventThreads,
    bootUserId: bootOk?.user?.id,
  })

  const [newMessage, setNewMessage] = useState('')
  const [pendingImages, setPendingImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [sending, setSending] = useState(false)
  const [landlordMessagesTab, setLandlordMessagesTab] = useState<'social' | 'event' | 'guest'>('social')
  const [peerRole, setPeerRole] = useState<string | null>(null)
  const [showLandlordMessagesIntro, setShowLandlordMessagesIntro] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const { flags: platformFlags } = usePlatformMode()
  const [messagesPickerTab, setMessagesPickerTab] = useState<'landlords' | 'staff' | 'los'>('landlords')
  const [messagesContactSearch, setMessagesContactSearch] = useState('')
  const messagesScrollRef = useRef<HTMLDivElement>(null)
  const losInMessagesEnabled = isKommune && platformFlags.los
  const peerIsKommuneColleague = peerRole === 'kommune_ansatt' || peerRole === 'kommune_admin'
  const readonlyBlocksReply =
    isKommune &&
    kommuneCanEdit === false &&
    !!withUserId &&
    (peerRole === null || !peerIsKommuneColleague)

  const activeServiceAreaId = withAreaId

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const sync = () => setIsMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (!profileResolved || !isKommune || !withUserId || withAreaId) return
    let cancelled = false
    void (async () => {
      const { data, error } = await supabase.rpc('resolve_staff_landlord_thread_area', {
        p_landlord_id: withUserId,
      })
      if (cancelled || error || !data) return
      router.replace(`/nav/messages?with=${withUserId}&area=${data}`)
    })()
    return () => {
      cancelled = true
    }
  }, [profileResolved, isKommune, withUserId, withAreaId, router])

  useEffect(() => {
    if (!profileResolved || isKommune || withAreaId || withBookingId || landlordAreaThreads.length !== 1)
      return
    if (guestBookingThreads.length > 0) return
    router.replace(`/nav/messages?area=${landlordAreaThreads[0].serviceAreaId}`)
  }, [
    profileResolved,
    isKommune,
    withAreaId,
    withBookingId,
    landlordAreaThreads,
    guestBookingThreads,
    router,
  ])

  useEffect(() => {
    if (withBookingId) setLandlordMessagesTab('guest')
    if (withEventId) setLandlordMessagesTab('event')
  }, [withBookingId, withEventId])

  useEffect(() => {
    if (!profileResolved) return
    if (!isKommune || !withUserId) {
      setPeerRole(null)
      return
    }
    supabase
      .from('profiles')
      .select('role')
      .eq('id', withUserId)
      .maybeSingle()
      .then(({ data }) => setPeerRole(data?.role ?? null))
  }, [profileResolved, isKommune, withUserId])

  useEffect(() => {
    if (!currentUser || loading) return
    if (role == null) return
    if (isKommuneStaffRole(role)) return
    if (typeof window === 'undefined') return
    const key = landlordOnboardingKey(LANDLORD_ONBOARDING_PREFIX.messages, currentUser.id)
    if (!localStorage.getItem(key)) setShowLandlordMessagesIntro(true)
  }, [currentUser, loading, role])

  useEffect(() => {
    if (!currentUser) return
    const inChat = isKommune ? !!withUserId : true
    if (!inChat) return
    const el = messagesScrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, currentUser, withUserId, isKommune, isMobile])

  const handleImageSelect = (valid: File[]) => {
    const total = pendingImages.length + valid.length
    if (total > MAX_IMAGES_PER_MESSAGE) {
      setPendingImages((prev) => prev.concat(valid.slice(0, MAX_IMAGES_PER_MESSAGE - prev.length)))
      setImagePreviews((prev) => {
        const next = [...prev]
        valid.slice(0, MAX_IMAGES_PER_MESSAGE - pendingImages.length).forEach((f) => {
          next.push(URL.createObjectURL(f))
        })
        return next
      })
    } else {
      setPendingImages((prev) => prev.concat(valid))
      setImagePreviews((prev) => [...prev, ...valid.map((f) => URL.createObjectURL(f))])
    }
  }

  const removePendingImage = (index: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== index))
    setImagePreviews((prev) => {
      URL.revokeObjectURL(prev[index])
      return prev.filter((_, i) => i !== index)
    })
  }

  const sendMessage = async () => {
    const content = newMessage.trim()
    const hasImages = pendingImages.length > 0
    if ((!content && !hasImages) || !currentUser) return
    if (readonlyBlocksReply) return
    if (!isKommune && withEventId) {
      setSending(true)
      try {
        const row = await sendEventCaseworkerBroadcast({
          senderId: currentUser.id,
          eventId: withEventId,
          content: content || '',
        })
        setNewMessage('')
        setMessages((prev) => [...prev, row])
      } catch (err: unknown) {
        toast(t('errSend') + (err instanceof Error ? err.message : String(err)))
      } finally {
        setSending(false)
      }
      return
    }
    if (!activeServiceAreaId) return
    setSending(true)
    let effectiveReceiver: string | null = withUserId ?? null
    /** DB-trigger varsler kommune når receiver_id er null (delt kanal). */
    let notifyUserIds: string[] = []
    if (!isKommune) {
      effectiveReceiver = null
      notifyUserIds = []
    } else if (effectiveReceiver) {
      notifyUserIds = [effectiveReceiver]
    }
    const imagesToSend = [...pendingImages]
    try {
      const senderName =
        currentUser.user_metadata?.full_name ||
        currentUser.email?.split('@')[0] ||
        (isKommune ? 'Kommune' : 'En utleier')
      const row = await sendSocialCaseworkerMessage({
        senderId: currentUser.id,
        senderName,
        content: content || '',
        serviceAreaId: activeServiceAreaId,
        receiverId: effectiveReceiver,
        notifyUserIds,
        pendingImages: imagesToSend,
      })
      setNewMessage('')
      if (imagesToSend.length > 0) {
        setPendingImages([])
        setImagePreviews((prev) => {
          prev.forEach(URL.revokeObjectURL)
          return []
        })
      }
      setMessages((prev) => [...prev, row])
    } catch (err: unknown) {
      toast(t('errSend') + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSending(false)
    }
  }

  const landlordsWithoutThread = useMemo(
    () => landlordAccounts.filter((l) => !conversations.some((c) => c.userId === l.id)),
    [landlordAccounts, conversations]
  )

  if (chatBoot.isPending) {
    return (
      <main className="container">
        <LoadingPlaceholder minHeight={400} />
      </main>
    )
  }

  if (chatBoot.isError) {
    return (
      <main className="container" style={{ padding: 'var(--space-8)', maxWidth: 560 }}>
        <p style={{ color: 'var(--text-body)', marginBottom: 'var(--space-4)', lineHeight: 1.5 }}>
          {t('manageDataLoadTimeout')}
        </p>
        <button type="button" className="button" onClick={() => void chatBoot.refetch()}>
          {t('retryLoad')}
        </button>
      </main>
    )
  }

  if (!bootOk) {
    return (
      <main className="container">
        <LoadingPlaceholder minHeight={400} />
      </main>
    )
  }

  /** Kun-les trenger sidestolpe også når en samtale er åpen (kollegaer + bytte tråd). Full redigering beholder én kolonne i aktiv chat. */
  const showKommuneSidebar = isKommune && (!withUserId || kommuneCanEdit === false)
  const showGuestBookingChat = !isKommune && !!withBookingId
  const showLandlordEventChat = !isKommune && !!withEventId
  const showLandlordMessagesSidebar =
    !isKommune &&
    !withAreaId &&
    !withBookingId &&
    !withEventId &&
    (landlordAreaThreads.length > 0 ||
      landlordEventThreads.length > 0 ||
      guestBookingThreads.length > 0)
  const showLandlordAreaSidebar = showLandlordMessagesSidebar
  const kommuneMobileListOnly = isKommune && isMobile && !withUserId
  const kommuneMobileChatOnly = isKommune && isMobile && !!withUserId
  const landlordMobileListOnly =
    !isKommune && isMobile && !withAreaId && !withBookingId && !withEventId && showLandlordMessagesSidebar
  const landlordMobileChatOnly = !isKommune && isMobile && (!!withAreaId || !!withBookingId || !!withEventId)
  const showChat =
    showGuestBookingChat ||
    showLandlordEventChat ||
    (isKommune
      ? withUserId && !!withAreaId
      : !!withAreaId ||
        !!withEventId ||
        (landlordAreaThreads.length <= 1 &&
          landlordEventThreads.length === 0 &&
          guestBookingThreads.length === 0))

  const showReadonlyBanner =
    isKommune &&
    kommuneCanEdit === false &&
    !!withUserId &&
    peerRole !== null &&
    !(peerRole === 'kommune_ansatt' || peerRole === 'kommune_admin')
  const inputDisabled = sending || readonlyBlocksReply

  const dismissLandlordMessagesIntro = async () => {
    if (currentUser && typeof window !== 'undefined') {
      localStorage.setItem(
        landlordOnboardingKey(LANDLORD_ONBOARDING_PREFIX.messages, currentUser.id),
        '1'
      )
    }
    setShowLandlordMessagesIntro(false)
  }

  const backHref =
    isKommune && withUserId
      ? '/nav/messages'
      : isKommune
        ? '/nav/database'
        : '/homeowner/manage'

  const contactPickerQuery = messagesContactSearch.trim().toLowerCase()
  const filteredLandlordsForPicker = contactPickerQuery
    ? landlordsWithoutThread.filter((l) => l.name.toLowerCase().includes(contactPickerQuery))
    : landlordsWithoutThread
  const filteredColleaguesForPicker = contactPickerQuery
    ? colleagues.filter((c) => c.name.toLowerCase().includes(contactPickerQuery))
    : colleagues
  const showMessagesPickerSearch =
    (messagesPickerTab === 'landlords' && landlordsWithoutThread.length > 0) ||
    (messagesPickerTab === 'staff' && colleagues.length > 0)
  const compactMobileChat = kommuneMobileChatOnly || landlordMobileChatOnly || (!isKommune && isMobile && !!withAreaId)
  const formatMessageTimestamp = (value: string | Date | null | undefined) => {
    if (!isMobile) return formatDateTimeNo(value)
    const d = new Date(String(value ?? ''))
    if (Number.isNaN(d.getTime())) return formatDateTimeNo(value)
    return d.toLocaleTimeString(locale === 'no' ? 'nb-NO' : locale === 'se' ? 'se-SE' : 'en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  const currentUserDisplayName =
    currentUser?.user_metadata?.full_name?.trim?.() ||
    currentUser?.email?.split('@')[0] ||
    'Ukjent bruker'
  const senderLabelForMessage = (message: { sender_id?: string | null }) => {
    const senderId = message.sender_id
    if (!senderId) return null
    if (threadSenderLabelById[senderId]) return threadSenderLabelById[senderId]
    if (senderId === bootOk.user.id) return currentUserDisplayName
    if (withUserId && senderId === withUserId) return otherUser?.name || 'Ukjent bruker'
    return null
  }

  return (
    <main
      className="container"
      style={
        compactMobileChat
          ? {
              display: 'flex',
              flexDirection: 'column',
              minHeight: 'calc(100dvh - 72px)',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }
          : undefined
      }
    >
      <LandlordOnboardingModal
        open={showLandlordMessagesIntro}
        title={t('landlordMessagesTitle')}
        titleId="landlord-messages-intro-title"
        onDismiss={() => void dismissLandlordMessagesIntro()}
        ctaLabel={t('landlordMessagesCta')}
        icon={MessageSquare}
        iconAccent="sky"
        skipLinkLabel={t('onboardingSkipIntro')}
        onSkip={() => void dismissLandlordMessagesIntro()}
      >
        <p
          style={{
            margin: '0 0 var(--space-4)',
            fontSize: '1rem',
            color: 'var(--text-body)',
            lineHeight: 1.55,
          }}
        >
          {t('landlordMessagesLead')}
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
          <li style={{ marginBottom: 'var(--space-2)' }}>{t('landlordMessagesBullet1')}</li>
          <li style={{ marginBottom: 'var(--space-2)' }}>{t('landlordMessagesBullet2')}</li>
          <li>{t('landlordMessagesBullet3')}</li>
        </ul>
        <div
          style={{
            marginBottom: 'var(--space-6)',
            padding: 'var(--space-4)',
            borderRadius: 12,
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.22)',
          }}
        >
          <h2
            style={{
              margin: '0 0 var(--space-2)',
              fontSize: '0.85rem',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--color-accent)',
            }}
          >
            {t('landlordMessagesExpectTitle')}
          </h2>
          <p
            style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: 1.55 }}
          >
            {t('landlordMessagesExpectBody')}
          </p>
        </div>
      </LandlordOnboardingModal>

      <div style={{ marginBottom: compactMobileChat ? 'var(--space-4)' : 'var(--space-6)', flexShrink: 0 }}>
        <Link
          href={backHref}
          className="nav-link"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginLeft: '-1rem' }}
        >
          <ArrowLeft size={18} /> {t('back')}
        </Link>
        <h1 style={{ fontSize: 'clamp(1.35rem, 4.6vw, 2rem)', marginTop: 'var(--space-2)' }}>
          {t('messages')}
        </h1>
        {!compactMobileChat && (
          <p
            role="note"
            style={{
              marginTop: 'var(--space-2)',
              marginBottom: 0,
              maxWidth: '42rem',
              fontSize: '0.8125rem',
              lineHeight: 1.5,
              color: 'var(--text-muted)',
            }}
          >
            {t('messagesSensitiveDataNotice')}
          </p>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: kommuneMobileListOnly || landlordMobileListOnly
            ? '1fr'
            : kommuneMobileChatOnly || landlordMobileChatOnly
              ? '1fr'
              : showKommuneSidebar || showLandlordAreaSidebar
                ? 'minmax(280px, 340px) 1fr'
                : '1fr',
          gap: 'var(--space-6)',
          minHeight: compactMobileChat ? 'min(520px, calc(100dvh - 220px))' : '400px',
          flex: compactMobileChat ? '1 1 auto' : undefined,
          minWidth: 0,
        }}
      >
        {showKommuneSidebar && !kommuneMobileChatOnly && (
        <NavMessagesKommuneSidebar
          conversationsLoading={conversationsLoading}
          conversations={conversations}
          withUserId={withUserId}
          withAreaId={withAreaId}
          messagesPickerTab={messagesPickerTab}
          onMessagesPickerTabChange={setMessagesPickerTab}
          messagesContactSearch={messagesContactSearch}
          onMessagesContactSearchChange={setMessagesContactSearch}
          losInMessagesEnabled={losInMessagesEnabled}
          filteredLandlordsForPicker={filteredLandlordsForPicker}
          filteredColleaguesForPicker={filteredColleaguesForPicker}
          landlordAccounts={landlordAccounts}
          colleagues={colleagues}
          showMessagesPickerSearch={showMessagesPickerSearch}
          landlordsWithoutThread={landlordsWithoutThread}
          t={t}
        />
        )}
        {showLandlordAreaSidebar && !landlordMobileChatOnly && (
          <NavMessagesLandlordSidebar
            landlordMessagesTab={landlordMessagesTab}
            onLandlordMessagesTabChange={setLandlordMessagesTab}
            conversationsLoading={conversationsLoading}
            guestBookingThreads={guestBookingThreads}
            landlordEventThreads={landlordEventThreads}
            landlordAreaThreads={landlordAreaThreads}
            withBookingId={withBookingId}
            withEventId={withEventId}
            withAreaId={withAreaId}
            t={t}
          />
        )}

        <div
          className="card"
          style={{
            display: kommuneMobileListOnly || landlordMobileListOnly ? 'none' : 'flex',
            flexDirection: 'column',
            padding: 0,
            minHeight: compactMobileChat ? 0 : 400,
            flex: compactMobileChat ? '1 1 auto' : undefined,
            minWidth: 0,
            maxHeight: compactMobileChat ? 'calc(100dvh - 200px)' : undefined,
          }}
        >
          {showChat ? (
            showGuestBookingChat && withBookingId ? (
              <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    marginBottom: 'var(--space-3)',
                    paddingBottom: 'var(--space-3)',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  {compactMobileChat ? (
                    <Link href="/nav/messages" aria-label={t('back')}>
                      <ArrowLeft size={20} />
                    </Link>
                  ) : (
                    <MessageSquare size={20} style={{ color: 'var(--color-sky-blue)' }} />
                  )}
                  <span style={{ fontWeight: 600 }}>
                    {channelBadgeEmoji('guest_booking')} {t('msgChannelGuest')}
                    {guestBookingThreads.find((g) => g.bookingId === withBookingId)?.guestLabel
                      ? ` · ${guestBookingThreads.find((g) => g.bookingId === withBookingId)?.guestLabel}`
                      : ''}
                  </span>
                </div>
                <GuestBookingChatPanel bookingId={withBookingId} />
              </div>
            ) : (
            <>
              <div
                style={{
                  padding: compactMobileChat ? 'var(--space-3)' : 'var(--space-4)',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  flexShrink: 0,
                }}
              >
                {!compactMobileChat && <MessageSquare size={20} style={{ color: 'var(--color-sky-blue)' }} />}
                <span style={{ fontWeight: 600 }}>
                  {isKommune && withUserId
                    ? otherUser
                      ? compactMobileChat
                        ? otherUser.name
                        : `Chat med ${otherUser.name}`
                      : 'Chat'
                    : otherUser?.name || t('messagesLandlordSharedChannelTitle')}
                </span>
              </div>
              {showReadonlyBanner && (
                <div
                  role="status"
                  style={{
                    margin: 0,
                    padding: 'var(--space-3) var(--space-4)',
                    background: 'rgba(234, 179, 8, 0.12)',
                    borderBottom: '1px solid var(--border-subtle)',
                    fontSize: '0.9rem',
                    lineHeight: 1.45,
                  }}
                >
                  {t('readonlyMessageBanner')}
                </div>
              )}
              <div
                ref={messagesScrollRef}
                style={{
                  flex: '1 1 0',
                  minHeight: kommuneMobileChatOnly || (!isKommune && isMobile) ? 120 : 200,
                  overflowY: 'auto',
                  WebkitOverflowScrolling: 'touch',
                  padding: 'var(--space-4)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-3)',
                }}
              >
                {messages.map((m) => (
                  <ChatMessageBubble
                    key={m.id}
                    message={m}
                    isMine={m.sender_id === bootOk.user.id}
                    variant="nav"
                    formatTimestamp={formatMessageTimestamp}
                    senderCaption={senderLabelForMessage(m)}
                    compactMobile={compactMobileChat}
                  />
                ))}
              </div>
              <ChatComposer
                variant="nav"
                value={newMessage}
                onChange={setNewMessage}
                onSend={() => void sendMessage()}
                disabled={inputDisabled}
                sending={sending}
                imagePreviews={imagePreviews}
                onImageSelect={handleImageSelect}
                onRemovePendingImage={removePendingImage}
                quickRepliesSlot={
                  !inputDisabled && bootOk?.user?.id ? (
                    <MessageQuickRepliesPanel
                      userId={bootOk.user.id}
                      channelType="social_caseworker"
                      onInsert={(text) =>
                        setNewMessage((prev) => (prev.trim() ? `${prev}\n${text}` : text))
                      }
                    />
                  ) : null
                }
              />
            </>
            )
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <MessageSquare size={48} style={{ opacity: 0.3, marginBottom: 'var(--space-4)' }} />
                <p>{t('messagesPickConversationPlaceholder')}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
