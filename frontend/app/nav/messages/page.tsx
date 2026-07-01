'use client'

import { Suspense } from 'react'
import LoadingPlaceholder from '@/app/components/LoadingPlaceholder'
import NavMessagesPage from '@/features/messaging/components/NavMessagesPage'

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <main className="container">
          <LoadingPlaceholder minHeight={400} />
        </main>
      }
    >
      <NavMessagesPage />
    </Suspense>
  )
}
