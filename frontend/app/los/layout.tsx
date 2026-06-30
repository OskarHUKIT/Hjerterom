import type { Metadata } from 'next'
import LosShell from './components/LosShell'
import './los.css'

export const metadata: Metadata = {
  title: 'Digital Los | Hjerterum',
  description: 'Chat-første inngang for ungdom 16–25. Kobles til sosial saksbehandler.',
}

export default function LosLayout({ children }: { children: React.ReactNode }) {
  return <LosShell>{children}</LosShell>
}
