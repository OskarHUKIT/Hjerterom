'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { devWarn } from '@/app/lib/appLogger'
import { parseKommuneRegions } from '@/app/lib/kommuneRegions'
import { isKommuneStaffRole } from '@/app/lib/kommuneRoles'
import { useLanguage } from '@/context/LanguageContext'
import { fetchDisplayNamesBatch } from '@/features/messaging/hooks/useDisplayNamesBatch'
import type {
  ConversationRow,
  GuestBookingThread,
  LandlordAreaThread,
  LandlordEventThread,
} from '@/features/messaging/types/navMessages'

type UseNavMessagesThreadsArgs = {
  profileResolved: boolean
  currentUser: { id: string } | null
  isKommune: boolean
  myKommuneRegion: string | null
  withUserId: string | null
  withAreaId: string | null
  kommuneCanEdit: boolean
}

export function useNavMessagesThreads({
  profileResolved,
  currentUser,
  isKommune,
  myKommuneRegion,
  withUserId,
  withAreaId,
  kommuneCanEdit,
}: UseNavMessagesThreadsArgs) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [conversationsLoading, setConversationsLoading] = useState(false)
  const [conversations, setConversations] = useState<ConversationRow[]>([])
  const [landlordAreaThreads, setLandlordAreaThreads] = useState<LandlordAreaThread[]>([])
  const [landlordEventThreads, setLandlordEventThreads] = useState<LandlordEventThread[]>([])
  const [guestBookingThreads, setGuestBookingThreads] = useState<GuestBookingThread[]>([])
  const [colleagues, setColleagues] = useState<{ id: string; name: string }[]>([])
  const [landlordAccounts, setLandlordAccounts] = useState<{ id: string; name: string }[]>([])

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
      const { data: rows } = await supabase.rpc('get_kommune_staff_for_admin')
      if (cancelled) return []
      return (rows || [])
        .map((p: { id: string; full_name?: string | null; email?: string | null }) => ({
          id: p.id,
          name: p.full_name?.trim() || p.email?.split('@')[0] || 'Ukjent',
        }))
        .sort((a: { id: string; name: string }, b: { id: string; name: string }) =>
          a.name.localeCompare(b.name, 'nb')
        )
    }

    const loadLandlords = async () => {
      const { data: profiles, error: profileError } = await supabase.rpc('get_all_users_for_kommune')
      if (cancelled) return []
      if (profileError) return []
      return (profiles || [])
        .filter((p: { role?: string | null }) => !isKommuneStaffRole(p.role))
        .map((p: { id: string; full_name?: string | null; email?: string | null }) => ({
          id: p.id,
          name: p.full_name?.trim() || p.email?.split('@')[0] || 'Ukjent',
        }))
        .sort((a: { id: string; name: string }, b: { id: string; name: string }) =>
          a.name.localeCompare(b.name, 'nb')
        )
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
      const nameById = await fetchDisplayNamesBatch(ids)

      const peers = (
        rows as {
          landlord_id: string
          service_area_id: string
          service_area_name: string
          last_at: string
          last_preview: string | null
        }[]
      ).map((r) => {
        const raw = (r.last_preview ?? '').trim()
        return {
          userId: r.landlord_id,
          serviceAreaId: r.service_area_id,
          name: nameById.get(r.landlord_id) ?? 'Ukjent bruker',
          areaName: r.service_area_name || '',
          lastMessage: raw.length > 40 ? `${raw.slice(0, 40)}…` : raw,
          lastAt: r.last_at || '',
        }
      })
      setConversations(peers.sort((a, b) => (b.lastAt > a.lastAt ? 1 : -1)))
    }

    const fetchConversationsLandlord = async () => {
      const { data: rows, error: sumErr } = await supabase.rpc('get_landlord_service_area_threads')
      if (sumErr) {
        devWarn('[Boly/chat] get_landlord_service_area_threads', sumErr)
        setLandlordAreaThreads([])
        return
      }
      setLandlordAreaThreads(
        (rows || []).map(
          (r: {
            service_area_id: string
            display_name: string
            last_at: string | null
            last_preview: string | null
          }) => {
            const raw = (r.last_preview ?? '').trim()
            return {
              serviceAreaId: r.service_area_id,
              name: r.display_name || '',
              lastMessage: raw.length > 40 ? `${raw.slice(0, 40)}…` : raw,
              lastAt: r.last_at || '',
            }
          }
        )
      )
    }

    const fetchGuestBookingThreads = async () => {
      const { data: rows, error: guestErr } = await supabase.rpc('list_landlord_guest_booking_threads')
      if (guestErr) {
        devWarn('[Boly/chat] list_landlord_guest_booking_threads', guestErr)
        setGuestBookingThreads([])
        return
      }
      setGuestBookingThreads(
        (rows || []).map(
          (r: {
            booking_id: string
            guest_label: string
            listing_address: string
            last_preview: string
            last_at: string
            booking_status: string
          }) => ({
            bookingId: r.booking_id,
            guestLabel: r.guest_label || t('msgChannelGuest'),
            listingAddress: r.listing_address || '',
            lastPreview: r.last_preview || '',
            lastAt: r.last_at || '',
            bookingStatus: r.booking_status || '',
          })
        )
      )
    }

    const fetchLandlordEventThreads = async () => {
      const { data: rows, error: evErr } = await supabase.rpc('get_landlord_event_threads')
      if (evErr) {
        devWarn('[Boly/chat] get_landlord_event_threads', evErr)
        setLandlordEventThreads([])
        return
      }
      setLandlordEventThreads(
        (rows || []).map(
          (r: { event_id: string; event_name: string; last_at: string | null; last_preview: string | null }) => {
            const raw = (r.last_preview ?? '').trim()
            return {
              eventId: r.event_id,
              eventName: r.event_name || '',
              lastMessage: raw.length > 40 ? `${raw.slice(0, 40)}…` : raw,
              lastAt: r.last_at || '',
            }
          }
        )
      )
    }

    void (async () => {
      try {
        if (isKommune) {
          setConversationsLoading(true)
          await fetchConversationsKommune()
        } else {
          setConversationsLoading(true)
          await Promise.all([
            fetchConversationsLandlord(),
            fetchLandlordEventThreads(),
            fetchGuestBookingThreads(),
          ])
          setConversations([])
        }
      } catch {
        if (!cancelled && isKommune) setConversations([])
        if (!cancelled && !isKommune) setLandlordAreaThreads([])
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
  }, [profileResolved, currentUser, isKommune, withUserId, withAreaId, kommuneCanEdit, t])

  return {
    loading,
    conversationsLoading,
    conversations,
    landlordAreaThreads,
    landlordEventThreads,
    guestBookingThreads,
    colleagues,
    landlordAccounts,
  }
}
