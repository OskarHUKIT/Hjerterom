'use client'

import { OptimizedPublicStorageImage } from '@/app/components/OptimizedPublicStorageImage'

export type ChatBubbleVariant = 'nav' | 'event_staff' | 'guest'

export type ChatBubbleMessage = {
  id: string
  content?: string | null
  created_at: string
  image_urls?: string[] | null
}

type Props = {
  message: ChatBubbleMessage
  isMine: boolean
  variant: ChatBubbleVariant
  formatTimestamp: (value: string) => string
  senderCaption?: string | null
  /** Nav variant only: wider bubbles on compact mobile. */
  compactMobile?: boolean
}

const variantStyles: Record<
  ChatBubbleVariant,
  {
    mineBg: string
    otherBg: string
    border: (isMine: boolean) => string | undefined
    padding: string
    maxWidth: (compactMobile?: boolean) => string
    fontSize?: string
    timestampOpacity: number
    showSenderWhenMine: boolean
  }
> = {
  nav: {
    mineBg: 'var(--color-royal-blue)',
    otherBg: 'rgba(255,255,255,0.06)',
    border: (isMine) => (isMine ? undefined : '1px solid var(--border-subtle)'),
    padding: 'var(--space-3) var(--space-4)',
    maxWidth: (compactMobile) => (compactMobile ? '92%' : '85%'),
    timestampOpacity: 0.7,
    showSenderWhenMine: true,
  },
  event_staff: {
    mineBg: 'rgba(168, 85, 247, 0.15)',
    otherBg: 'rgba(0,0,0,0.05)',
    border: () => undefined,
    padding: '8px 12px',
    maxWidth: () => '85%',
    timestampOpacity: 0.5,
    showSenderWhenMine: false,
  },
  guest: {
    mineBg: 'rgba(59, 130, 246, 0.15)',
    otherBg: 'rgba(0,0,0,0.05)',
    border: () => undefined,
    padding: '8px 12px',
    maxWidth: () => '85%',
    fontSize: '0.88rem',
    timestampOpacity: 0.55,
    showSenderWhenMine: false,
  },
}

export default function ChatMessageBubble({
  message,
  isMine,
  variant,
  formatTimestamp,
  senderCaption,
  compactMobile,
}: Props) {
  const styles = variantStyles[variant]
  const urls = (message.image_urls || []).filter(Boolean)
  const showCaption =
    senderCaption && (styles.showSenderWhenMine || !isMine)

  return (
    <div
      style={{
        alignSelf: isMine ? 'flex-end' : 'flex-start',
        maxWidth: styles.maxWidth(compactMobile),
        padding: styles.padding,
        borderRadius: '12px',
        background: isMine ? styles.mineBg : styles.otherBg,
        border: styles.border(isMine),
        fontSize: styles.fontSize,
      }}
    >
      {showCaption ? (
        <div
          style={{
            fontSize: variant === 'nav' ? '0.65rem' : '0.72rem',
            fontWeight: 600,
            opacity: variant === 'nav' ? 0.72 : 0.65,
            marginBottom: variant === 'nav' ? 6 : 4,
            letterSpacing: variant === 'nav' ? '0.02em' : undefined,
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
            marginBottom: message.content ? '8px' : 0,
          }}
        >
          {urls.map((url, i) => (
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
      {message.content ? (
        variant === 'nav' ? (
          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{message.content}</p>
        ) : (
          <div>{message.content}</div>
        )
      ) : null}
      <div
        style={{
          fontSize: variant === 'nav' ? '0.7rem' : '0.72rem',
          opacity: styles.timestampOpacity,
          marginTop: '4px',
        }}
      >
        {formatTimestamp(message.created_at)}
      </div>
    </div>
  )
}
