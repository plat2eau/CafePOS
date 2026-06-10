import { NextResponse } from 'next/server'
import { getAdminAuthContext } from '@/lib/admin-auth'
import { apiError, unauthorizedApiError } from '@/lib/api-errors'
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
    return unauthorizedApiError()
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
    return apiError('That order could not be found.', 404, {
      code: 'order_not_found',
      context: 'admin.orders.receiptToken.post.loadOrder',
      cause: orderError
    })
  }

  const { data: orderItems, error: orderItemsError } = await supabase
    .from('order_items')
    .select('id, menu_item_id, item_name, portion, quantity, unit_price_cents, line_total_cents')
    .eq('order_id', orderId)

  if (orderItemsError) {
    return apiError('Could not load the order items.', 500, {
      code: 'order_items_load_failed',
      context: 'admin.orders.receiptToken.post.loadItems',
      cause: orderItemsError
    })
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
