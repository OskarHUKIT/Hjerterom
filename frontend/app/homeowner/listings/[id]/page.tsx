'use client'

import { Suspense } from 'react'
import { use } from 'react'
import ListingHubPage from '@/features/listings/components/ListingHubPage'
import LoadingPlaceholder from '@/app/components/LoadingPlaceholder'

type PageProps = {
  params: Promise<{ id: string }>
}

function ListingHubContent({ params }: PageProps) {
  const { id } = use(params)
  return <ListingHubPage listingId={id} />
}

export default function HomeownerListingHubRoute({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <main className="container listing-hub-page">
          <LoadingPlaceholder minHeight={200} />
        </main>
      }
    >
      <ListingHubContent params={params} />
    </Suspense>
  )
}
