import { Suspense } from 'react'
import FinnLoginClient from './FinnLoginClient'

export default function FinnLoginPage() {
  return (
    <Suspense fallback={null}>
      <FinnLoginClient />
    </Suspense>
  )
}
