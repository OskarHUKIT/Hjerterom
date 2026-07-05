import type { SupabaseClient } from '@supabase/supabase-js'
import { compressListingImage } from './listingImageCompress'

/** Max gallery images per listing (NPD-5 #18). */
export const MAX_LISTING_IMAGES = 20

/** Max file size before compression (10 MB). */
export const MAX_LISTING_IMAGE_BYTES = 10 * 1024 * 1024

export const LISTING_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp'

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])

export type ListingImageValidationError = 'invalid_type' | 'too_large'

export function isListingImageFile(file: File): boolean {
  return ALLOWED_MIME.has(file.type)
}

export function validateListingImageFile(file: File): ListingImageValidationError | null {
  if (!isListingImageFile(file)) return 'invalid_type'
  if (file.size > MAX_LISTING_IMAGE_BYTES) return 'too_large'
  return null
}

export function filterListingImageFiles(files: File[]): File[] {
  return files.filter(isListingImageFile)
}

export function listingImageStoragePath(listingId: string, file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const safeExt = ext.replace(/[^a-z0-9]/gi, '') || 'jpg'
  const safeId = listingId.replace(/[^a-zA-Z0-9-]/g, '')
  return `listing-images/${safeId}/${crypto.randomUUID()}.${safeExt}`
}

export async function prepareListingImageFile(file: File): Promise<File> {
  const err = validateListingImageFile(file)
  if (err) throw new Error(err)
  return compressListingImage(file)
}

export async function uploadListingImageToStorage(
  supabase: SupabaseClient,
  listingId: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<string> {
  const prepared = await prepareListingImageFile(file)
  const path = listingImageStoragePath(listingId, prepared)
  onProgress?.(8)

  let pct = 8
  const timer = window.setInterval(() => {
    pct = Math.min(pct + 10, 92)
    onProgress?.(pct)
  }, 180)

  try {
    const { error } = await supabase.storage.from('listings').upload(path, prepared, {
      contentType: prepared.type || 'image/jpeg',
      cacheControl: '3600',
    })
    if (error) throw error
    onProgress?.(100)
    const {
      data: { publicUrl },
    } = supabase.storage.from('listings').getPublicUrl(path)
    return publicUrl
  } finally {
    window.clearInterval(timer)
  }
}

export async function uploadListingImagesToStorage(
  supabase: SupabaseClient,
  listingId: string,
  files: File[],
  onFileProgress?: (fileIndex: number, pct: number) => void
): Promise<string[]> {
  const urls: string[] = []
  for (let i = 0; i < files.length; i++) {
    const url = await uploadListingImageToStorage(supabase, listingId, files[i], (pct) =>
      onFileProgress?.(i, pct)
    )
    urls.push(url)
  }
  return urls
}

export async function removeListingImageFromStorage(
  supabase: SupabaseClient,
  storagePath: string
): Promise<void> {
  const path = storagePath.trim()
  if (!path) return
  await supabase.storage.from('listings').remove([path])
}

export async function persistListingImages(
  supabase: SupabaseClient,
  listingId: string,
  imageUrls: string[],
  imageAlts?: string[]
): Promise<void> {
  const alts =
    imageAlts ??
    Array.from({ length: imageUrls.length }, () => '')
  const { error } = await supabase
    .from('listings')
    .update({
      image_urls: imageUrls,
      image_alts: alts,
      image_url: imageUrls[0] ?? null,
    })
    .eq('id', listingId)
  if (error) throw error
}

/** @deprecated Use persistListingImages */
export async function persistListingImageUrls(
  supabase: SupabaseClient,
  listingId: string,
  imageUrls: string[]
): Promise<void> {
  return persistListingImages(supabase, listingId, imageUrls)
}
