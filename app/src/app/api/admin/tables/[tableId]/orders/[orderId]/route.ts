import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getAdminAuthContext } from '@/lib/admin-auth'
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
    return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })
  }

  const { tableId, orderId } = await context.params
  const body = (await request.json().catch(() => null)) as { status?: OrderStatus } | null
  const nextStatus = body?.status

  if (!nextStatus || !allowedOrderStatuses.includes(nextStatus)) {
    return NextResponse.json({ message: 'Invalid order status.' }, { status: 400 })
  }

  const supabase = createServerSupabaseClient()
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, table_id')
    .eq('id', orderId)
    .eq('table_id', tableId)
    .maybeSingle()

  if (orderError || !order) {
    return NextResponse.json(
      { message: 'That order could not be found for this table.' },
      { status: 404 }
    )
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)

  if (updateError) {
    return NextResponse.json(
      { message: 'Could not update the order status.' },
      { status: 500 }
    )
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
