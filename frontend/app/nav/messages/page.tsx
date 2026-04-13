'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
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
import { formatDateTimeNo } from '../../lib/dateFormat'
import { useLanguage } from '../../../context/LanguageContext'
import {
  listingCityMatchesRegions,
  mergeKommuneRegionSources,
  parseKommuneRegions,
} from '../../lib/kommuneRegions'
import { isKommuneStaffRole } from '../../lib/kommuneRoles'
import { landlordOnboardingKey, LANDLORD_ONBOARDING_PREFIX } from '../../lib/landlordOnboarding'
import LandlordOnboardingModal from '../../components/LandlordOnboardingModal'
import LoadingPlaceholder from '../../components/LoadingPlaceholder'
import { OptimizedPublicStorageImage } from '../../components/OptimizedPublicStorageImage'
import { getLandlordPostLoginHref } from '../../lib/landlordNavGate'

const CHAT_IMAGES_BUCKET = 'chat-images'
const MAX_IMAGES_PER_MESSAGE = 4
const MAX_FILE_SIZE_MB = 5

function regionsOverlap(a: string[], b: string[]): boolean {
  if (!a.length || !b.length) return false
  const setA = new Set(a)
  return b.some((x) => setA.has(x))
}

function MessagesContent() {
  const { t } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const withUserId = searchParams.get('with')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [landlordNavGateReady, setLandlordNavGateReady] = useState(false)

  const [currentUser, setCurrentUser] = useState<any>(null)
  const [role, setRole] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [pendingImages, setPendingImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [conversations, setConversations] = useState<
    { userId: string; name: string; lastMessage: string; lastAt: string }[]
  >([])
  const [otherUser, setOtherUser] = useState<any>(null)
  const [kommuneCanEdit, setKommuneCanEdit] = useState(true)
  const [myKommuneRegion, setMyKommuneRegion] = useState<string | string[] | null>(null)
  const [peerRole, setPeerRole] = useState<string | null>(null)
  const [colleagues, setColleagues] = useState<{ id: string; name: string }[]>([])
  const [landlordAccounts, setLandlordAccounts] = useState<{ id: string; name: string }[]>([])
  /** Utleiere: saksbehandlere i kommuner der brukeren har bolig — for nye DM-tråder. */
  const [kommuneContacts, setKommuneContacts] = useState<{ id: string; name: string }[]>([])
  const [showLandlordMessagesIntro, setShowLandlordMessagesIntro] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const messagesScrollRef = useRef<HTMLDivElement>(null)
  /** False until `profiles` (and region fallbacks) are loaded — avoids flashing utleier-UI for kommune. */
  const [profileResolved, setProfileResolved] = useState(false)

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
    let cancelled = false
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }
      const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
      const r = prof?.role || user.user_metadata?.role
      if (isKommuneStaffRole(r)) {
        if (!cancelled) setLandlordNavGateReady(true)
        return
      }
      const href = await getLandlordPostLoginHref(supabase, user.id, user.email, {
        reuseProfileRole: r ?? null,
      })
      if (cancelled) return
      if (href !== '/homeowner/manage') {
        router.replace(href)
        return
      }
      setLandlordNavGateReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [router])

  useEffect(() => {
    let cancelled = false
    void supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (cancelled) return
      setCurrentUser(user)
      if (!user) {
        setProfileResolved(true)
        return
      }
      try {
        const { data: prof } = await supabase
          .from('profiles')
          .select('role, kommune_can_edit, kommune_region')
          .eq('id', user.id)
          .maybeSingle()
        if (cancelled) return
        let wlRpc: string | null = null
        let wlTable: string | null = null
        if (user.email) {
          const { data: rpcRegion } = await supabase.rpc('get_whitelist_region_for_email', {
            p_email: user.email,
          })
          wlRpc =
            typeof rpcRegion === 'string'
              ? rpcRegion
              : Array.isArray(rpcRegion) && rpcRegion?.length
                ? String(rpcRegion[0])
                : null
          const { data: whitelistRows } = await supabase
            .from('kommune_access_list')
            .select('region')
            .ilike('email', user.email)
            .eq('is_active', true)
            .limit(1)
          wlTable = whitelistRows?.[0]?.region ?? null
        }
        if (cancelled) return
        const merged = mergeKommuneRegionSources(prof?.kommune_region, wlRpc, wlTable)
        setMyKommuneRegion(merged.length > 0 ? merged.join(', ') : null)
        setRole(prof?.role || user.user_metadata?.role || 'homeowner')
        setKommuneCanEdit(prof?.role === 'kommune_admin' || prof?.kommune_can_edit !== false)
      } finally {
        if (!cancelled) setProfileResolved(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

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
    if (!currentUser || !isKommune || kommuneCanEdit !== false) {
      setColleagues([])
      return
    }
    const load = async () => {
      const myRegions = parseKommuneRegions(myKommuneRegion)
      if (myRegions.length === 0) {
        setColleagues([])
        return
      }
      const { data: rows } = await supabase
        .from('profiles')
        .select('id, full_name, email, kommune_region, kommune_can_edit, role')
        .in('role', ['kommune_ansatt', 'kommune_admin'])
        .neq('id', currentUser.id)
      const list = (rows || [])
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
      setColleagues(list)
    }
    load()
  }, [currentUser, isKommune, kommuneCanEdit, myKommuneRegion])

  useEffect(() => {
    if (!currentUser || !isKommune || kommuneCanEdit !== false) {
      setLandlordAccounts([])
      return
    }
    let cancelled = false
    const load = async () => {
      const myRegions = parseKommuneRegions(myKommuneRegion)
      if (myRegions.length === 0) {
        if (!cancelled) setLandlordAccounts([])
        return
      }
      const { data: allListings } = await supabase.rpc('get_listings_for_kommune')
      if (cancelled) return
      const listingsInRegion = (allListings || []).filter((l: { city?: string | null }) =>
        listingCityMatchesRegions(l.city, myRegions)
      )
      const allowedOwnerIds = new Set(
        listingsInRegion.map((l: { owner_id?: string }) => l.owner_id).filter(Boolean)
      )

      const { data: profiles, error: profileError } = await supabase.rpc(
        'get_all_users_for_kommune'
      )
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
      if (cancelled) return
      const list = rows
        .filter((p) => allowedOwnerIds.has(p.id) && !isKommuneStaffRole(p.role))
        .map((p) => ({
          id: p.id,
          name: p.full_name?.trim() || p.email?.split('@')[0] || 'Ukjent',
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'nb'))
      setLandlordAccounts(list)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [currentUser, isKommune, kommuneCanEdit, myKommuneRegion])

  useEffect(() => {
    if (!currentUser || isKommune || !profileResolved) return
    let cancelled = false
    void (async () => {
      const { data: listings } = await supabase
        .from('listings')
        .select('city')
        .eq('owner_id', currentUser.id)
      if (cancelled) return
      const cities = [
        ...new Set(
          (listings || [])
            .map((l) => (l.city || '').trim().toLowerCase())
            .filter(Boolean)
        ),
      ]
      if (cities.length === 0) {
        setKommuneContacts([])
        return
      }
      const { data: staff } = await supabase
        .from('profiles')
        .select('id, full_name, email, kommune_region, role')
        .in('role', ['kommune_ansatt', 'kommune_admin'])
      if (cancelled) return
      const list = (staff || [])
        .filter((p) => {
          const regs = parseKommuneRegions(p.kommune_region)
          return regs.some((r) => cities.includes(r))
        })
        .map((p) => ({
          id: p.id,
          name: p.full_name?.trim() || p.email?.split('@')[0] || 'Ukjent',
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'nb'))
      setKommuneContacts(list)
    })()
    return () => {
      cancelled = true
    }
  }, [currentUser, isKommune, profileResolved])

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

    const fetchConversationsKommune = async () => {
      const { data: msgs } = await supabase
        .from('chat_messages')
        .select('sender_id, receiver_id, content, created_at, image_urls')
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
        .order('created_at', { ascending: false })

      if (!msgs?.length) {
        setConversations([])
        return
      }

      const peerIds = new Set<string>()
      msgs.forEach((m) => {
        const peer = m.sender_id === currentUser.id ? m.receiver_id : m.sender_id
        if (peer) peerIds.add(peer)
        else if (m.sender_id !== currentUser.id) peerIds.add(m.sender_id)
      })

      const peers = await Promise.all(
        Array.from(peerIds).map(async (pid) => {
          const { data: name } = await supabase.rpc('get_user_display_name', { p_user_id: pid })
          const last = msgs.find((m) => m.sender_id === pid || m.receiver_id === pid)
          return {
            userId: pid,
            name: name ?? 'Ukjent bruker',
            lastMessage:
              (last?.content?.trim()?.slice(0, 40) || (last?.image_urls?.length ? '[Bilde]' : '')) +
                (last?.content?.length > 40 ? '...' : '') || '',
            lastAt: last?.created_at || '',
          }
        })
      )
      setConversations(peers.sort((a, b) => (b.lastAt > a.lastAt ? 1 : -1)))
    }

    const fetchConversationsLandlord = async () => {
      const BROADCAST_KEY = ''
      const { data: msgs } = await supabase
        .from('chat_messages')
        .select('sender_id, receiver_id, content, created_at, image_urls')
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
        .order('created_at', { ascending: false })

      if (!msgs?.length) {
        setConversations([])
        return
      }

      const peerMeta = new Map<
        string,
        { lastAt: string; lastMessage: string }
      >()

      for (const m of msgs) {
        const peerKey: string =
          m.sender_id === currentUser.id ? m.receiver_id || BROADCAST_KEY : m.sender_id
        const t = m.created_at || ''
        const snippet =
          (m.content?.trim()?.slice(0, 40) || (m.image_urls?.length ? '[Bilde]' : '')) +
          ((m.content?.length ?? 0) > 40 ? '...' : '')
        const prev = peerMeta.get(peerKey)
        if (!prev || t > prev.lastAt) {
          peerMeta.set(peerKey, { lastAt: t, lastMessage: snippet })
        }
      }

      const entries = await Promise.all(
        Array.from(peerMeta.entries()).map(async ([peerKey, meta]) => {
          const name =
            peerKey === BROADCAST_KEY
              ? t('messagesKommuneBroadcast')
              : ((
                  await supabase.rpc('get_user_display_name', { p_user_id: peerKey })
                ).data as string | null) ?? 'Ukjent bruker'
          return {
            userId: peerKey,
            name,
            lastMessage: meta.lastMessage,
            lastAt: meta.lastAt,
          }
        })
      )
      setConversations(entries.sort((a, b) => (b.lastAt > a.lastAt ? 1 : -1)))
    }

    void (async () => {
      if (isKommune) await fetchConversationsKommune()
      else await fetchConversationsLandlord()
      setLoading(false)
    })()
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

    if (isKommuneChat) {
      const loadOtherUser = async () => {
        const { data: name } = await supabase.rpc('get_user_display_name', {
          p_user_id: withUserId,
        })
        setOtherUser({ id: withUserId, name: name ?? 'Ukjent bruker' })
      }
      loadOtherUser()
    } else if (withUserId) {
      const loadPeer = async () => {
        const { data: name } = await supabase.rpc('get_user_display_name', {
          p_user_id: withUserId,
        })
        setOtherUser({ id: withUserId, name: name ?? 'Ukjent bruker' })
      }
      loadPeer()
    } else {
      setOtherUser({ id: null, name: t('messagesKommuneBroadcast') })
    }

    const fetchMessages = async () => {
      let query = supabase.from('chat_messages').select('*')
      if (isHomeownerChat) {
        if (withUserId) {
          query = query.or(
            `and(sender_id.eq.${currentUser.id},receiver_id.eq.${withUserId}),and(sender_id.eq.${withUserId},receiver_id.eq.${currentUser.id})`
          )
        } else {
          query = query.or(
            `and(sender_id.eq.${currentUser.id},receiver_id.is.null),receiver_id.eq.${currentUser.id}`
          )
        }
      } else {
        query = query.or(
          `and(sender_id.eq.${currentUser.id},receiver_id.eq.${withUserId}),and(sender_id.eq.${withUserId},receiver_id.eq.${currentUser.id}),and(sender_id.eq.${withUserId},receiver_id.is.null)`
        )
      }
      const { data } = await query.order('created_at', { ascending: true })
      setMessages(data || [])
    }
    fetchMessages()

    const channelId = isHomeownerChat
      ? `chat:${currentUser.id}:kommune:${withUserId || 'all'}`
      : `chat:${currentUser.id}:${withUserId}`
    const sub = supabase
      .channel(channelId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, () =>
        fetchMessages()
      )
      .subscribe()

    return () => {
      sub.unsubscribe()
    }
  }, [profileResolved, currentUser, withUserId, isKommune, t])

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
    const effectiveReceiver = withUserId ?? null
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
      if (effectiveReceiver) {
        const text = content.trim()
        const msgBody =
          text.length > 0
            ? `${senderName}:\n\n${text}${imageUrls.length > 0 ? '\n\n(Bilde vedlagt)' : ''}`
            : imageUrls.length > 0
              ? `${senderName} sendte et bilde.`
              : `${senderName} har sendt deg en melding.`
        await supabase.from('notifications').insert({
          owner_id: effectiveReceiver,
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

  if (!landlordNavGateReady) {
    return (
      <main className="container">
        <LoadingPlaceholder minHeight={400} />
      </main>
    )
  }

  if (!currentUser) {
    return (
      <main className="container">
        <LoadingPlaceholder minHeight={400} />
      </main>
    )
  }

  if (!profileResolved) {
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

  const backHref = kommuneMobileChatOnly
    ? '/nav/messages'
    : isKommune
      ? '/nav/database'
      : '/homeowner/manage'

  return (
    <main
      className="container"
      style={
        kommuneMobileChatOnly || (!isKommune && isMobile)
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

      <div style={{ marginBottom: 'var(--space-6)', flexShrink: 0 }}>
        <Link
          href={backHref}
          className="nav-link"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginLeft: '-1rem' }}
        >
          <ArrowLeft size={18} /> {t('back')}
        </Link>
        <h1 style={{ fontSize: '2rem', marginTop: 'var(--space-2)' }}>{t('messages')}</h1>
      </div>

      {!isKommune && (kommuneContacts.length > 0 || conversations.length > 0) && (
        <div
          className="card"
          style={{
            marginBottom: 'var(--space-6)',
            maxHeight: 'min(42vh, 380px)',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            padding: 'var(--space-4)',
          }}
        >
          {kommuneContacts.length > 0 && (
            <>
              <h3 style={{ margin: '0 0 var(--space-3)', fontSize: '1rem' }}>
                {t('messagesKommuneContacts')}
              </h3>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-2)',
                  marginBottom: conversations.length > 0 ? 'var(--space-5)' : 0,
                }}
              >
                {kommuneContacts.map((c) => (
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
                      {c.name}
                    </div>
                    <ChevronRight size={16} style={{ opacity: 0.5, flexShrink: 0 }} />
                  </Link>
                ))}
              </div>
            </>
          )}
          {conversations.length > 0 && (
            <>
              <h3 style={{ margin: '0 0 var(--space-3)', fontSize: '1rem' }}>{t('conversations')}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {conversations.map((c) => (
                  <Link
                    key={c.userId || 'broadcast'}
                    href={c.userId ? `/nav/messages?with=${c.userId}` : '/nav/messages'}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-3)',
                      padding: 'var(--space-3)',
                      borderRadius: '10px',
                      background:
                        (withUserId || '') === (c.userId || '')
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
            </>
          )}
        </div>
      )}

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
          minHeight:
            kommuneMobileChatOnly || (!isKommune && isMobile)
              ? 'min(520px, calc(100dvh - 220px))'
              : '400px',
          flex: kommuneMobileChatOnly || (!isKommune && isMobile) ? '1 1 auto' : undefined,
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
              gap: 'var(--space-5)',
            }}
          >
            {kommuneCanEdit === false && (
              <div style={{ flexShrink: 0 }}>
                <h3
                  style={{
                    marginBottom: 'var(--space-3)',
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Users size={18} style={{ opacity: 0.85 }} /> {t('colleaguesFullAccess')}
                </h3>
                {colleagues.length === 0 ? (
                  <p className="text-sm" style={{ opacity: 0.65, margin: 0 }}>
                    {t('noColleaguesWithEdit')}
                  </p>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--space-2)',
                      maxHeight: 'min(42vh, 360px)',
                      overflow: 'auto',
                    }}
                  >
                    {colleagues.map((c) => (
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
                    ))}
                  </div>
                )}
              </div>
            )}
            {kommuneCanEdit === false && (
              <div style={{ flexShrink: 0 }}>
                <h3
                  style={{
                    marginBottom: 'var(--space-3)',
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Home size={18} style={{ opacity: 0.85 }} /> {t('tabLandlords')}
                </h3>
                {landlordAccounts.length === 0 ? (
                  <p className="text-sm" style={{ opacity: 0.65, margin: 0 }}>
                    {t('messagesNoLandlordsInRegion')}
                  </p>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--space-2)',
                      maxHeight: 'min(42vh, 360px)',
                      overflow: 'auto',
                    }}
                  >
                    {landlordAccounts.map((l) => (
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
                    ))}
                  </div>
                )}
              </div>
            )}
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ marginBottom: 'var(--space-4)', fontSize: '1rem', flexShrink: 0 }}>
                {t('conversations')}
              </h3>
              {conversations.length === 0 ? (
                <p className="text-sm" style={{ opacity: 0.6 }}>
                  {t('noMessagesYet')}
                </p>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-2)',
                    minWidth: 0,
                    overflow: 'auto',
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
          </aside>
        )}

        <div
          className="card"
          style={{
            display: kommuneMobileListOnly ? 'none' : 'flex',
            flexDirection: 'column',
            padding: 0,
            minHeight: kommuneMobileChatOnly || (!isKommune && isMobile) ? 0 : 400,
            flex: kommuneMobileChatOnly || (!isKommune && isMobile) ? '1 1 auto' : undefined,
            minWidth: 0,
            maxHeight:
              kommuneMobileChatOnly || (!isKommune && isMobile)
                ? 'calc(100dvh - 200px)'
                : undefined,
          }}
        >
          {showChat && (withUserId || !isKommune) ? (
            <>
              <div
                style={{
                  padding: 'var(--space-4)',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  flexShrink: 0,
                }}
              >
                <MessageSquare size={20} style={{ color: 'var(--color-sky-blue)' }} />
                <span style={{ fontWeight: 600 }}>
                  {isKommune && withUserId
                    ? otherUser
                      ? `Chat med ${otherUser.name}`
                      : 'Chat'
                    : otherUser
                      ? `${otherUser.name}`
                      : t('messagesKommuneBroadcast')}
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
                  const isMe = m.sender_id === currentUser.id
                  const urls = (m.image_urls || []).filter(Boolean)
                  return (
                    <div
                      key={m.id}
                      style={{
                        alignSelf: isMe ? 'flex-end' : 'flex-start',
                        maxWidth: '85%',
                        padding: 'var(--space-3) var(--space-4)',
                        borderRadius: '12px',
                        background: isMe ? 'var(--color-royal-blue)' : 'rgba(255,255,255,0.06)',
                        border: isMe ? 'none' : '1px solid var(--border-subtle)',
                      }}
                    >
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
                        {formatDateTimeNo(m.created_at)}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div
                style={{
                  padding: 'var(--space-4)',
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
                    onClick={sendMessage}
                    disabled={inputDisabled || (!newMessage.trim() && pendingImages.length === 0)}
                    className="button"
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
