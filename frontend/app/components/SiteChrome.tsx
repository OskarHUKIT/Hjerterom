'use client'

import { usePathname } from 'next/navigation'
import Header from './Header'
import Footer from './Footer'

function isFinnRoute(pathname: string | null): boolean {
  return pathname === '/finn' || (pathname?.startsWith('/finn/') ?? false)
}

function isLosRoute(pathname: string | null): boolean {
  return pathname === '/los' || (pathname?.startsWith('/los/') ?? false)
}

function isOpsRoute(pathname: string | null): boolean {
  return pathname === '/ops' || (pathname?.startsWith('/ops/') ?? false)
}

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const ops = isOpsRoute(pathname)
  const finn = isFinnRoute(pathname)
  const los = isLosRoute(pathname)

  if (ops || finn || los) {
    return (
      <div
        id="main-content"
        tabIndex={-1}
        className={`site-main${ops ? ' site-main--ops' : finn ? ' site-main--finn' : ' site-main--los'}`}
      >
        {children}
      </div>
    )
  }

  return (
    <>
      <Header />
      <div id="main-content" tabIndex={-1} className="site-main">
        {children}
      </div>
      <Footer />
    </>
  )
}
