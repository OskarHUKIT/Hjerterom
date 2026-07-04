import type { SupabaseClient } from '@supabase/supabase-js'

/** Max gallery images per listing (NPD-5 #18). */
export const MAX_LISTING_IMAGES = 20

export function isListingImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

export function filterListingImageFiles(files: File[]): File[] {
  return files.filter(isListingImageFile)
}

export function listingImageStoragePath(file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const safeExt = ext.replace(/[^a-z0-9]/gi, '') || 'jpg'
  return `listing-images/${crypto.randomUUID()}.${safeExt}`
}

export async function uploadListingImageToStorage(
  supabase: SupabaseClient,
  file: File,
  onProgress?: (pct: number) => void
): Promise<string> {
  if (!isListingImageFile(file)) {
    throw new Error('invalid_type')
  }

  const path = listingImageStoragePath(file)
  onProgress?.(8)

  let pct = 8
  const timer = window.setInterval(() => {
    pct = Math.min(pct + 10, 92)
    onProgress?.(pct)
  }, 180)

  try {
    const { error } = await supabase.storage.from('listings').upload(path, file, {
      contentType: file.type || 'image/jpeg',
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
  files: File[],
  onFileProgress?: (fileIndex: number, pct: number) => void
): Promise<string[]> {
  const urls: string[] = []
  for (let i = 0; i < files.length; i++) {
    const url = await uploadListingImageToStorage(supabase, files[i], (pct) =>
      onFileProgress?.(i, pct)
    )
    urls.push(url)
  }
  return urls
}

export async function persistListingImageUrls(
  supabase: SupabaseClient,
  listingId: string,
  imageUrls: string[]
): Promise<void> {
  const { error } = await supabase
    .from('listings')
    .update({
      image_urls: imageUrls,
      image_url: imageUrls[0] ?? null,
    })
    .eq('id', listingId)
  if (error) throw error
}
