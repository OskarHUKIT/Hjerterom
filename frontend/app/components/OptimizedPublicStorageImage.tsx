'use client'

import Image from 'next/image'
import type { CSSProperties } from 'react'
import { listingImageSupportsNextOptimization } from '../lib/listingImageUrl'

type Base = {
  src: string
  alt: string
  sizes: string
  priority?: boolean
  className?: string
  style?: CSSProperties
}

type FillVariant = Base & { variant: 'fill' }

type FixedVariant = Base & { variant: 'fixed'; width: number; height: number }

export type OptimizedPublicStorageImageProps = FillVariant | FixedVariant

/**
 * next/image når URL er Supabase public storage; ellers <img> (blob, data, annen host).
 *
 * Lazy-loading:
 *   - next/image sender automatisk `loading="lazy"` når `priority=false` (default).
 *   - For raw <img>-fallback (blob/data/ekstern host) legger vi på `loading` og
 *     `decoding` eksplisitt for å unngå blocking paint og redusere LCP på mobil.
 *     Priority-bilder (f.eks. første galleri-bilde) lastes eagerly/sync for LCP.
 */
export function OptimizedPublicStorageImage(props: OptimizedPublicStorageImageProps) {
  const { src, alt, sizes, priority, className, style } = props
  const ok = listingImageSupportsNextOptimization(src)
  const rawLoading: 'eager' | 'lazy' = priority ? 'eager' : 'lazy'
  const rawDecoding: 'sync' | 'async' = priority ? 'sync' : 'async'

  if (props.variant === 'fill') {
    if (ok) {
      return (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          className={className}
          style={style}
          priority={priority}
        />
      )
    }
    return (
      <img
        src={src}
        alt={alt}
        loading={rawLoading}
        decoding={rawDecoding}
        className={className}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          ...style,
        }}
      />
    )
  }

  const { width, height } = props
  if (ok) {
    return (
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        className={className}
        style={style}
        priority={priority}
      />
    )
  }
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={rawLoading}
      decoding={rawDecoding}
      className={className}
      style={style}
    />
  )
}
