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
 */
export function OptimizedPublicStorageImage(props: OptimizedPublicStorageImageProps) {
  const { src, alt, sizes, priority, className, style } = props
  const ok = listingImageSupportsNextOptimization(src)

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
      className={className}
      style={style}
    />
  )
}
