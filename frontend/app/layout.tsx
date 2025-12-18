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
          <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 var(--space-4)' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
              <Logo />
            </Link>
            
            <nav style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              <Link href="/nav/database" className="nav-link">Boligbase</Link>
              <Link href="/homeowner/manage" className="nav-link">For utleiere</Link>
              <button className="button" style={{ fontSize: '0.8rem', padding: 'var(--space-2) var(--space-4)', marginLeft: 'var(--space-2)' }}>Logg inn</button>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  )
}






