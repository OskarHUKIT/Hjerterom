import { notFound } from 'next/navigation'
import HandoverTenantPreviewClient from './HandoverTenantPreviewClient'

export default function DevHandoverTenantPreviewPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }
  return <HandoverTenantPreviewClient />
}
