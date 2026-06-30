import { Suspense } from 'react'
import { PageSkeleton } from '@/app/components/design-system'
import FinnMineClient from './FinnMineClient'

export default function FinnMinePage() {
  return (
    <Suspense fallback={<PageSkeleton minHeight={240} />}>
      <FinnMineClient />
    </Suspense>
  )
}
