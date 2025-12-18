'use client'

import Image from 'next/image'
import { useState } from 'react'

export default function Logo() {
  const [logoError, setLogoError] = useState(false)

  return (
    <div style={{ 
      height: '50px', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      position: 'relative'
    }}>
      {logoError ? (
        <div style={{
          height: '50px',
          padding: '0 1rem',
          background: 'linear-gradient(135deg, #2f4ca0 0%, #6b89c5 100%)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
          color: 'white',
          fontWeight: 'bold'
        }}>
          Bo.ly
        </div>
      ) : (
        <Image
          src="/logo.png"
          alt="Bo.ly Logo"
          width={180}
          height={50}
          className="logo"
          style={{ height: '50px', width: 'auto', objectFit: 'contain' }}
          priority
          onError={() => setLogoError(true)}
        />
      )}
    </div>
  )
}

