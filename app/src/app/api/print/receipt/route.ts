import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-errors'
import { buildBluetoothPrintJson } from '@/lib/receipt-print'
import { verifyReceiptToken } from '@/lib/receipt-print-server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return apiError('Missing token.', 400, { code: 'receipt_token_required' })
  }

  const payload = verifyReceiptToken(token)

  if (!payload) {
    return apiError('Invalid or expired token.', 401, { code: 'receipt_token_invalid' })
  }

  return NextResponse.json(buildBluetoothPrintJson(payload))
}
