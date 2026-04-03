import { NextResponse } from 'next/server'
import { buildBluetoothPrintJson } from '@/lib/receipt-print'
import { verifyReceiptToken } from '@/lib/receipt-print-server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ message: 'Missing token.' }, { status: 400 })
  }

  const payload = verifyReceiptToken(token)

  if (!payload) {
    return NextResponse.json({ message: 'Invalid or expired token.' }, { status: 401 })
  }

  return NextResponse.json(buildBluetoothPrintJson(payload))
}
