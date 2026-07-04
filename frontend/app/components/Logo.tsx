'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { APP_NAME } from '../../lib/brand'

export default function Logo() {
  const [logoError, setLogoError] = useState(false)
  const { theme } = useTheme()

  const logoSrc = theme === 'light' ? '/icon-192x192.png' : '/Bolyhvitskrift.png'

  return (
    <div
      style={{
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      {logoError ? (
        <div
          className="logo-wordmark-fallback"
          style={{
            height: '60px',
            padding: '0 0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            color: 'var(--text-main)',
            fontWeight: 700,
            fontFamily: 'var(--font-display), ui-serif, Georgia, serif',
            letterSpacing: '-0.03em',
          }}
        >
          {APP_NAME}
        </div>
      ) : (
        <Image
          className="header-logo-wrap"
          src={logoSrc}
          alt={APP_NAME}
          width={320}
          height={96}
          priority
          sizes="(max-width: 480px) 42vw, 200px"
          style={{
            height: '60px',
            width: 'auto',
            maxWidth: 'clamp(100px, 28vw, 200px)',
            objectFit: 'contain',
          }}
          onError={() => setLogoError(true)}
        />
      )}
    </div>
  )
}
