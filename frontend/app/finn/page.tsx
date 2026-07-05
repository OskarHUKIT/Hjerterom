'use client'

import FinnSearchDesktop from './components/FinnSearchDesktop'
import FinnSearchMobile from './components/FinnSearchMobile'

export default function FinnSearchPage() {
  return (
    <>
      <div className="finn-desktop-only">
        <FinnSearchDesktop />
      </div>
      <div className="finn-mobile-only">
        <FinnSearchMobile />
      </div>
    </>
  )
}
