'use client'

import Image from 'next/image'
import { useState } from 'react'

export default function Logo() {
  const [logoError, setLogoError] = useState(false)

  return (
    <div style={{ 
      height: '60px', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      position: 'relative'
    }}>
      {logoError ? (
        <div style={{
          height: '60px',
          padding: '0 0.75rem',
          background: 'var(--color-dark-navy)',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.25rem',
          color: 'white',
          fontWeight: 'bold'
        }}>
          Bo.ly
        </div>
      ) : (
        <Image
          src="/logo.png"
          alt="Bo.ly Logo"
          width={140}
          height={60}
          className="logo"
          style={{ height: '60px', width: 'auto', objectFit: 'contain' }}
          priority
          onError={() => setLogoError(true)}
        />
      )}
    </div>
  )
}

