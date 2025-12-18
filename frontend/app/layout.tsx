import type { Metadata } from 'next'
import './globals.css'
import Image from 'next/image'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Bo.ly - Boligbanken',
  description: 'Bo.ly Housing Bank Application',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="no">
      <body>
        <header className="header">
          <div className="container" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 2rem' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none' }}>
              {/* Logo - replace logo.png with your actual logo file */}
              <div style={{ 
                width: 60, 
                height: 60, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                position: 'relative'
              }}>
                <Image
                  src="/logo.png"
                  alt="Bo.ly Logo"
                  width={60}
                  height={60}
                  className="logo"
                  style={{ objectFit: 'contain' }}
                  priority
                  onError={(e) => {
                    // Fallback if logo doesn't exist
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    const parent = target.parentElement
                    if (parent) {
                      parent.innerHTML = '<div style="width: 60px; height: 60px; background: linear-gradient(135deg, #2f4ca0 0%, #6b89c5 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: white; font-weight: bold;">Bo</div>'
                    }
                  }}
                />
              </div>
              <h1 style={{ margin: 0 }}>Bo.ly</h1>
            </Link>
          </div>
        </header>
        {children}
      </body>
    </html>
  )
}






