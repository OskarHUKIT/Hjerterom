import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of booking | Hjerterum',
  description: 'Terms for short-term tourism and event bookings on finn.hjerterum.no',
}

export default function FinnTermsPage() {
  return (
    <article className="finn-legal card">
      <h1>Booking terms (tourism)</h1>
      <p className="finn-legal-lead">
        These terms apply when you book accommodation through the Hjerterum guest portal (
        <strong>finn.hjerterum.no</strong>). The rental agreement is between you and the landlord.
        Hjerterum facilitates discovery, messaging, and payment.
      </p>
      <section>
        <h2>1. Booking and payment</h2>
        <p>
          A booking is confirmed when the landlord accepts your request and payment is completed via
          Stripe. Prices shown include the nightly rate set by the landlord; platform fees (if any)
          are displayed before checkout.
        </p>
      </section>
      <section>
        <h2>2. Cancellation</h2>
        <p>
          Cancellation rules follow the policy selected by the landlord for the listing. Contact the
          landlord through your booking in <Link href="/finn/mine">Mine</Link> for changes.
        </p>
      </section>
      <section>
        <h2>3. Liability</h2>
        <p>
          Hjerterum is not a party to the lease. Disputes about the property are primarily between
          guest and landlord. For platform issues, contact{' '}
          <a href="mailto:info@hjerterum.no">info@hjerterum.no</a>.
        </p>
      </section>
      <p>
        <Link href="/finn">← Back to search</Link>
      </p>
    </article>
  )
}
