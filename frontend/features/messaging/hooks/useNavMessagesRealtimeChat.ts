'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { devWarn } from '@/app/lib/appLogger'
import { channelBadgeEmoji } from '@/app/lib/messageChannelLabels'
import { useLanguage } from '@/context/LanguageContext'
import { fetchDisplayNamesBatch } from '@/features/messaging/hooks/useDisplayNamesBatch'
import type { ConversationRow, LandlordAreaThread, LandlordEventThread } from '@/features/messaging/types/navMessages'
import type { ChatMessageRow } from '@/features/messaging/lib/chatSend'

type UseNavMessagesRealtimeChatArgs = {
  profileResolved: boolean
  currentUser: { id: string } | null
  isKommune: boolean
  withUserId: string | null
  withAreaId: string | null
  withEventId: string | null
  conversations: ConversationRow[]
  landlordAreaThreads: LandlordAreaThread[]
  landlordEventThreads: LandlordEventThread[]
  bootUserId?: string
}

export function useNavMessagesRealtimeChat({
  profileResolved,
  currentUser,
  isKommune,
  withUserId,
  withAreaId,
  withEventId,
  conversations,
  landlordAreaThreads,
  landlordEventThreads,
  bootUserId,
}: UseNavMessagesRealtimeChatArgs) {
  const { t } = useLanguage()
  const [messages, setMessages] = useState<ChatMessageRow[]>([])
  const [otherUser, setOtherUser] = useState<{ id: string | null; name: string } | null>(null)
  const [threadSenderLabelById, setThreadSenderLabelById] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!profileResolved || !currentUser) return
    const isHomeownerEventChat = !isKommune && !!withEventId
    const isHomeownerChat = !isKommune && !!withAreaId
    const isKommuneChat = isKommune && withUserId && withAreaId
    if (!isHomeownerChat && !isKommuneChat && !isHomeownerEventChat) {
      setMessages([])
      setOtherUser(null)
      return
    }

    const fetchMessages = async () => {
      if (isHomeownerEventChat && withEventId) {
        const { data: rpcData, error: rpcErr } = await supabase.rpc(
          'get_landlord_event_thread_messages',
          { p_event_id: withEventId }
        )
        if (!rpcErr && rpcData != null) {
          setMessages((rpcData as ChatMessageRow[]) || [])
          return
        }
        if (rpcErr) devWarn('[Boly/chat] get_landlord_event_thread_messages', rpcErr)
        setMessages([])
        return
      }

      if (isHomeownerChat && withAreaId) {
        const { data: rpcData, error: rpcErr } = await supabase.rpc(
          'get_landlord_kommune_thread_messages',
          { p_service_area_id: withAreaId }
        )
        if (!rpcErr && rpcData != null) {
          setMessages((rpcData as ChatMessageRow[]) || [])
          return
        }
        if (rpcErr) devWarn('[Boly/chat] get_landlord_kommune_thread_messages', rpcErr)
        setMessages([])
        return
      }

      if (isKommuneChat && withUserId && withAreaId) {
        const { data: rpcData, error: rpcErr } = await supabase.rpc(
          'get_kommune_landlord_thread_messages',
          { p_landlord_id: withUserId, p_service_area_id: withAreaId }
        )
        if (!rpcErr && rpcData != null) {
          setMessages((rpcData as ChatMessageRow[]) || [])
          return
        }
        if (rpcErr) devWarn('[Boly/chat] get_kommune_landlord_thread_messages', rpcErr)
        setMessages([])
      }
    }

    if (isHomeownerEventChat && withEventId) {
      const eventLabel =
        landlordEventThreads.find((e) => e.eventId === withEventId)?.eventName || t('msgChannelEvent')
      setOtherUser({
        id: null,
        name: `${channelBadgeEmoji('event_caseworker')} ${t('msgChannelEvent')} · ${eventLabel}`,
      })
      void fetchMessages()
    } else if (isHomeownerChat && withAreaId) {
      const areaLabel =
        landlordAreaThreads.find((a) => a.serviceAreaId === withAreaId)?.name ||
        t('messagesLandlordSharedChannelTitle')
      setOtherUser({ id: null, name: areaLabel })
      void fetchMessages()
    } else if (withUserId && withAreaId) {
      void Promise.all([
        supabase.rpc('get_user_display_name', { p_user_id: withUserId }).then(({ data: name }) => {
          const areaLabel =
            conversations.find((c) => c.userId === withUserId && c.serviceAreaId === withAreaId)
              ?.areaName || ''
          setOtherUser({
            id: withUserId,
            name: areaLabel ? `${name ?? 'Ukjent bruker'} · ${areaLabel}` : (name ?? 'Ukjent bruker'),
          })
        }),
        fetchMessages(),
      ])
    }

    const onVisibleRefetch = () => {
      if (document.visibilityState === 'visible') void fetchMessages()
    }
    document.addEventListener('visibilitychange', onVisibleRefetch)

    const channelId = isHomeownerEventChat
      ? `chat:${currentUser.id}:event:${withEventId}`
      : isHomeownerChat
        ? `chat:${currentUser.id}:area:${withAreaId}`
        : `chat:${currentUser.id}:${withUserId}:area:${withAreaId}`
    const sub = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const row = payload.new as {
            sender_id?: string
            receiver_id?: string | null
            service_area_id?: string | null
            event_id?: string | null
          }
          if (!row?.sender_id) return
          if (withEventId && row.event_id && row.event_id !== withEventId) return
          if (withAreaId && row.service_area_id && row.service_area_id !== withAreaId) return
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
    withAreaId,
    withEventId,
    isKommune,
    t,
    landlordAreaThreads,
    landlordEventThreads,
    conversations,
  ])

  useEffect(() => {
    if (!bootUserId || messages.length === 0) {
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
      const nameById = await fetchDisplayNamesBatch([...need])
      if (cancelled) return
      setThreadSenderLabelById(Object.fromEntries(nameById))
    })()
    return () => {
      cancelled = true
    }
  }, [messages, bootUserId])

  return { messages, setMessages, otherUser, threadSenderLabelById }
}
