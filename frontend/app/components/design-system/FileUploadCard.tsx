'use client'

import { useCallback, useId, useRef, useState } from 'react'
import { Check, ImagePlus, Upload, X } from 'lucide-react'
import {
  filterListingImageFiles,
  isListingImageFile,
} from '@/features/listings/lib/listingImageUpload'

export type FileUploadCardItem = {
  id: string
  name: string
  progress: number
  status: 'queued' | 'uploading' | 'done' | 'error'
  previewUrl?: string
}

type Props = {
  title: string
  hint: string
  progressLabel: (pct: number) => string
  queuedLabel?: string
  accept?: string
  maxFiles: number
  currentCount?: number
  disabled?: boolean
  className?: string
  /** Immediate upload — returns when file is stored. */
  uploadFile?: (file: File, onProgress: (pct: number) => void) => Promise<void>
  /** Local staging when uploadFile is omitted (register flow). */
  onFilesSelected?: (files: File[]) => void
  stagedItems?: FileUploadCardItem[]
  onRemoveStaged?: (id: string) => void
  onUploadError?: (message: string) => void
}

function newItemId() {
  return crypto.randomUUID()
}

/** ravikatiyar162/file-upload-card — drag-drop card with per-file progress (Boly tokens). */
export default function FileUploadCard({
  title,
  hint,
  progressLabel,
  queuedLabel,
  accept = 'image/*',
  maxFiles,
  currentCount = 0,
  disabled,
  className,
  uploadFile,
  onFilesSelected,
  stagedItems,
  onRemoveStaged,
  onUploadError,
}: Props) {
  const inputId = useId()
  const [active, setActive] = useState(false)
  const [internalItems, setInternalItems] = useState<FileUploadCardItem[]>([])
  const busyRef = useRef(false)

  const items = stagedItems ?? internalItems
  const occupiedCount = stagedItems
    ? currentCount
    : currentCount + items.filter((item) => item.status !== 'error').length
  const slotsLeft = Math.max(0, maxFiles - occupiedCount)
  const zoneDisabled = disabled || busyRef.current || slotsLeft <= 0

  const upsertItem = useCallback((id: string, patch: Partial<FileUploadCardItem>) => {
    setInternalItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }, [])

  const processFiles = useCallback(
    async (raw: File[]) => {
      if (zoneDisabled || !raw.length) return

      const images = filterListingImageFiles(raw)
      const rejected = raw.length - images.length
      if (rejected > 0) {
        onUploadError?.('invalid_type')
      }
      if (!images.length) return

      const batch = images.slice(0, slotsLeft)
      if (batch.length < images.length) {
        onUploadError?.('max_files')
      }

      if (!uploadFile && onFilesSelected) {
        onFilesSelected(batch)
        return
      }

      if (!uploadFile) return

      busyRef.current = true
      for (const file of batch) {
        const id = newItemId()
        const previewUrl = URL.createObjectURL(file)
        setInternalItems((prev) => [
          ...prev,
          { id, name: file.name, progress: 0, status: 'uploading', previewUrl },
        ])
        try {
          await uploadFile(file, (pct) => upsertItem(id, { progress: pct, status: 'uploading' }))
          upsertItem(id, { progress: 100, status: 'done' })
        } catch {
          upsertItem(id, { progress: 0, status: 'error' })
          onUploadError?.('upload_failed')
        }
      }
      busyRef.current = false
    },
    [onFilesSelected, onUploadError, slotsLeft, uploadFile, upsertItem, zoneDisabled]
  )

  const handleInput = (list: FileList | null) => {
    if (!list?.length) return
    void processFiles(Array.from(list))
  }

  const removeItem = (id: string) => {
    if (onRemoveStaged) {
      onRemoveStaged(id)
      return
    }
    setInternalItems((prev) => {
      const target = prev.find((item) => item.id === id)
      if (target?.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((item) => item.id !== id)
    })
  }

  return (
    <div className={`ds-file-upload-card${className ? ` ${className}` : ''}`}>
      <label
        htmlFor={inputId}
        className={`ds-file-upload-card__dropzone${active ? ' ds-file-upload-card__dropzone--active' : ''}${zoneDisabled ? ' ds-file-upload-card__dropzone--disabled' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          if (!zoneDisabled) setActive(true)
        }}
        onDragLeave={() => setActive(false)}
        onDrop={(e) => {
          e.preventDefault()
          setActive(false)
          if (!zoneDisabled) void processFiles(Array.from(e.dataTransfer.files))
        }}
      >
        <input
          id={inputId}
          type="file"
          accept={accept}
          multiple
          hidden
          disabled={zoneDisabled}
          onChange={(e) => {
            handleInput(e.target.files)
            e.target.value = ''
          }}
        />
        <Upload size={28} aria-hidden className="ds-file-upload-card__icon" />
        <p className="ds-file-upload-card__title">{title}</p>
        <p className="ds-file-upload-card__hint">{hint}</p>
      </label>

      {items.length > 0 ? (
        <ul className="ds-file-upload-card__list" aria-live="polite">
          {items.map((item) => (
            <li key={item.id} className={`ds-file-upload-card__item ds-file-upload-card__item--${item.status}`}>
              <div className="ds-file-upload-card__item-main">
                {item.previewUrl ? (
                  <img src={item.previewUrl} alt="" className="ds-file-upload-card__thumb" />
                ) : (
                  <span className="ds-file-upload-card__thumb-placeholder" aria-hidden>
                    <ImagePlus size={18} />
                  </span>
                )}
                <div className="ds-file-upload-card__item-body">
                  <span className="ds-file-upload-card__filename">{item.name}</span>
                  {item.status === 'uploading' ? (
                    <>
                      <div
                        className="ds-file-upload-card__progress-track"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={item.progress}
                        aria-label={progressLabel(item.progress)}
                      >
                        <div
                          className="ds-file-upload-card__progress-bar"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <span className="ds-file-upload-card__progress-text">
                        {progressLabel(item.progress)}
                      </span>
                    </>
                  ) : null}
                  {item.status === 'done' ? (
                    <span className="ds-file-upload-card__done">
                      <Check size={14} aria-hidden /> {progressLabel(100)}
                    </span>
                  ) : null}
                  {item.status === 'queued' ? (
                    <span className="ds-file-upload-card__queued">{queuedLabel ?? progressLabel(0)}</span>
                  ) : null}
                  {item.status === 'error' ? (
                    <span className="ds-file-upload-card__error">{queuedLabel ?? progressLabel(0)}</span>
                  ) : null}
                </div>
              </div>
              {onRemoveStaged || !uploadFile ? (
                <button
                  type="button"
                  className="ds-file-upload-card__remove"
                  aria-label={item.name}
                  onClick={() => removeItem(item.id)}
                >
                  <X size={16} />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export { isListingImageFile, filterListingImageFiles }
