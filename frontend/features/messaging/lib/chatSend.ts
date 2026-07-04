import { supabase } from '@/app/lib/supabase'

export const CHAT_IMAGES_BUCKET = 'chat-images'
export const MAX_FILE_SIZE_MB = 5

export type ChatMessageRow = {
  id: string
  sender_id: string
  receiver_id: string | null
  content: string
  image_urls: string[]
  created_at: string
  is_read?: boolean
}

async function uploadChatImages(senderId: string, files: File[]): Promise<string[]> {
  const imageUrls: string[] = []
  for (const file of files) {
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${senderId}/${crypto.randomUUID()}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from(CHAT_IMAGES_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false })
    if (uploadError) throw uploadError
    const { data: urlData } = supabase.storage.from(CHAT_IMAGES_BUCKET).getPublicUrl(path)
    imageUrls.push(urlData.publicUrl)
  }
  return imageUrls
}

async function insertMessageNotifications(
  notifyUserIds: string[],
  senderId: string,
  senderName: string,
  content: string,
  imageUrls: string[]
) {
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
      related_user_id: senderId,
    })
  }
}

export async function sendSocialCaseworkerMessage(opts: {
  senderId: string
  senderName: string
  content: string
  serviceAreaId: string
  receiverId: string | null
  notifyUserIds: string[]
  pendingImages?: File[]
}): Promise<ChatMessageRow> {
  const imageUrls =
    opts.pendingImages && opts.pendingImages.length > 0
      ? await uploadChatImages(opts.senderId, opts.pendingImages)
      : []

  const { data: inserted, error } = await supabase
    .from('chat_messages')
    .insert({
      sender_id: opts.senderId,
      receiver_id: opts.receiverId,
      content: opts.content || '',
      image_urls: imageUrls,
      service_area_id: opts.serviceAreaId,
      channel_type: 'social_caseworker',
    })
    .select('id, created_at')
    .maybeSingle()
  if (error) throw error

  if (opts.notifyUserIds.length > 0) {
    await insertMessageNotifications(
      opts.notifyUserIds,
      opts.senderId,
      opts.senderName,
      opts.content,
      imageUrls
    )
  }

  return {
    id: inserted?.id ?? crypto.randomUUID(),
    sender_id: opts.senderId,
    receiver_id: opts.receiverId,
    content: opts.content || '',
    image_urls: imageUrls.length > 0 ? imageUrls : [],
    created_at: inserted?.created_at ?? new Date().toISOString(),
    is_read: false,
  }
}

/** Landlord broadcast in shared event channel (no direct receiver). */
export async function sendEventCaseworkerBroadcast(opts: {
  senderId: string
  eventId: string
  content: string
}): Promise<ChatMessageRow> {
  const { error } = await supabase.from('chat_messages').insert({
    sender_id: opts.senderId,
    receiver_id: null,
    content: opts.content || '',
    event_id: opts.eventId,
    channel_type: 'event_caseworker',
  })
  if (error) throw error

  return {
    id: crypto.randomUUID(),
    sender_id: opts.senderId,
    receiver_id: null,
    content: opts.content || '',
    image_urls: [],
    created_at: new Date().toISOString(),
    is_read: false,
  }
}

/** Event staff → landlord direct message with notification. */
export async function sendEventCaseworkerDirect(opts: {
  senderId: string
  receiverId: string
  eventId: string
  content: string
  notificationTitle: string
}): Promise<void> {
  const { error } = await supabase.from('chat_messages').insert({
    sender_id: opts.senderId,
    receiver_id: opts.receiverId,
    event_id: opts.eventId,
    channel_type: 'event_caseworker',
    content: opts.content,
  })
  if (error) throw error

  await supabase.from('notifications').insert({
    owner_id: opts.receiverId,
    type: 'NEW_MESSAGE',
    title: opts.notificationTitle,
    message: opts.content.slice(0, 200),
    status: 'unread',
  })
}

export type GuestBookingSendResult =
  | { ok: true }
  | { ok: false; error: string }

export async function sendGuestBookingMessage(opts: {
  bookingId: string
  content: string
}): Promise<GuestBookingSendResult> {
  const { data, error } = await supabase.rpc('send_booking_message', {
    p_booking_id: opts.bookingId,
    p_content: opts.content,
  })
  if (error || data?.ok === false) {
    return { ok: false, error: String(data?.error ?? error?.message ?? '') }
  }
  return { ok: true }
}
