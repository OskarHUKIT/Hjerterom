'use client'

import Image from 'next/image'
import { useState } from 'react'

export default function Logo() {
  const [logoError, setLogoError] = useState(false)

  return (
    <div style={{ 
      width: 60, 
      height: 60, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      position: 'relative'
    }}>
      {logoError ? (
        <div style={{
          width: 60,
          height: 60,
          background: 'linear-gradient(135deg, #2f4ca0 0%, #6b89c5 100%)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
          color: 'white',
          fontWeight: 'bold'
        }}>
          Bo
        </div>
      ) : (
        <Image
          src="/logo.png"
          alt="Bo.ly Logo"
          width={60}
          height={60}
          className="logo"
          style={{ objectFit: 'contain' }}
          priority
          onError={() => setLogoError(true)}
        />
      )}
    </div>
  )
}

