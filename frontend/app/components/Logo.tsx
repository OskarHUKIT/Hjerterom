'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useTheme } from '../../context/ThemeContext'

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
          style={{
            height: '60px',
            padding: '0 0.75rem',
            background: 'var(--color-dark-navy)',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem',
            color: 'white',
            fontWeight: 'bold',
          }}
        >
          Boly
        </div>
      ) : (
        <Image
          className="header-logo-wrap"
          src={logoSrc}
          alt="Boly"
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
