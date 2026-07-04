import type { Metadata } from 'next'
import FinnShell from './components/FinnShell'
import './finn.css'

export const metadata: Metadata = {
  title: 'Finn bolig | Hjerterum',
  description:
    'Søk og book korttidsleie i Nord-Norge. Arrangement og turisme — direkte fra utleiere.',
}

export default function FinnLayout({ children }: { children: React.ReactNode }) {
  return <FinnShell>{children}</FinnShell>
}
