import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getAdminAuthContext } from '@/lib/admin-auth'
import { apiError, unauthorizedApiError } from '@/lib/api-errors'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'

type OrderStatus = Database['public']['Tables']['orders']['Row']['status']

type RouteContext = {
  params: Promise<{
    orderId: string
    itemId: string
  }>
}

type ItemMutationAction = 'decrement' | 'remove'

function revalidateAdminOrderPaths(tableId: string | null) {
  revalidatePath('/admin/sessions')
  revalidatePath('/api/admin/overview')

  if (!tableId) {
    return
  }

  revalidatePath(`/admin/sessions/${tableId}`)
  revalidatePath(`/table/${tableId}`)
  revalidatePath(`/table/${tableId}/orders`)
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await getAdminAuthContext()

  if (!auth) {
    return unauthorizedApiError()
  }

  const { orderId, itemId } = await context.params
  const body = (await request.json().catch(() => null)) as { action?: ItemMutationAction } | null
  const action = body?.action

  if (action !== 'decrement' && action !== 'remove') {
    return apiError('Invalid item action.', 400, { code: 'invalid_item_action' })
  }

  const supabase = createServerSupabaseClient()
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, table_id, status, archived_at')
    .eq('id', orderId)
    .is('archived_at', null)
    .maybeSingle()

  if (orderError || !order) {
    return apiError('That order could not be found.', 404, {
      code: 'order_not_found',
      context: 'admin.orders.items.patch.loadOrder',
      cause: orderError
    })
  }

  const { data: orderItem, error: itemError } = await supabase
    .from('order_items')
    .select('id, order_id, quantity, unit_price_cents')
    .eq('id', itemId)
    .eq('order_id', orderId)
    .maybeSingle()

  if (itemError || !orderItem) {
    return apiError('That order item could not be found.', 404, {
      code: 'order_item_not_found',
      context: 'admin.orders.items.patch.loadOrderItem',
      cause: itemError
    })
  }

  if (!Number.isInteger(orderItem.quantity) || orderItem.quantity <= 0) {
    return apiError('That order item has an invalid quantity.', 400, {
      code: 'invalid_order_item_quantity'
    })
  }

  if (action === 'decrement' && orderItem.quantity > 1) {
    const nextQuantity = orderItem.quantity - 1
    const { error: updateItemError } = await supabase
      .from('order_items')
      .update({
        quantity: nextQuantity,
        line_total_cents: orderItem.unit_price_cents * nextQuantity
      })
      .eq('id', itemId)

    if (updateItemError) {
      return apiError('Could not update the order item.', 500, {
        code: 'order_item_update_failed',
        context: 'admin.orders.items.patch.updateItem',
        cause: updateItemError
      })
    }
  } else {
    const { error: deleteItemError } = await supabase
      .from('order_items')
      .delete()
      .eq('id', itemId)
      .eq('order_id', orderId)

    if (deleteItemError) {
      return apiError('Could not remove the order item.', 500, {
        code: 'order_item_delete_failed',
        context: 'admin.orders.items.patch.deleteItem',
        cause: deleteItemError
      })
    }
  }

  const { data: remainingItems, error: remainingItemsError } = await supabase
    .from('order_items')
    .select('id, line_total_cents')
    .eq('order_id', orderId)

  if (remainingItemsError) {
    return apiError('Could not recalculate the order total.', 500, {
      code: 'order_total_recalculate_failed',
      context: 'admin.orders.items.patch.remainingItems',
      cause: remainingItemsError
    })
  }

  const remainingTotalCents = (remainingItems ?? []).reduce(
    (sum, item) => sum + item.line_total_cents,
    0
  )
  const nextStatus: OrderStatus = remainingTotalCents === 0 ? 'cancelled' : order.status

  const { error: updateOrderError } = await supabase
    .from('orders')
    .update({
      status: nextStatus,
      total_cents: remainingTotalCents,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)

  if (updateOrderError) {
    return apiError('Could not update the order.', 500, {
      code: 'order_update_failed',
      context: 'admin.orders.items.patch.updateOrder',
      cause: updateOrderError
    })
  }

  revalidateAdminOrderPaths(order.table_id)

  return NextResponse.json({
    ok: true,
    message:
      remainingTotalCents === 0
        ? 'Last item removed and order cancelled.'
        : action === 'decrement'
          ? 'Order item quantity updated.'
          : 'Order item removed.'
  })
}
