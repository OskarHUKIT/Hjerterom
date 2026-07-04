import { Suspense } from 'react'
import { PageSkeleton } from '@/app/components/design-system'
import FinnBookClient from './FinnBookClient'

export default function FinnBookPage() {
  return (
    <Suspense fallback={<PageSkeleton minHeight={240} />}>
      <FinnBookClient />
    </Suspense>
  )
}
