'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { UploadedFile } from '@/components/ui/file-upload-card'
import {
  entriesToPersistPayload,
  listingImagePathFromPublicUrl,
  type ListingImageEntry,
} from '@/features/listings/lib/listingImageMetadata'
import {
  MAX_LISTING_IMAGES,
  persistListingImages,
  prepareListingImageFile,
  removeListingImageFromStorage,
  uploadListingImageToStorage,
  validateListingImageFile,
} from '@/features/listings/lib/listingImageUpload'

export type UseImageUploadMode = 'immediate' | 'staging'

export type UseImageUploadOptions = {
  mode: UseImageUploadMode
  listingId?: string
  supabase?: SupabaseClient
  maxImages?: number
  initialEntries?: ListingImageEntry[]
  defaultAlt?: string
  disabled?: boolean
  onPersist?: (payload: ReturnType<typeof entriesToPersistPayload>) => void | Promise<void>
  onError?: (code: 'invalid_type' | 'too_large' | 'max_files' | 'upload_failed' | 'gate') => void
  beforeUpload?: () => boolean
}

function newUploadId() {
  return crypto.randomUUID()
}

export function useImageUpload({
  mode,
  listingId,
  supabase,
  maxImages = MAX_LISTING_IMAGES,
  initialEntries = [],
  defaultAlt = '',
  disabled,
  onPersist,
  onError,
  beforeUpload,
}: UseImageUploadOptions) {
  const [entries, setEntries] = useState<ListingImageEntry[]>(initialEntries)
  const [uploadQueue, setUploadQueue] = useState<UploadedFile[]>([])
  const [busy, setBusy] = useState(false)
  const entriesRef = useRef(entries)
  entriesRef.current = entries
  const stagedFilesRef = useRef<Map<string, File>>(new Map())

  useEffect(() => {
    setEntries(initialEntries)
  }, [initialEntries])

  const persist = useCallback(
    async (next: ListingImageEntry[]) => {
      const payload = entriesToPersistPayload(next)
      if (onPersist) await onPersist(payload)
      if (supabase && listingId) {
        await persistListingImages(
          supabase,
          listingId,
          payload.image_urls,
          payload.image_alts
        )
      }
      setEntries(next)
    },
    [listingId, onPersist, supabase]
  )

  const removeUploadItem = useCallback((id: string) => {
    setUploadQueue((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const handleFilesChange = useCallback(
    async (rawFiles: File[]) => {
      if (disabled || busy) return
      if (beforeUpload && !beforeUpload()) {
        onError?.('gate')
        return
      }

      const slotsLeft = maxImages - entriesRef.current.length
      if (slotsLeft <= 0) {
        onError?.('max_files')
        return
      }

      const batch = rawFiles.slice(0, slotsLeft)
      if (batch.length < rawFiles.length) onError?.('max_files')

      for (const file of batch) {
        const validation = validateListingImageFile(file)
        if (validation) {
          onError?.(validation)
          continue
        }

        if (mode === 'staging') {
          const id = newUploadId()
          const previewUrl = URL.createObjectURL(file)
          stagedFilesRef.current.set(id, file)
          setEntries((prev) => [...prev, { id, url: previewUrl, alt: defaultAlt }])
          continue
        }

        if (!supabase || !listingId) return

        const uploadId = newUploadId()
        setUploadQueue((prev) => [
          ...prev,
          { id: uploadId, file, progress: 0, status: 'uploading' },
        ])
        setBusy(true)

        try {
          const prepared = await prepareListingImageFile(file)
          const url = await uploadListingImageToStorage(
            supabase,
            listingId,
            prepared,
            (pct) => {
              setUploadQueue((prev) =>
                prev.map((item) =>
                  item.id === uploadId ? { ...item, progress: pct, status: 'uploading' } : item
                )
              )
            }
          )
          setUploadQueue((prev) =>
            prev.map((item) =>
              item.id === uploadId ? { ...item, progress: 100, status: 'completed' } : item
            )
          )
          const next = [
            ...entriesRef.current,
            { id: newUploadId(), url, alt: defaultAlt },
          ]
          await persist(next)
          window.setTimeout(() => removeUploadItem(uploadId), 1200)
        } catch {
          setUploadQueue((prev) =>
            prev.map((item) =>
              item.id === uploadId ? { ...item, status: 'error', progress: 0 } : item
            )
          )
          onError?.('upload_failed')
        } finally {
          setBusy(false)
        }
      }
    },
    [
      beforeUpload,
      busy,
      defaultAlt,
      disabled,
      listingId,
      maxImages,
      mode,
      onError,
      persist,
      removeUploadItem,
      supabase,
    ]
  )

  const removePhoto = useCallback(
    async (id: string) => {
      if (disabled) return
      const target = entriesRef.current.find((e) => e.id === id)
      if (!target) return

      if (mode === 'staging') {
        if (target.url.startsWith('blob:')) URL.revokeObjectURL(target.url)
        stagedFilesRef.current.delete(id)
        setEntries((prev) => prev.filter((e) => e.id !== id))
        return
      }

      if (supabase) {
        const path = listingImagePathFromPublicUrl(target.url)
        if (path) {
          try {
            await removeListingImageFromStorage(supabase, path)
          } catch {
            /* best effort */
          }
        }
      }
      await persist(entriesRef.current.filter((e) => e.id !== id))
    },
    [disabled, mode, persist, supabase]
  )

  const reorderPhoto = useCallback(
    async (fromIndex: number, toIndex: number) => {
      if (disabled) return
      const list = [...entriesRef.current]
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= list.length || toIndex >= list.length) {
        return
      }
      const [moved] = list.splice(fromIndex, 1)
      list.splice(toIndex, 0, moved)
      await persist(list)
    },
    [disabled, persist]
  )

  const movePhotoEarlier = useCallback(
    (index: number) => reorderPhoto(index, index - 1),
    [reorderPhoto]
  )

  const movePhotoLater = useCallback(
    (index: number) => reorderPhoto(index, index + 1),
    [reorderPhoto]
  )

  const updateAlt = useCallback(
    async (id: string, alt: string) => {
      if (disabled) return
      const next = entriesRef.current.map((e) => (e.id === id ? { ...e, alt } : e))
      if (mode === 'staging') {
        setEntries(next)
        return
      }
      await persist(next)
    },
    [disabled, mode, persist]
  )

  const getStagedFiles = useCallback((): File[] => {
    return entriesRef.current
      .filter((e) => e.url.startsWith('blob:'))
      .map((e) => stagedFilesRef.current.get(e.id))
      .filter((f): f is File => f instanceof File)
  }, [])

  const getStagedAlts = useCallback((): string[] => {
    return entriesRef.current.filter((e) => e.url.startsWith('blob:')).map((e) => e.alt)
  }, [])

  return {
    entries,
    setEntries,
    uploadQueue,
    busy,
    handleFilesChange,
    removeUploadItem,
    removePhoto,
    reorderPhoto,
    movePhotoEarlier,
    movePhotoLater,
    updateAlt,
    getStagedFiles,
    getStagedAlts,
    persist,
  }
}
