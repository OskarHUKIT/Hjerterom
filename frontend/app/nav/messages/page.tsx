'use client'

import { useState, useEffect, useRef, Suspense, useMemo } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  MessageSquare,
  Send,
  ArrowLeft,
  User,
  ChevronRight,
  ImagePlus,
  X,
  Users,
  Home,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { devWarn } from '@/app/lib/appLogger'
import { formatDateTimeNo } from '../../lib/dateFormat'
import { useLanguage } from '../../../context/LanguageContext'
import { listingCityMatchesRegions, parseKommuneRegions } from '../../lib/kommuneRegions'
import { isKommuneStaffRole } from '../../lib/kommuneRoles'
import { landlordOnboardingKey, LANDLORD_ONBOARDING_PREFIX } from '../../lib/landlordOnboarding'
import LoadingPlaceholder from '../../components/LoadingPlaceholder'
import { OptimizedPublicStorageImage } from '../../components/OptimizedPublicStorageImage'
import { useChatUserBootstrap } from '../../hooks/useChatUserBootstrap'

const LandlordOnboardingModal = dynamic(() => import('../../components/LandlordOnboardingModal'), {
  ssr: false,
})

const CHAT_IMAGES_BUCKET = 'chat-images'
const MAX_IMAGES_PER_MESSAGE = 4
const MAX_FILE_SIZE_MB = 5

function regionsOverlap(a: string[], b: string[]): boolean {
  if (!a.length || !b.length) return false
  const setA = new Set(a)
  return b.some((x) => setA.has(x))
}

/** Saksbehandlere i kommuner der utleier har bolig — brukes til én felles meldingstråd. */
async function fetchKommuneStaffIdsForLandlord(ownerId: string): Promise<string[]> {
  const { data: listings } = await supabase.from('listings').select('city').eq('owner_id', ownerId)
  const cities = [
    ...new Set(
      (listings || [])
        .map((l) => (l.city || '').trim().toLowerCase())
        .filter(Boolean)
    ),
  ]
  if (cities.length === 0) return []
  const { data: staff } = await supabase
    .from('profiles')
    .select('id, kommune_region')
    .in('role', ['kommune_ansatt', 'kommune_admin'])
  return (staff || [])
    .filter((p) =>
      parseKommuneRegions(p.kommune_region).some((r) => cities.includes(r))
    )
    .map((p) => p.id)
}

function MessagesContent() {
  const { t, locale } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const withUserId = searchParams.get('with')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const chatBoot = useChatUserBootstrap()
  const bootOk = chatBoot.data?.kind === 'ok' ? chatBoot.data : null
  const currentUser = bootOk?.user ?? null
  const role = bootOk?.role ?? null
  const kommuneCanEdit = bootOk?.kommuneCanEdit ?? true
  const myKommuneRegion = bootOk?.myKommuneRegion ?? null
  const profileResolved = Boolean(bootOk)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [pendingImages, setPendingImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  /** Kommune: unngå «ingen meldinger»-tekst mens første henting av samtaler pågår. */
  const [conversationsLoading, setConversationsLoading] = useState(false)
  const [conversations, setConversations] = useState<
    { userId: string; name: string; lastMessage: string; lastAt: string }[]
  >([])
  const [otherUser, setOtherUser] = useState<any>(null)
  const [peerRole, setPeerRole] = useState<string | null>(null)
  const [colleagues, setColleagues] = useState<{ id: string; name: string }[]>([])
  const [landlordAccounts, setLandlordAccounts] = useState<{ id: string; name: string }[]>([])
  const [showLandlordMessagesIntro, setShowLandlordMessagesIntro] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  /** Sidefelt: velg liste under Samtaler (utleiere uten tråd vs. saksbehandlere). */
  const [messagesPickerTab, setMessagesPickerTab] = useState<'landlords' | 'staff'>('landlords')
  const [messagesContactSearch, setMessagesContactSearch] = useState('')
  const messagesScrollRef = useRef<HTMLDivElement>(null)
  /** Utleier: alle saksbehandlere/admin som overlapper boligenes kommuner (én delt kanal). */
  const [landlordKommuneStaffIds, setLandlordKommuneStaffIds] = useState<string[]>([])
  /** Visningsnavn for avsender (kollega i delt tråd / saksbehandler fra utleiers perspektiv). */
  const [threadSenderLabelById, setThreadSenderLabelById] = useState<Record<string, string>>({})
  const isKommune = role === 'kommune_ansatt' || role === 'kommune_admin'
  const peerIsKommuneColleague = peerRole === 'kommune_ansatt' || peerRole === 'kommune_admin'
  const readonlyBlocksReply =
    isKommune &&
    kommuneCanEdit === false &&
    !!withUserId &&
    (peerRole === null || !peerIsKommuneColleague)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const sync = () => setIsMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (!profileResolved || !currentUser?.id || isKommune) {
      setLandlordKommuneStaffIds([])
      return
    }
    let cancelled = false
    void (async () => {
      const ids = await fetchKommuneStaffIdsForLandlord(currentUser.id)
      if (cancelled) return
      setLandlordKommuneStaffIds(ids)
    })()
    return () => {
      cancelled = true
    }
  }, [profileResolved, currentUser?.id, isKommune])

  /** Utleier: all dialog går i én delt kanal — fjern ?with= (gamle bokmerker). */
  useEffect(() => {
    if (!profileResolved || !currentUser || isKommune || !withUserId) return
    router.replace('/nav/messages')
  }, [profileResolved, currentUser, isKommune, withUserId, router])

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

  /** Kollegeliste + utleiere i region: én round-trip-kjede med Promise.all (to parallelle grener). */
  useEffect(() => {
    if (!currentUser || !isKommune) {
      setColleagues([])
      setLandlordAccounts([])
      return
    }
    let cancelled = false
    const myRegions = parseKommuneRegions(myKommuneRegion)
    if (myRegions.length === 0) {
      setColleagues([])
      setLandlordAccounts([])
      return
    }

    const loadColleagues = async () => {
      const { data: rows } = await supabase
        .from('profiles')
        .select('id, full_name, email, kommune_region, kommune_can_edit, role')
        .in('role', ['kommune_ansatt', 'kommune_admin'])
        .neq('id', currentUser.id)
      if (cancelled) return []
      return (rows || [])
        .filter(
          (p: { role?: string | null }) => p.role === 'kommune_admin' || p.role === 'kommune_ansatt'
        )
        .filter((p: { kommune_region?: string | string[] | null }) =>
          regionsOverlap(myRegions, parseKommuneRegions(p.kommune_region))
        )
        .map((p: { id: string; full_name?: string | null; email?: string | null }) => ({
          id: p.id,
          name: p.full_name?.trim() || p.email?.split('@')[0] || 'Ukjent',
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'nb'))
    }

    const loadLandlords = async () => {
      const { data: allListings } = await supabase.rpc('get_listings_for_kommune')
      if (cancelled) return []
      const listingsInRegion = (allListings || []).filter((l: { city?: string | null }) =>
        listingCityMatchesRegions(l.city, myRegions)
      )
      const allowedOwnerIds = new Set(
        listingsInRegion.map((l: { owner_id?: string }) => l.owner_id).filter(Boolean)
      )

      const { data: profiles, error: profileError } = await supabase.rpc(
        'get_all_users_for_kommune'
      )
      if (cancelled) return []
      let rows: {
        id: string
        full_name?: string | null
        email?: string | null
        role?: string | null
      }[] = []
      if (profileError) {
        const { data: fb } = await supabase.from('profiles').select('id, full_name, email, role')
        rows = (fb || []) as typeof rows
      } else {
        rows = (profiles || []) as typeof rows
      }
      return rows
        .filter((p) => allowedOwnerIds.has(p.id) && !isKommuneStaffRole(p.role))
        .map((p) => ({
          id: p.id,
          name: p.full_name?.trim() || p.email?.split('@')[0] || 'Ukjent',
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'nb'))
    }

    void (async () => {
      try {
        const [colleaguesList, landlordsList] = await Promise.all([loadColleagues(), loadLandlords()])
        if (!cancelled) {
          setColleagues(colleaguesList)
          setLandlordAccounts(landlordsList)
        }
      } catch {
        if (!cancelled) {
          setColleagues([])
          setLandlordAccounts([])
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [currentUser, isKommune, myKommuneRegion])

  useEffect(() => {
    if (!currentUser || loading) return
    if (role == null) return
    if (isKommuneStaffRole(role)) return
    if (typeof window === 'undefined') return
    const key = landlordOnboardingKey(LANDLORD_ONBOARDING_PREFIX.messages, currentUser.id)
    if (!localStorage.getItem(key)) setShowLandlordMessagesIntro(true)
  }, [currentUser, loading, role])

  useEffect(() => {
    if (!profileResolved || !currentUser) return
    let cancelled = false

    const fetchConversationsKommune = async () => {
      const { data: rows, error: sumErr } = await supabase.rpc('get_kommune_landlord_thread_summaries')
      if (sumErr) {
        devWarn('[Boly/chat] get_kommune_landlord_thread_summaries', sumErr)
        setConversations([])
        return
      }
      if (!rows?.length) {
        setConversations([])
        return
      }

      const ids = [...new Set((rows as { landlord_id: string }[]).map((r) => r.landlord_id))]
      let nameById = new Map<string, string>()
      if (ids.length > 0) {
        const { data: batchRows, error: batchErr } = await supabase.rpc('get_user_display_names_batch', {
          p_user_ids: ids,
        })
        if (batchErr) {
          const resolved = await Promise.all(
            ids.map(async (pid) => {
              const { data: name } = await supabase.rpc('get_user_display_name', { p_user_id: pid })
              return { user_id: pid, display_name: name ?? null }
            })
          )
          nameById = new Map(
            resolved.map((r) => [r.user_id, r.display_name ?? 'Ukjent bruker'])
          )
        } else {
          nameById = new Map(
            (batchRows || []).map((r: { user_id: string; display_name: string }) => [
              r.user_id,
              r.display_name ?? 'Ukjent bruker',
            ])
          )
        }
      }

      const peers = (rows as { landlord_id: string; last_at: string; last_preview: string | null }[]).map(
        (r) => {
          const raw = (r.last_preview ?? '').trim()
          return {
            userId: r.landlord_id,
            name: nameById.get(r.landlord_id) ?? 'Ukjent bruker',
            lastMessage: raw.length > 40 ? `${raw.slice(0, 40)}…` : raw,
            lastAt: r.last_at || '',
          }
        }
      )
      setConversations(peers.sort((a, b) => (b.lastAt > a.lastAt ? 1 : -1)))
    }

    void (async () => {
      try {
        if (isKommune) {
          setConversationsLoading(true)
          await fetchConversationsKommune()
        } else {
          setConversations([])
        }
      } catch {
        if (!cancelled && isKommune) setConversations([])
      } finally {
        if (!cancelled) {
          setConversationsLoading(false)
          setLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
      setConversationsLoading(false)
    }
  }, [profileResolved, currentUser, isKommune, withUserId, kommuneCanEdit, t])

  useEffect(() => {
    if (!profileResolved || !currentUser) return
    const isHomeownerChat = !isKommune
    const isKommuneChat = isKommune && withUserId
    if (!isHomeownerChat && !isKommuneChat) {
      setMessages([])
      setOtherUser(null)
      return
    }

    const fetchMessages = async () => {
      let query = supabase.from('chat_messages').select('*')
      if (isHomeownerChat) {
        const staffIds =
          landlordKommuneStaffIds.length > 0
            ? landlordKommuneStaffIds
            : await fetchKommuneStaffIdsForLandlord(currentUser.id)
        if (staffIds.length === 0) {
          query = query.or(
            `and(sender_id.eq.${currentUser.id},receiver_id.is.null),receiver_id.eq.${currentUser.id}`
          )
        } else {
          const inList = staffIds.join(',')
          query = query.or(
            `and(sender_id.eq.${currentUser.id},receiver_id.is.null),and(sender_id.eq.${currentUser.id},receiver_id.in.(${inList})),and(sender_id.in.(${inList}),receiver_id.eq.${currentUser.id})`
          )
        }
      } else {
        const { data: rpcData, error: rpcErr } = await supabase.rpc(
          'get_kommune_landlord_thread_messages',
          { p_landlord_id: withUserId }
        )
        if (!rpcErr && rpcData != null) {
          setMessages((rpcData as any[]) || [])
          return
        }
        if (rpcErr) devWarn('[Boly/chat] get_kommune_landlord_thread_messages', rpcErr)
        query = query.or(
          `and(sender_id.eq.${currentUser.id},receiver_id.eq.${withUserId}),and(sender_id.eq.${withUserId},receiver_id.eq.${currentUser.id}),and(sender_id.eq.${withUserId},receiver_id.is.null)`
        )
        const { data } = await query.order('created_at', { ascending: true })
        setMessages(data || [])
        return
      }
      const { data } = await query.order('created_at', { ascending: true })
      setMessages(data || [])
    }

    if (isHomeownerChat) {
      setOtherUser({ id: null, name: t('messagesLandlordSharedChannelTitle') })
      void fetchMessages()
    } else if (withUserId) {
      void Promise.all([
        supabase.rpc('get_user_display_name', { p_user_id: withUserId }).then(({ data: name }) => {
          setOtherUser({ id: withUserId, name: name ?? 'Ukjent bruker' })
        }),
        fetchMessages(),
      ])
    }

    const onVisibleRefetch = () => {
      if (document.visibilityState === 'visible') void fetchMessages()
    }
    document.addEventListener('visibilitychange', onVisibleRefetch)

    const channelId = isHomeownerChat
      ? `chat:${currentUser.id}:kommune:shared`
      : `chat:${currentUser.id}:${withUserId}`
    const sub = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const row = payload.new as { sender_id?: string; receiver_id?: string | null }
          if (!row?.sender_id) return
          if (isKommuneChat && withUserId) {
            if (row.sender_id !== withUserId && row.receiver_id !== withUserId) return
          } else if (isHomeownerChat) {
            if (row.sender_id !== currentUser.id && row.receiver_id !== currentUser.id) return
          }
          void fetchMessages()
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') return
        if (process.env.NODE_ENV === 'development' && err) {
          devWarn('[Boly/chat] realtime', status, err)
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          void fetchMessages()
        }
      })

    return () => {
      document.removeEventListener('visibilitychange', onVisibleRefetch)
      void sub.unsubscribe()
    }
  }, [
    profileResolved,
    currentUser,
    withUserId,
    isKommune,
    t,
    landlordKommuneStaffIds,
  ])

  useEffect(() => {
    if (!bootOk?.user?.id || messages.length === 0) {
      setThreadSenderLabelById({})
      return
    }
    const need = new Set<string>()
    for (const m of messages) {
      if (typeof m.sender_id === 'string' && m.sender_id.trim()) {
        need.add(m.sender_id)
      }
    }
    if (need.size === 0) {
      setThreadSenderLabelById({})
      return
    }
    let cancelled = false
    void (async () => {
      const ids = [...need]
      const { data: batchRows, error: batchErr } = await supabase.rpc('get_user_display_names_batch', {
        p_user_ids: ids,
      })
      if (cancelled) return
      const next: Record<string, string> = {}
      if (batchErr) {
        for (const pid of ids) {
          const { data: name } = await supabase.rpc('get_user_display_name', { p_user_id: pid })
          if (!cancelled) next[pid] = (name as string | null)?.trim() || 'Ukjent bruker'
        }
      } else {
        for (const r of batchRows || []) {
          const row = r as { user_id: string; display_name: string | null }
          next[row.user_id] = row.display_name?.trim() || 'Ukjent bruker'
        }
      }
      if (!cancelled) setThreadSenderLabelById(next)
    })()
    return () => {
      cancelled = true
    }
  }, [messages, isKommune, withUserId, bootOk])

  useEffect(() => {
    if (!currentUser) return
    const inChat = isKommune ? !!withUserId : true
    if (!inChat) return
    const el = messagesScrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, currentUser, withUserId, isKommune, isMobile])

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : []
    e.target.value = ''
    const valid = files.filter((f) => {
      if (!f.type.startsWith('image/')) return false
      if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        alert(`«${f.name}» er for stor. Maks ${MAX_FILE_SIZE_MB} MB.`)
        return false
      }
      return true
    })
    const total = pendingImages.length + valid.length
    if (total > MAX_IMAGES_PER_MESSAGE) {
      setPendingImages((prev) => prev.concat(valid.slice(0, MAX_IMAGES_PER_MESSAGE - prev.length)))
      setImagePreviews((prev) => {
        const next = [...prev]
        valid.slice(0, MAX_IMAGES_PER_MESSAGE - pendingImages.length).forEach((f) => {
          const url = URL.createObjectURL(f)
          next.push(url)
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
    try {
      let imageUrls: string[] = []
      if (pendingImages.length > 0) {
        for (const file of pendingImages) {
          const ext = file.name.split('.').pop() || 'jpg'
          const path = `${currentUser.id}/${crypto.randomUUID()}.${ext}`
          const { error: uploadError } = await supabase.storage
            .from(CHAT_IMAGES_BUCKET)
            .upload(path, file, { contentType: file.type, upsert: false })
          if (uploadError) throw uploadError
          const { data: urlData } = supabase.storage.from(CHAT_IMAGES_BUCKET).getPublicUrl(path)
          imageUrls.push(urlData.publicUrl)
        }
        setPendingImages([])
        setImagePreviews((prev) => {
          prev.forEach(URL.revokeObjectURL)
          return []
        })
      }

      const { data: inserted, error } = await supabase
        .from('chat_messages')
        .insert({
          sender_id: currentUser.id,
          receiver_id: effectiveReceiver ?? null,
          content: content || '',
          image_urls: imageUrls,
        })
        .select('id, created_at')
        .maybeSingle()
      if (error) throw error
      setNewMessage('')
      setMessages((prev) => [
        ...prev,
        {
          id: inserted?.id ?? crypto.randomUUID(),
          sender_id: currentUser.id,
          receiver_id: effectiveReceiver ?? null,
          content: content || '',
          image_urls: imageUrls.length > 0 ? imageUrls : [],
          created_at: inserted?.created_at ?? new Date().toISOString(),
          is_read: false,
        },
      ])

      const senderName =
        currentUser.user_metadata?.full_name ||
        currentUser.email?.split('@')[0] ||
        (isKommune ? 'Kommune' : 'En utleier')
      const text = content.trim()
      const msgBody =
        text.length > 0
          ? `${senderName}:\n\n${text}${imageUrls.length > 0 ? '\n\n(Bilde vedlagt)' : ''}`
          : imageUrls.length > 0
            ? `${senderName} sendte et bilde.`
            : `${senderName} har sendt deg en melding.`
      const uniqNotify = [...new Set(notifyUserIds)]
      for (const oid of uniqNotify) {
        await supabase.from('notifications').insert({
          owner_id: oid,
          type: 'NEW_MESSAGE',
          title: `Ny melding fra ${senderName}`,
          message: msgBody,
          status: 'unread',
          related_user_id: currentUser.id,
        })
      }
    } catch (err: any) {
      alert(t('errSend') + (err?.message || String(err)))
    } finally {
      setSending(false)
    }
  }

  const conversationPeerIds = useMemo(
    () => new Set(conversations.map((c) => c.userId)),
    [conversations]
  )
  const landlordsWithoutThread = useMemo(
    () => landlordAccounts.filter((l) => !conversationPeerIds.has(l.id)),
    [landlordAccounts, conversationPeerIds]
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
  const kommuneMobileListOnly = isKommune && isMobile && !withUserId
  const kommuneMobileChatOnly = isKommune && isMobile && !!withUserId
  const showChat = isKommune ? withUserId : true

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
  const compactMobileChat = kommuneMobileChatOnly || (!isKommune && isMobile)
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
          gridTemplateColumns: kommuneMobileListOnly
            ? '1fr'
            : kommuneMobileChatOnly
              ? '1fr'
              : showKommuneSidebar
                ? 'minmax(280px, 340px) 1fr'
                : '1fr',
          gap: 'var(--space-6)',
          minHeight: compactMobileChat ? 'min(520px, calc(100dvh - 220px))' : '400px',
          flex: compactMobileChat ? '1 1 auto' : undefined,
          minWidth: 0,
        }}
      >
        {showKommuneSidebar && !kommuneMobileChatOnly && (
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
                      key={c.userId}
                      href={`/nav/messages?with=${c.userId}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-3)',
                        padding: 'var(--space-3)',
                        borderRadius: '10px',
                        background:
                          withUserId === c.userId
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
                {messagesPickerTab === 'landlords' ? (
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
                      <Link
                        key={l.id}
                        href={`/nav/messages?with=${l.id}`}
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
                      </Link>
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
        )}

        <div
          className="card"
          style={{
            display: kommuneMobileListOnly ? 'none' : 'flex',
            flexDirection: 'column',
            padding: 0,
            minHeight: compactMobileChat ? 0 : 400,
            flex: compactMobileChat ? '1 1 auto' : undefined,
            minWidth: 0,
            maxHeight: compactMobileChat ? 'calc(100dvh - 200px)' : undefined,
          }}
        >
          {showChat && (withUserId || !isKommune) ? (
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
                {messages.map((m) => {
                  const isMe = m.sender_id === bootOk.user.id
                  const urls = (m.image_urls || []).filter(Boolean)
                  const senderCaption = senderLabelForMessage(m)
                  return (
                    <div
                      key={m.id}
                      style={{
                        alignSelf: isMe ? 'flex-end' : 'flex-start',
                        maxWidth: compactMobileChat ? '92%' : '85%',
                        padding: 'var(--space-3) var(--space-4)',
                        borderRadius: '12px',
                        background: isMe ? 'var(--color-royal-blue)' : 'rgba(255,255,255,0.06)',
                        border: isMe ? 'none' : '1px solid var(--border-subtle)',
                      }}
                    >
                      {senderCaption ? (
                        <div
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            opacity: 0.72,
                            marginBottom: 6,
                            letterSpacing: '0.02em',
                          }}
                        >
                          {senderCaption}
                        </div>
                      ) : null}
                      {urls.length > 0 && (
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '6px',
                            marginBottom: m.content ? '8px' : 0,
                          }}
                        >
                          {urls.map((url: string, i: number) => (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                position: 'relative',
                                display: 'block',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                width: '200px',
                                height: '200px',
                                maxWidth: '100%',
                              }}
                            >
                              <OptimizedPublicStorageImage
                                variant="fill"
                                src={url}
                                alt=""
                                sizes="200px"
                                style={{ objectFit: 'cover' }}
                              />
                            </a>
                          ))}
                        </div>
                      )}
                      {m.content ? (
                        <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{m.content}</p>
                      ) : null}
                      <div style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: '4px' }}>
                        {formatMessageTimestamp(m.created_at)}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div
                className="messages-thread-composer"
                style={{
                  padding: 'var(--space-4)',
                  paddingBottom:
                    'calc(var(--space-4) + var(--mobile-bottom-nav-total, 0px))',
                  borderTop: '1px solid var(--border-subtle)',
                  flexShrink: 0,
                  background: 'var(--bg-card)',
                }}
              >
                {imagePreviews.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '8px',
                      marginBottom: 'var(--space-3)',
                    }}
                  >
                    {imagePreviews.map((url, i) => (
                      <div
                        key={i}
                        style={{
                          position: 'relative',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          width: '64px',
                          height: '64px',
                        }}
                      >
                        <OptimizedPublicStorageImage
                          variant="fixed"
                          src={url}
                          alt=""
                          width={64}
                          height={64}
                          sizes="64px"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <button
                          type="button"
                          onClick={() => removePendingImage(i)}
                          aria-label={t('messagesRemoveImageAria')}
                          style={{
                            position: 'absolute',
                            top: 2,
                            right: 2,
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: 'rgba(0,0,0,0.6)',
                            border: 'none',
                            color: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-end' }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    multiple
                    onChange={handleImageSelect}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title={t('messagesAddImagesTitle')}
                    aria-label={t('messagesAddImagesTitle')}
                    disabled={inputDisabled || pendingImages.length >= MAX_IMAGES_PER_MESSAGE}
                    style={{
                      flexShrink: 0,
                      width: 44,
                      height: 44,
                      borderRadius: '10px',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-subtle)',
                      color: 'var(--text-main)',
                      cursor: inputDisabled ? 'not-allowed' : 'pointer',
                      opacity: inputDisabled ? 0.5 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ImagePlus size={22} />
                  </button>
                  <input
                    className="input"
                    placeholder={t('messagesPlaceholder')}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === 'Enter' &&
                      !e.shiftKey &&
                      !inputDisabled &&
                      (e.preventDefault(), sendMessage())
                    }
                    disabled={inputDisabled}
                    style={{ flex: 1, marginBottom: 0, opacity: inputDisabled ? 0.6 : 1 }}
                  />
                  <button
                    type="button"
                    onClick={sendMessage}
                    disabled={inputDisabled || (!newMessage.trim() && pendingImages.length === 0)}
                    className="button"
                    aria-label={t('messagesSendAria')}
                    title={t('messagesSendAria')}
                    style={{ padding: 'var(--space-3) var(--space-5)' }}
                  >
                    {sending ? <Send size={18} style={{ opacity: 0.5 }} /> : <Send size={18} />}
                  </button>
                </div>
              </div>
            </>
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

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <main className="container">
          <LoadingPlaceholder minHeight={400} />
        </main>
      }
    >
      <MessagesContent />
    </Suspense>
  )
}
