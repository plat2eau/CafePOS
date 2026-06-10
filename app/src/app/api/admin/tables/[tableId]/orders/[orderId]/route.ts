import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getAdminAuthContext } from '@/lib/admin-auth'
import { apiError, unauthorizedApiError } from '@/lib/api-errors'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'

type OrderStatus = Database['public']['Tables']['orders']['Row']['status']

type RouteContext = {
  params: Promise<{
    tableId: string
    orderId: string
  }>
}

const allowedOrderStatuses: OrderStatus[] = ['placed', 'preparing', 'served', 'cancelled']

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await getAdminAuthContext()

  if (!auth) {
    return unauthorizedApiError()
  }

  const { tableId, orderId } = await context.params
  const body = (await request.json().catch(() => null)) as { status?: OrderStatus } | null
  const nextStatus = body?.status

  if (!nextStatus || !allowedOrderStatuses.includes(nextStatus)) {
    return apiError('Invalid order status.', 400, { code: 'invalid_order_status' })
  }

  const supabase = createServerSupabaseClient()
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, table_id')
    .eq('id', orderId)
    .eq('table_id', tableId)
    .maybeSingle()

  if (orderError || !order) {
    return apiError('That order could not be found for this table.', 404, {
      code: 'order_not_found',
      context: 'admin.tables.orders.patch.loadOrder',
      cause: orderError
    })
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)

  if (updateError) {
    return apiError('Could not update the order status.', 500, {
      code: 'order_status_update_failed',
      context: 'admin.tables.orders.patch.updateOrder',
      cause: updateError
    })
  }

  revalidatePath('/admin/sessions')
  revalidatePath(`/admin/sessions/${tableId}`)
  revalidatePath('/api/admin/overview')

  return NextResponse.json({
    ok: true,
    status: nextStatus,
    message: 'Order status updated.'
  })
}
