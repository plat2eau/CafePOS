import { NextResponse } from 'next/server'
import { getAdminAuthContext } from '@/lib/admin-auth'
import { createReceiptToken } from '@/lib/receipt-print-server'
import { isReceiptPayload } from '@/lib/receipt-print'

export async function POST(request: Request) {
  const auth = await getAdminAuthContext()

  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as { payload?: unknown } | null

  if (!body || !isReceiptPayload(body.payload)) {
    return NextResponse.json({ message: 'Invalid receipt payload.' }, { status: 400 })
  }

  const token = createReceiptToken(body.payload)
  const receiptUrl = new URL('/print/receipt', request.url)
  receiptUrl.searchParams.set('token', token)

  return NextResponse.json({
    token,
    receiptUrl: receiptUrl.toString()
  })
}
