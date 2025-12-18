import type { Metadata } from 'next'
import './globals.css'
import Link from 'next/link'
import Logo from './components/Logo'

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
              <Logo />
              <h1 style={{ margin: 0 }}>Bo.ly</h1>
            </Link>
          </div>
        </header>
        {children}
      </body>
    </html>
  )
}






