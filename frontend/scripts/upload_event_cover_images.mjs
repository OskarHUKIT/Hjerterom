#!/usr/bin/env node
/**
 * Upload demo event cover images to Supabase storage and set central_events.cover_image_url.
 *
 * Usage (from frontend/):
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run upload:event-covers
 *
 * Optional:
 *   SUPABASE_STORAGE_BUCKET=listings   (default)
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const assetsDir = join(__dirname, '..', '..', 'supabase', 'assets', 'event-covers')
const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'listings'

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const files = readdirSync(assetsDir).filter((f) => /\.(png|jpe?g|webp)$/i.test(f))

if (files.length === 0) {
  console.error(`No image files found in ${assetsDir}`)
  process.exit(1)
}

for (const file of files) {
  const slug = file.replace(/\.(png|jpe?g|webp)$/i, '')
  const storagePath = `event-covers/${slug}.png`
  const body = readFileSync(join(assetsDir, file))
  const contentType = file.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'

  const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, body, {
    contentType,
    cacheControl: '31536000',
    upsert: true,
  })

  if (uploadError) {
    console.error(`Upload failed for ${file}:`, uploadError.message)
    process.exit(1)
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(storagePath)

  const { error: updateError } = await supabase
    .from('central_events')
    .update({ cover_image_url: publicUrl })
    .eq('slug', slug)

  if (updateError) {
    console.error(`DB update failed for ${slug}:`, updateError.message)
    process.exit(1)
  }

  console.log(`OK ${slug} -> ${publicUrl}`)
}

console.log(`Uploaded ${files.length} event cover image(s).`)
