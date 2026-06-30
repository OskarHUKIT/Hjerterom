import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy — Digital Los | Hjerterum',
  description: 'How Digital Los handles chat data and handoff to municipal caseworkers.',
}

export default function LosPrivacyPage() {
  return (
    <article className="finn-legal card" style={{ maxWidth: 720, margin: '0 auto' }}>
      <h1>Privacy — Digital Los</h1>
      <p className="finn-legal-lead">
        Digital Los (<strong>los.hjerterum.no</strong>) is a chat-first entry point for young people
        aged 16–25. It connects you to a municipal caseworker for social housing assistance — not
        tourism or event booking.
      </p>
      <section>
        <h2>What we store</h2>
        <ul>
          <li>Anonymous session ID in your browser until handoff or expiry.</li>
          <li>Chat messages you send, stored in Supabase (EU region).</li>
          <li>After handoff: a summary for the assigned caseworker inbox.</li>
        </ul>
      </section>
      <section>
        <h2>Consent</h2>
        <p>
          Handoff to a caseworker requires your explicit consent checkbox. Without consent, the chat
          remains anonymous guidance only.
        </p>
      </section>
      <section>
        <h2>Retention</h2>
        <p>
          Sessions are deleted or anonymised according to the municipal data processing agreement
          (DPIA). Do not share special category health data unless necessary.
        </p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>
          Data controller: your municipality. Platform operator: Hjerterum / Boligbanken AS. Questions:{' '}
          <a href="mailto:info@hjerterum.no">info@hjerterum.no</a>.
        </p>
      </section>
      <p>
        <Link href="/los">← Back to chat</Link>
      </p>
    </article>
  )
}
