import type { Metadata } from 'next'
import FinnTermsPageClient from './FinnTermsPageClient'

export const metadata: Metadata = {
  title: 'Terms of booking | Hjerterum',
  description: 'Terms for short-term tourism and event bookings on finn.hjerterum.no',
}

export default function FinnTermsPage() {
  return <FinnTermsPageClient />
}
