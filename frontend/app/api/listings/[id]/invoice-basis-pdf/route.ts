import { NextRequest, NextResponse } from 'next/server'
import React from 'react'
import { createClient } from '@supabase/supabase-js'
import { pdf } from '@react-pdf/renderer'
import { z } from 'zod'
import { InvoiceBasisDocument } from '../../../../lib/pdf/InvoiceBasisDocument'
import { buildInvoiceBasisPdfPayload } from '../../../../lib/pdf/invoiceBasisPayload'
import { devLog, logError } from '@/app/lib/appLogger'

const listingIdSchema = z.string().uuid()

export const runtime = 'nodejs'

function bad(msg: string, status: number) {
  return NextResponse.json({ error: msg }, { status })
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const tStart = performance.now()
  const requestId = req.headers.get('x-request-id')?.trim() || crypto.randomUUID()
  const { id: listingId } = await context.params
  if (!listingId) return bad('Mangler bolig-ID', 400)
  const idParsed = listingIdSchema.safeParse(listingId)
  if (!idParsed.success) return bad('Ugyldig bolig-ID', 400)

  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  if (!token) return bad('Ikke innlogget', 401)

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) return bad('Serverkonfigurasjon mangler', 500)

  const supabase = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || !userData?.user) return bad('Ugyldig sesjon', 401)
  const tAfterAuth = performance.now()

  const [listingRes, basisRes] = await Promise.all([
    supabase
      .from('listings')
      .select('address, city, postal_code, owner_name')
      .eq('id', listingId)
      .maybeSingle(),
    supabase
      .from('listing_invoice_basis')
      .select('signature_confirmed_at, account_number, amount_nok, listing_availability_id')
      .eq('listing_id', listingId)
      .maybeSingle(),
  ])

  const { data: listing, error: listErr } = listingRes
  const { data: basis, error: basisErr } = basisRes

  if (listErr || !listing) return bad('Fant ikke boligen', 404)

  if (basisErr) return bad(basisErr.message, 500)
  const tAfterDb = performance.now()

  const b = basis as {
    signature_confirmed_at?: string | null
    account_number?: string | null
    amount_nok?: number | null
    listing_availability_id?: string | null
  } | null

  let agreementStart: string | null = null
  let agreementEnd: string | null = null
  if (b?.listing_availability_id) {
    const { data: av } = await supabase
      .from('listing_availability')
      .select('start_date, end_date, status')
      .eq('id', b.listing_availability_id)
      .maybeSingle()
    const row = av as { start_date: string; end_date: string; status: string } | null
    if (row && row.status === 'Formidla') {
      agreementStart = row.start_date
      agreementEnd = row.end_date
    }
  }

  const payload = buildInvoiceBasisPdfPayload({
    address: listing.address,
    postalCode: (listing as { postal_code?: string | null }).postal_code,
    city: listing.city,
    ownerName: listing.owner_name,
    agreementStart,
    agreementEnd,
    amountNok: b?.amount_nok != null ? Number(b.amount_nok) : null,
    accountNumber: b?.account_number ?? null,
    signatureConfirmedAt: b?.signature_confirmed_at ?? null,
  })

  try {
    const doc = React.createElement(InvoiceBasisDocument, { data: payload })
    const blob = await pdf(doc as React.ReactElement).toBlob()
    const buf = Buffer.from(await blob.arrayBuffer())
    const tAfterPdf = performance.now()
    const safeName = `fakturagrunnlag-${listingId.slice(0, 8)}.pdf`
    devLog(
      JSON.stringify({
        msg: 'invoice-basis-pdf ok',
        requestId,
        listingId,
        msTotal: Math.round(tAfterPdf - tStart),
        msAuth: Math.round(tAfterAuth - tStart),
        msDb: Math.round(tAfterDb - tAfterAuth),
        msPdf: Math.round(tAfterPdf - tAfterDb),
      }),
    )
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeName}"`,
        'Cache-Control': 'no-store',
        'x-request-id': requestId,
      },
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'PDF-feil'
    logError(JSON.stringify({ msg: 'invoice-basis-pdf error', requestId, error: msg }))
    return NextResponse.json({ error: msg, requestId }, { status: 500 })
  }
}
