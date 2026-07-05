'use client'

import FinnListingDesktop from '../../components/FinnListingDesktop'
import FinnListingMobile from '../../components/FinnListingMobile'

export default function FinnListingDetailPage() {
  return (
    <>
      <div className="finn-desktop-only">
        <FinnListingDesktop />
      </div>
      <div className="finn-mobile-only">
        <FinnListingMobile />
      </div>
    </>
  )
}
