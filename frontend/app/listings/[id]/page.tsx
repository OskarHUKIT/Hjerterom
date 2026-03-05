import { Suspense } from 'react'
import { createClient } from '@supabase/supabase-js'
import ListingDetailsClient from './ListingDetailsClient'

export async function generateStaticParams() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseKey) return [{ id: 'placeholder' }]

    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data: listings } = await supabase.from('listings').select('id').limit(500)
    if (!listings?.length) return [{ id: 'placeholder' }]
    return listings.map((l) => ({ id: l.id }))
  } catch {
    return [{ id: 'placeholder' }]
  }
}

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> }

export default async function ListingDetailsPage(props: PageProps) {
  if (props.searchParams) await props.searchParams
  return (
    <Suspense fallback={<div style={{ minHeight: '80vh' }} />}>
      <ListingDetailsClient />
    </Suspense>
  )
}
