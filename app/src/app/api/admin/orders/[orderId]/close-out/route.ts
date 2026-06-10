import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getAdminAuthContext } from '@/lib/admin-auth'
import { apiError, unauthorizedApiError } from '@/lib/api-errors'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type RouteContext = {
  params: Promise<{
    orderId: string
  }>
}

export async function POST(_request: Request, context: RouteContext) {
  const auth = await getAdminAuthContext()

  if (!auth) {
    return unauthorizedApiError()
  }

  const { orderId } = await context.params
  const supabase = createServerSupabaseClient()

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, table_id, archived_at, status')
    .eq('id', orderId)
    .maybeSingle()

  if (orderError || !order) {
    return apiError('That order could not be found.', 404, {
      code: 'order_not_found',
      context: 'admin.orders.closeOut.post.loadOrder',
      cause: orderError
    })
  }

  if (order.table_id) {
    return apiError('That order belongs to a table. Close the table session instead.', 400, {
      code: 'table_order_close_out_forbidden'
    })
  }

  if (order.archived_at) {
    return apiError('That order is already closed out.', 400, { code: 'order_already_closed' })
  }

  const now = new Date().toISOString()
  const nextStatus = order.status === 'cancelled' ? 'cancelled' : 'served'

  const { error: updateError } = await supabase
    .from('orders')
    .update({
      status: nextStatus,
      archived_at: now,
      updated_at: now
    })
    .eq('id', orderId)
    .is('archived_at', null)

  if (updateError) {
    return apiError('Could not close out the order.', 500, {
      code: 'order_close_out_failed',
      context: 'admin.orders.closeOut.post.updateOrder',
      cause: updateError
    })
  }

  revalidatePath('/admin/sessions')
  revalidatePath('/api/admin/overview')

  return NextResponse.json({
    ok: true,
    message: 'Order closed out.'
  })
}

