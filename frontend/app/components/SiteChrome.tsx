'use client'

import { usePathname } from 'next/navigation'
import Header from './Header'
import Footer from './Footer'

function isFinnRoute(pathname: string | null): boolean {
  return pathname === '/finn' || (pathname?.startsWith('/finn/') ?? false)
}

function isOpsRoute(pathname: string | null): boolean {
  return pathname === '/ops' || (pathname?.startsWith('/ops/') ?? false)
}

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const ops = isOpsRoute(pathname)
  const finn = isFinnRoute(pathname)

  if (ops || finn) {
    return <div className={`site-main${ops ? ' site-main--ops' : ' site-main--finn'}`}>{children}</div>
  }

  return (
    <>
      <Header />
      <div className="site-main">{children}</div>
      <Footer />
    </>
  )
}
