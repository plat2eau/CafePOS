import { NextResponse } from 'next/server'
import { getAdminAuthContext } from '@/lib/admin-auth'
import { apiError, unauthorizedApiError } from '@/lib/api-errors'
import { createReceiptToken } from '@/lib/receipt-print-server'
import { isReceiptPayload } from '@/lib/receipt-print'

export async function POST(request: Request) {
  const auth = await getAdminAuthContext()

  if (!auth) {
    return unauthorizedApiError()
  }

  const body = (await request.json().catch(() => null)) as { payload?: unknown } | null

  if (!body || !isReceiptPayload(body.payload)) {
    return apiError('Invalid receipt payload.', 400, { code: 'invalid_receipt_payload' })
  }

  const token = createReceiptToken(body.payload)
  const receiptUrl = new URL('/print/receipt', request.url)
  receiptUrl.searchParams.set('token', token)

  return NextResponse.json({
    token,
    receiptUrl: receiptUrl.toString()
  })
}
