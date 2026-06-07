'use client'

import { usePathname } from 'next/navigation'
import Header from './Header'
import Footer from './Footer'

function isOpsRoute(pathname: string | null): boolean {
  return pathname === '/ops' || (pathname?.startsWith('/ops/') ?? false)
}

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const ops = isOpsRoute(pathname)

  if (ops) {
    return <div className="site-main site-main--ops">{children}</div>
  }

  return (
    <>
      <Header />
      <div className="site-main">{children}</div>
      <Footer />
    </>
  )
}
