'use client'

import HandoverReport from '../../components/HandoverReport'

export default function HandoverTenantPreviewClient() {
  return (
    <main className="mx-auto w-full max-w-[800px] px-4 py-boly-8 sm:px-6">
      <p className="mb-boly-6 rounded-boly border border-boly-border-subtle bg-boly-bg-card p-boly-3 text-sm leading-relaxed text-boly-text-main md:p-boly-4">
        Kun lokal utvikling: forhåndsvisning av leietaker overtakelsesrapport (innsending med
        ugyldig token vil feile).
      </p>
      <HandoverReport
        listingId="00000000-0000-4000-8000-000000000000"
        listingAddress="Testveien 1"
        ownerName="Test Utleier"
        reporterType="tenant"
        tenantToken="00000000-0000-4000-8000-000000000000"
      />
    </main>
  )
}
