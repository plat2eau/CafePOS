import { NextResponse } from 'next/server'
import { getAdminAuthContext } from '@/lib/admin-auth'
import { createReceiptToken } from '@/lib/receipt-print-server'
import { buildReceiptPayloadForOrders } from '@/lib/receipt-print'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { AdminOrder, AdminOrderItem } from '@/lib/admin-data'

type RouteContext = {
  params: Promise<{
    outCheckId: string
  }>
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await getAdminAuthContext()

  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })
  }

  const { outCheckId } = await context.params
  const supabase = createServerSupabaseClient()
  const { data: outCheck, error: outCheckError } = await supabase
    .from('out_checks')
    .select('id, customer_name')
    .eq('id', outCheckId)
    .maybeSingle()

  if (outCheckError || !outCheck) {
    return NextResponse.json({ message: 'That out check could not be found.' }, { status: 404 })
  }

  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select(
      'id, table_id, out_check_id, created_at, status, note, total_cents, session_id, ordered_by_name, ordered_by_phone'
    )
    .eq('out_check_id', outCheck.id)
    .order('created_at', { ascending: true })

  if (ordersError || !orders?.length) {
    return NextResponse.json({ message: 'Could not load the out-check orders.' }, { status: 500 })
  }

  const { data: orderItems, error: orderItemsError } = await supabase
    .from('order_items')
    .select('id, order_id, menu_item_id, item_name, portion, quantity, unit_price_cents, line_total_cents')
    .in('order_id', orders.map((order) => order.id))

  if (orderItemsError) {
    return NextResponse.json({ message: 'Could not load the order items.' }, { status: 500 })
  }

  const itemsByOrderId = new Map<string, AdminOrderItem[]>()
  for (const item of orderItems ?? []) {
    const items = itemsByOrderId.get(item.order_id) ?? []
    items.push(item)
    itemsByOrderId.set(item.order_id, items)
  }

  const receiptPayload = buildReceiptPayloadForOrders({
    guestName: outCheck.customer_name,
    orders: orders.map((order) => ({
      ...(order as Omit<AdminOrder, 'items' | 'guest_name'>),
      guest_name: null,
      items: itemsByOrderId.get(order.id) ?? []
    }))
  })
  const token = createReceiptToken(receiptPayload)
  const receiptUrl = new URL('/print/receipt', request.url)
  receiptUrl.searchParams.set('token', token)

  return NextResponse.json({
    ok: true,
    receiptUrl: receiptUrl.toString()
  })
}
