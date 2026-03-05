'use client'

import { use, useState, useEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { 
  MessageSquare, Send, ArrowLeft, User, ChevronRight, ImagePlus, X
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatDateTimeNo } from '../../lib/dateFormat'
import { useLanguage } from '../../../context/LanguageContext'

const CHAT_IMAGES_BUCKET = 'chat-images'
const MAX_IMAGES_PER_MESSAGE = 4
const MAX_FILE_SIZE_MB = 5

function MessagesContent() {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const withUserId = searchParams.get('with')
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [role, setRole] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [pendingImages, setPendingImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [conversations, setConversations] = useState<{ userId: string; name: string; lastMessage: string; lastAt: string }[]>([])
  const [otherUser, setOtherUser] = useState<any>(null)

  const isKommune = role === 'kommune_ansatt'

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user)
      if (!user) return
      supabase.from('profiles').select('role').eq('id', user.id).maybeSingle().then(({ data }) => {
        setRole(data?.role || user.user_metadata?.role || 'homeowner')
      })
    })
  }, [])

  useEffect(() => {
    if (!currentUser) return

    const fetchConversations = async () => {
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
      msgs.forEach(m => {
        const peer = m.sender_id === currentUser.id ? m.receiver_id : m.sender_id
        if (peer) peerIds.add(peer)
        else if (m.sender_id !== currentUser.id) peerIds.add(m.sender_id)
      })

      const peers = await Promise.all(
        Array.from(peerIds).map(async (pid) => {
          const { data: name } = await supabase.rpc('get_user_display_name', { p_user_id: pid })
          const last = msgs.find(m => (m.sender_id === pid || m.receiver_id === pid))
          return {
            userId: pid,
            name: name ?? 'Ukjent bruker',
            lastMessage: (last?.content?.trim()?.slice(0, 40) || (last?.image_urls?.length ? '[Bilde]' : '')) + (last?.content?.length > 40 ? '...' : '') || '',
            lastAt: last?.created_at || ''
          }
        })
      )
      setConversations(peers.sort((a, b) => (b.lastAt > a.lastAt ? 1 : -1)))
    }

    if (isKommune && !withUserId) {
      fetchConversations()
    }
    setLoading(false)
  }, [currentUser, isKommune, withUserId])

  useEffect(() => {
    if (!currentUser) return
    const isHomeownerChat = !isKommune
    const isKommuneChat = isKommune && withUserId
    if (!isHomeownerChat && !isKommuneChat) {
      setMessages([])
      setOtherUser(null)
      return
    }

    if (isKommuneChat) {
      const loadOtherUser = async () => {
        const { data: name } = await supabase.rpc('get_user_display_name', { p_user_id: withUserId })
        setOtherUser({ id: withUserId, name: name ?? 'Ukjent bruker' })
      }
      loadOtherUser()
    } else {
      setOtherUser({ id: null, name: 'Kommune' })
    }

    const fetchMessages = async () => {
      let query = supabase.from('chat_messages').select('*')
      if (isHomeownerChat) {
        query = query.or(`and(sender_id.eq.${currentUser.id},receiver_id.is.null),receiver_id.eq.${currentUser.id}`)
      } else {
        query = query.or(
          `and(sender_id.eq.${currentUser.id},receiver_id.eq.${withUserId}),and(sender_id.eq.${withUserId},receiver_id.eq.${currentUser.id}),and(sender_id.eq.${withUserId},receiver_id.is.null)`
        )
      }
      const { data } = await query.order('created_at', { ascending: true })
      setMessages(data || [])
    }
    fetchMessages()

    const channelId = isHomeownerChat ? `chat:${currentUser.id}:kommune` : `chat:${currentUser.id}:${withUserId}`
    const sub = supabase
      .channel(channelId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, () => fetchMessages())
      .subscribe()

    return () => { sub.unsubscribe() }
  }, [currentUser, withUserId, isKommune])

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : []
    e.target.value = ''
    const valid = files.filter(f => {
      if (!f.type.startsWith('image/')) return false
      if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        alert(`«${f.name}» er for stor. Maks ${MAX_FILE_SIZE_MB} MB.`)
        return false
      }
      return true
    })
    const total = pendingImages.length + valid.length
    if (total > MAX_IMAGES_PER_MESSAGE) {
      setPendingImages(prev => prev.concat(valid.slice(0, MAX_IMAGES_PER_MESSAGE - prev.length)))
      setImagePreviews(prev => {
        const next = [...prev]
        valid.slice(0, MAX_IMAGES_PER_MESSAGE - pendingImages.length).forEach(f => {
          const url = URL.createObjectURL(f)
          next.push(url)
        })
        return next
      })
    } else {
      setPendingImages(prev => prev.concat(valid))
      setImagePreviews(prev => [...prev, ...valid.map(f => URL.createObjectURL(f))])
    }
  }

  const removePendingImage = (index: number) => {
    setPendingImages(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => {
      URL.revokeObjectURL(prev[index])
      return prev.filter((_, i) => i !== index)
    })
  }

  const sendMessage = async () => {
    const content = newMessage.trim()
    const hasImages = pendingImages.length > 0
    if ((!content && !hasImages) || !currentUser) return
    setSending(true)
    const effectiveReceiver = isKommune ? withUserId : null
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
        setImagePreviews(prev => { prev.forEach(URL.revokeObjectURL); return [] })
      }

      const { data: inserted, error } = await supabase.from('chat_messages').insert({
        sender_id: currentUser.id,
        receiver_id: effectiveReceiver ?? null,
        content: content || '',
        image_urls: imageUrls
      }).select('id, created_at').maybeSingle()
      if (error) throw error
      setNewMessage('')
      setMessages(prev => [...prev, {
        id: inserted?.id ?? crypto.randomUUID(),
        sender_id: currentUser.id,
        receiver_id: effectiveReceiver ?? null,
        content: content || '',
        image_urls: imageUrls.length > 0 ? imageUrls : [],
        created_at: inserted?.created_at ?? new Date().toISOString(),
        is_read: false
      }])

      const senderName = currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || (isKommune ? 'Kommune' : 'En utleier')
      if (effectiveReceiver) {
        await supabase.from('notifications').insert({
          owner_id: effectiveReceiver,
          type: 'NEW_MESSAGE',
          title: `Ny melding fra ${senderName}`,
          message: `${senderName} har sendt deg en melding.`,
          status: 'unread',
          related_user_id: currentUser.id
        })
      }
    } catch (err: any) {
      alert('Feil ved sending: ' + (err?.message || String(err)))
    } finally {
      setSending(false)
    }
  }

  if (!currentUser) {
    return (
      <main className="container">
        <div className="card" style={{ minHeight: '400px' }} />
      </main>
    )
  }

  const showChat = isKommune ? withUserId : true
  const chatWithId = isKommune ? withUserId : null

  return (
    <main className="container">
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <Link href={isKommune ? '/nav/users' : '/homeowner/manage'} className="nav-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginLeft: '-1rem' }}>
          <ArrowLeft size={18} /> {t('back')}
        </Link>
        <h1 style={{ fontSize: '2rem', marginTop: 'var(--space-2)' }}>{t('messages')}</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isKommune && !withUserId ? '280px 1fr' : '1fr', gap: 'var(--space-6)', minHeight: '400px' }}>
        {isKommune && (
          <aside className="card" style={{ padding: 'var(--space-4)', overflow: 'hidden', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <h3 style={{ marginBottom: 'var(--space-4)', fontSize: '1rem', flexShrink: 0 }}>{t('conversations')}</h3>
            {conversations.length === 0 ? (
              <p className="text-sm" style={{ opacity: 0.6 }}>{t('noMessagesYet')}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', minWidth: 0, overflow: 'auto' }}>
                {conversations.map(c => (
                  <Link
                    key={c.userId}
                    href={`/nav/messages?with=${c.userId}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3)',
                      borderRadius: '10px', background: withUserId === c.userId ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.03)',
                      textDecoration: 'none', color: 'inherit', minWidth: 0
                    }}
                  >
                    <div style={{ width: '36px', height: '36px', flexShrink: 0, borderRadius: '50%', background: 'rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={16} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                      <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                      <div className="text-sm" style={{ opacity: 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.lastMessage}</div>
                    </div>
                    <ChevronRight size={16} style={{ opacity: 0.5, flexShrink: 0 }} />
                  </Link>
                ))}
              </div>
            )}
          </aside>
        )}

        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0, minHeight: '400px' }}>
          {showChat && (withUserId || !isKommune) ? (
            <>
              <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <MessageSquare size={20} style={{ color: 'var(--color-sky-blue)' }} />
                <span style={{ fontWeight: 600 }}>
                  {isKommune && withUserId ? (otherUser ? `Chat med ${otherUser.name}` : 'Chat') : 'Chat med Kommune'}
                </span>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {messages.map(m => {
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
                        border: isMe ? 'none' : '1px solid var(--border-subtle)'
                      }}
                    >
                      {urls.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: m.content ? '8px' : 0 }}>
                          {urls.map((url: string, i: number) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', borderRadius: '8px', overflow: 'hidden', maxWidth: '200px', maxHeight: '200px' }}>
                              <img src={url} alt="" style={{ width: '100%', height: 'auto', maxHeight: '200px', objectFit: 'cover', verticalAlign: 'middle' }} />
                            </a>
                          ))}
                        </div>
                      )}
                      {m.content ? <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{m.content}</p> : null}
                      <div style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: '4px' }}>
                        {formatDateTimeNo(m.created_at)}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--border-subtle)' }}>
                {imagePreviews.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: 'var(--space-3)' }}>
                    {imagePreviews.map((url, i) => (
                      <div key={i} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', width: '64px', height: '64px' }}>
                        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          type="button"
                          onClick={() => removePendingImage(i)}
                          aria-label="Fjern bilde"
                          style={{ position: 'absolute', top: 2, right: 2, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
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
                    title="Legg til bilde(r)"
                    disabled={pendingImages.length >= MAX_IMAGES_PER_MESSAGE}
                    style={{ flexShrink: 0, width: 44, height: 44, borderRadius: '10px', border: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <ImagePlus size={22} />
                  </button>
                  <input
                    className="input"
                    placeholder="Skriv en melding..."
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                    style={{ flex: 1, marginBottom: 0 }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={sending || (!newMessage.trim() && pendingImages.length === 0)}
                    className="button"
                    style={{ padding: 'var(--space-3) var(--space-5)' }}
                  >
                    {sending ? <Send size={18} style={{ opacity: 0.5 }} /> : <Send size={18} />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <div style={{ textAlign: 'center' }}>
                <MessageSquare size={48} style={{ opacity: 0.3, marginBottom: 'var(--space-4)' }} />
                <p>Velg en samtale til venstre, eller start en ny chat fra brukerlisten.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> }

export default function MessagesPage(props: PageProps) {
  use(props.searchParams ?? Promise.resolve({}))
  return (
    <Suspense fallback={<div className="container" style={{ minHeight: '80vh' }} />}>
      <MessagesContent />
    </Suspense>
  )
}
