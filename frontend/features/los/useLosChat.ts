'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { logPlatformEvent } from '@/app/lib/platformEvents'
import type { TranslationKey } from '@/lib/translations'

export type ChatMessage = { role: string; content: string; at?: string }

export const TOKEN_STORAGE_KEY = 'hjerterum_los_anonymous_token'

function botReply(userText: string, t: (key: TranslationKey) => string): string {
  const lower = userText.toLowerCase()
  if (/bolig|hus|leie|sove/.test(lower)) return t('losReplyHousing')
  if (/hjelp|krise|redd/.test(lower)) return t('losReplyCrisis')
  if (/hei|hallo|hello/.test(lower)) return t('losReplyHello')
  return t('losReplyDefault')
}

async function fetchLosReply(
  userText: string,
  t: (key: TranslationKey) => string
): Promise<string> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (url && anon) {
    try {
      const res = await fetch(`${url}/functions/v1/los-chat`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${anon}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userText }),
      })
      if (res.ok) {
        const data = (await res.json()) as { reply?: string }
        if (data.reply?.trim()) return data.reply.trim()
      }
    } catch {
      /* fallback below */
    }
  }
  return botReply(userText, t)
}

type UseLosChatOptions = {
  /** Start or resume session on mount (full /los page). Widget uses lazy init. */
  autoStart?: boolean
  welcomeKey?: TranslationKey
  t: (key: TranslationKey) => string
}

export function useLosChat({ autoStart = true, welcomeKey = 'losWelcome', t }: UseLosChatOptions) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [anonymousToken, setAnonymousToken] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [handedOff, setHandedOff] = useState(false)
  const [busy, setBusy] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const initStarted = useRef(false)

  const initSession = useCallback(async () => {
    if (initStarted.current || sessionReady) return
    initStarted.current = true
    setIsInitializing(true)

    try {
      const storedToken =
        typeof window !== 'undefined' ? localStorage.getItem(TOKEN_STORAGE_KEY) : null

      if (storedToken) {
        const { data: resumeData } = await supabase.rpc('los_resume_session', {
          p_anonymous_token: storedToken,
        })
        const resume = resumeData as {
          ok?: boolean
          session_id?: string
          messages?: ChatMessage[]
          handed_off_at?: string | null
        } | null
        if (resume?.ok && resume.session_id) {
          setSessionId(resume.session_id)
          setAnonymousToken(storedToken)
          setMessages((resume.messages as ChatMessage[]) ?? [])
          setHandedOff(Boolean(resume.handed_off_at))
          setSessionReady(true)
          return
        }
        localStorage.removeItem(TOKEN_STORAGE_KEY)
      }

      const { data: startData, error } = await supabase.rpc('los_start_session')
      const start = startData as {
        ok?: boolean
        session_id?: string
        anonymous_token?: string
      } | null
      if (!error && start?.ok && start.session_id && start.anonymous_token) {
        setSessionId(start.session_id)
        setAnonymousToken(start.anonymous_token)
        localStorage.setItem(TOKEN_STORAGE_KEY, start.anonymous_token)
        const welcome: ChatMessage[] = [{ role: 'assistant', content: t(welcomeKey) }]
        setMessages(welcome)
        await supabase.rpc('los_append_message', {
          p_session_id: start.session_id,
          p_role: 'assistant',
          p_content: t(welcomeKey),
          p_anonymous_token: start.anonymous_token,
        })
        setSessionReady(true)
      }
    } finally {
      setIsInitializing(false)
    }
  }, [sessionReady, t, welcomeKey])

  useEffect(() => {
    if (autoStart) void initSession()
  }, [autoStart, initSession])

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || !sessionId || handedOff || busy) return false
      setBusy(true)
      const userMsg: ChatMessage = { role: 'user', content: trimmed, at: new Date().toISOString() }
      const next = [...messages, userMsg]
      setMessages(next)
      await supabase.rpc('los_append_message', {
        p_session_id: sessionId,
        p_role: 'user',
        p_content: trimmed,
        p_anonymous_token: anonymousToken,
      })
      const reply = await fetchLosReply(trimmed, t)
      const botMsg: ChatMessage = {
        role: 'assistant',
        content: reply,
        at: new Date().toISOString(),
      }
      setMessages([...next, botMsg])
      await supabase.rpc('los_append_message', {
        p_session_id: sessionId,
        p_role: 'assistant',
        p_content: reply,
        p_anonymous_token: anonymousToken,
      })
      void logPlatformEvent({
        source: 'los',
        code: 'chat_turn',
        message: 'Los chat turn completed',
        metadata: { session_id: sessionId },
      })
      setBusy(false)
      return true
    },
    [anonymousToken, busy, handedOff, messages, sessionId, t]
  )

  return {
    sessionId,
    anonymousToken,
    messages,
    handedOff,
    busy,
    isInitializing,
    sessionReady,
    initSession,
    send,
    setMessages,
    setHandedOff,
  }
}
