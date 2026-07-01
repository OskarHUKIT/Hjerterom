'use client'

import { useRef, type ReactNode } from 'react'
import { ImagePlus, Send, X } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { useToast } from '@/app/components/design-system'
import { OptimizedPublicStorageImage } from '@/app/components/OptimizedPublicStorageImage'
import { Button } from '@/app/components/ui/Button'
import { MAX_FILE_SIZE_MB } from '@/features/messaging/lib/chatSend'

export const MAX_IMAGES_PER_MESSAGE = 4

export type ChatComposerVariant = 'nav' | 'inline'

type Props = {
  variant: ChatComposerVariant
  value: string
  onChange: (value: string) => void
  onSend: () => void
  disabled?: boolean
  sending?: boolean
  placeholder?: string
  quickRepliesSlot?: ReactNode
  /** Nav variant: pending image preview URLs. */
  imagePreviews?: string[]
  onImageSelect?: (files: File[]) => void
  onRemovePendingImage?: (index: number) => void
  /** Inline variant: show Send icon in button. */
  showSendIcon?: boolean
  className?: string
  style?: React.CSSProperties
}

export default function ChatComposer({
  variant,
  value,
  onChange,
  onSend,
  disabled = false,
  sending = false,
  placeholder,
  quickRepliesSlot,
  imagePreviews = [],
  onImageSelect,
  onRemovePendingImage,
  showSendIcon = false,
  className,
  style,
}: Props) {
  const { t } = useLanguage()
  const toast = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : []
    e.target.value = ''
    const valid = files.filter((f) => {
      if (!f.type.startsWith('image/')) return false
      if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        toast(`«${f.name}» er for stor. Maks ${MAX_FILE_SIZE_MB} MB.`, 'error')
        return false
      }
      return true
    })
    if (!onImageSelect || valid.length === 0) return
    const total = imagePreviews.length + valid.length
    if (total > MAX_IMAGES_PER_MESSAGE) {
      onImageSelect(valid.slice(0, MAX_IMAGES_PER_MESSAGE - imagePreviews.length))
    } else {
      onImageSelect(valid)
    }
  }

  const canSend = !disabled && (value.trim().length > 0 || imagePreviews.length > 0)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !disabled) {
      e.preventDefault()
      onSend()
    }
  }

  if (variant === 'inline') {
    return (
      <>
        {quickRepliesSlot}
        <div style={{ padding: 12, borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 8, ...style }}>
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder ?? t('finnInquiryMessage')}
            disabled={disabled || sending}
            onKeyDown={handleKeyDown}
            style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)' }}
          />
          <Button type="button" variant="accent" disabled={sending || !value.trim()} onClick={onSend}>
            {showSendIcon ? <Send size={16} aria-hidden /> : null}{' '}
            {t('losSend')}
          </Button>
        </div>
      </>
    )
  }

  return (
    <div
      className={className ?? 'messages-thread-composer'}
      style={{
        padding: 'var(--space-4)',
        paddingBottom: 'calc(var(--space-4) + var(--mobile-bottom-nav-total, 0px))',
        borderTop: '1px solid var(--border-subtle)',
        flexShrink: 0,
        background: 'var(--bg-card)',
        ...style,
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
              {onRemovePendingImage ? (
                <button
                  type="button"
                  onClick={() => onRemovePendingImage(i)}
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
              ) : null}
            </div>
          ))}
        </div>
      )}
      {quickRepliesSlot}
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
          disabled={disabled || imagePreviews.length >= MAX_IMAGES_PER_MESSAGE}
          style={{
            flexShrink: 0,
            width: 44,
            height: 44,
            borderRadius: '10px',
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-subtle)',
            color: 'var(--text-main)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ImagePlus size={22} />
        </button>
        <input
          className="input"
          placeholder={placeholder ?? t('messagesPlaceholder')}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          style={{ flex: 1, marginBottom: 0, opacity: disabled ? 0.6 : 1 }}
        />
        <button
          type="button"
          onClick={onSend}
          disabled={!canSend}
          className="button"
          aria-label={t('messagesSendAria')}
          title={t('messagesSendAria')}
          style={{ padding: 'var(--space-3) var(--space-5)' }}
        >
          {sending ? <Send size={18} style={{ opacity: 0.5 }} /> : <Send size={18} />}
        </button>
      </div>
    </div>
  )
}
