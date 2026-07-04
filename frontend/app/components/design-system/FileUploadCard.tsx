'use client'

import { useCallback, useRef, useState } from 'react'
import {
  FileUploadCard as FileUploadCardUi,
  type UploadedFile,
} from '@/app/components/ui/file-upload-card'
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
  file?: File
}

type Props = {
  title: string
  hint: string
  progressLabel: (pct: number) => string
  queuedLabel?: string
  browseLabel?: string
  dropzoneTitle?: string
  uploadingLabel?: string
  completedLabel?: string
  errorLabel?: string
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

function mapItemStatus(status: FileUploadCardItem['status']): UploadedFile['status'] {
  switch (status) {
    case 'uploading':
      return 'uploading'
    case 'done':
      return 'completed'
    case 'error':
      return 'error'
    case 'queued':
    default:
      return 'queued'
  }
}

function itemToUploadedFile(item: FileUploadCardItem, file?: File): UploadedFile {
  const resolvedFile =
    file ??
    new File([], item.name, {
      type: item.previewUrl ? 'image/jpeg' : 'application/octet-stream',
    })

  return {
    id: item.id,
    file: resolvedFile,
    progress: item.progress,
    status: mapItemStatus(item.status),
  }
}

/** Drag-drop upload card with per-file progress (Boly tokens + shadcn UI). */
export default function FileUploadCard({
  title,
  hint,
  progressLabel,
  queuedLabel,
  browseLabel,
  dropzoneTitle,
  uploadingLabel,
  completedLabel,
  errorLabel,
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
  const [internalItems, setInternalItems] = useState<
    Array<FileUploadCardItem & { file: File }>
  >([])
  const busyRef = useRef(false)
  const fileByIdRef = useRef<Map<string, File>>(new Map())

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
        fileByIdRef.current.set(id, file)
        setInternalItems((prev) => [
          ...prev,
          { id, name: file.name, progress: 0, status: 'uploading', file },
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

  const handleFilesChange = (files: File[]) => {
    void processFiles(files)
  }

  const handleFileRemove = (id: string) => {
    if (onRemoveStaged) {
      onRemoveStaged(id)
      return
    }
    setInternalItems((prev) => {
      const target = prev.find((item) => item.id === id)
      if (target?.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(target.previewUrl)
      fileByIdRef.current.delete(id)
      return prev.filter((item) => item.id !== id)
    })
  }

  const uploadedFiles: UploadedFile[] = items.map((item) => {
    const file =
      item.file ??
      fileByIdRef.current.get(item.id) ??
      new File([], item.name, { type: 'application/octet-stream' })
    return itemToUploadedFile(item, file)
  })

  return (
    <FileUploadCardUi
      className={className}
      files={uploadedFiles}
      accept={accept}
      disabled={zoneDisabled}
      labels={{
        title,
        dropzoneTitle: dropzoneTitle ?? title,
        dropzoneHint: hint,
        browseLabel: browseLabel ?? 'Browse file',
        uploadingLabel: uploadingLabel ?? progressLabel(0),
        completedLabel: completedLabel ?? progressLabel(100),
        queuedLabel: queuedLabel ?? progressLabel(0),
        errorLabel: errorLabel ?? queuedLabel ?? progressLabel(0),
      }}
      onFilesChange={handleFilesChange}
      onFileRemove={handleFileRemove}
    />
  )
}

export { isListingImageFile, filterListingImageFiles }
