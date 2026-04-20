import { redirect } from 'next/navigation'

/**
 * Legacy plassholder-rute. All brukerdokumentasjon er nå samlet under /brukervilkar.
 * Vi beholder rutens eksistens for bokmerker og eldre lenker, men omdirigerer permanent.
 */
export default function LegacyTermsPage() {
  redirect('/brukervilkar')
}
