import type { Metadata } from 'next'
import LosPrivacyPageClient from './LosPrivacyPageClient'

export const metadata: Metadata = {
  title: 'Privacy — Digital Los | Hjerterum',
  description: 'How Digital Los handles chat data and handoff to municipal caseworkers.',
}

export default function LosPrivacyPage() {
  return <LosPrivacyPageClient />
}
