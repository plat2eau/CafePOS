import { NextResponse } from 'next/server'
import { getAdminAuthContext } from '@/lib/admin-auth'
import { createReceiptToken } from '@/lib/receipt-print-server'
import { buildReceiptPayloadForOrders } from '@/lib/receipt-print'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { AdminOrder } from '@/lib/admin-data'

type RouteContext = {
  params: Promise<{
    orderId: string
  }>
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await getAdminAuthContext()

  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })
  }

  const { orderId } = await context.params
  const supabase = createServerSupabaseClient()

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(
      'id, table_id, created_at, status, note, total_cents, session_id, ordered_by_name, ordered_by_phone'
    )
    .eq('id', orderId)
    .maybeSingle()

  if (orderError || !order) {
    return NextResponse.json({ message: 'That order could not be found.' }, { status: 404 })
  }

  const { data: orderItems, error: orderItemsError } = await supabase
    .from('order_items')
    .select('item_name, quantity, line_total_cents')
    .eq('order_id', orderId)

  if (orderItemsError) {
    return NextResponse.json({ message: 'Could not load the order items.' }, { status: 500 })
  }

  const receiptPayload = buildReceiptPayloadForOrders({
    guestName: order.ordered_by_name,
    orders: [
      {
        ...(order as Omit<AdminOrder, 'items' | 'guest_name'>),
        guest_name: null,
        items: orderItems ?? []
      }
    ]
  })

  const token = createReceiptToken(receiptPayload)
  const receiptUrl = new URL('/print/receipt', request.url)
  receiptUrl.searchParams.set('token', token)

  return NextResponse.json({
    ok: true,
    token,
    receiptUrl: receiptUrl.toString()
  })
}
