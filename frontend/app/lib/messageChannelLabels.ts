import type { TranslationKey } from '@/lib/translations'

export type MessageChannelType = 'social_caseworker' | 'event_caseworker' | 'guest_booking'

export function channelLabelKey(channel: string | null | undefined): TranslationKey {
  switch (channel) {
    case 'event_caseworker':
      return 'msgChannelEvent'
    case 'guest_booking':
      return 'msgChannelGuest'
    default:
      return 'msgChannelSocial'
  }
}

export function channelBadgeEmoji(channel: string | null | undefined): string {
  switch (channel) {
    case 'event_caseworker':
      return '🎫'
    case 'guest_booking':
      return '🧳'
    default:
      return '🏛️'
  }
}
