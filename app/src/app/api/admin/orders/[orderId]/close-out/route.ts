import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getAdminAuthContext } from '@/lib/admin-auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type RouteContext = {
  params: Promise<{
    orderId: string
  }>
}

export async function POST(_request: Request, context: RouteContext) {
  const auth = await getAdminAuthContext()

  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })
  }

  const { orderId } = await context.params
  const supabase = createServerSupabaseClient()

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, table_id, archived_at, status')
    .eq('id', orderId)
    .maybeSingle()

  if (orderError || !order) {
    return NextResponse.json({ message: 'That order could not be found.' }, { status: 404 })
  }

  if (order.table_id) {
    return NextResponse.json(
      { message: 'That order belongs to a table. Close the table session instead.' },
      { status: 400 }
    )
  }

  if (order.archived_at) {
    return NextResponse.json({ message: 'That order is already closed out.' }, { status: 400 })
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
    return NextResponse.json({ message: 'Could not close out the order.' }, { status: 500 })
  }

  revalidatePath('/admin/sessions')
  revalidatePath('/api/admin/overview')

  return NextResponse.json({
    ok: true,
    message: 'Order closed out.'
  })
}

