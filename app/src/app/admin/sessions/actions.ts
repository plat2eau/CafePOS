'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdminAuth } from '@/lib/admin-auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'

type OrderStatus = Database['public']['Tables']['orders']['Row']['status']

const allowedOrderStatuses: OrderStatus[] = ['placed', 'preparing', 'served', 'cancelled']

function refreshAdminPaths(tableId: string) {
  revalidatePath('/admin/sessions')
  revalidatePath(`/admin/sessions/${tableId}`)
  revalidatePath('/api/admin/overview')
}

export async function updateOrderStatus(
  tableId: string,
  orderId: string,
  nextStatus: OrderStatus
) {
  await requireAdminAuth()

  if (!allowedOrderStatuses.includes(nextStatus)) {
    redirect(`/admin/sessions/${tableId}?error=invalid-status`)
  }

  const supabase = createServerSupabaseClient()
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, table_id')
    .eq('id', orderId)
    .eq('table_id', tableId)
    .maybeSingle()

  if (orderError || !order) {
    redirect(`/admin/sessions/${tableId}?error=order-not-found`)
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)

  if (updateError) {
    redirect(`/admin/sessions/${tableId}?error=order-update-failed`)
  }

  refreshAdminPaths(tableId)
  redirect(`/admin/sessions/${tableId}?success=order-updated&refresh=${Date.now()}`)
}

export async function clearTableSession(tableId: string, sessionId: string) {
  await requireAdminAuth()

  const supabase = createServerSupabaseClient()
  const { data: session, error: sessionError } = await supabase
    .from('table_sessions')
    .select('id, table_id, status')
    .eq('id', sessionId)
    .eq('table_id', tableId)
    .maybeSingle()

  if (sessionError || !session) {
    redirect(`/admin/sessions/${tableId}?error=session-not-found`)
  }

  if (session.status !== 'active') {
    redirect(`/admin/sessions/${tableId}?error=session-inactive`)
  }

  const { error: closeError } = await supabase
    .from('table_sessions')
    .update({
      status: 'closed',
      closed_at: new Date().toISOString(),
      closed_reason: 'Cleared by staff'
    })
    .eq('id', sessionId)

  if (closeError) {
    redirect(`/admin/sessions/${tableId}?error=clear-failed`)
  }

  const { error: archiveOrdersError } = await supabase
    .from('orders')
    .update({
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('session_id', sessionId)
    .is('archived_at', null)

  if (archiveOrdersError) {
    redirect(`/admin/sessions/${tableId}?error=clear-failed`)
  }

  refreshAdminPaths(tableId)
  redirect(`/admin/sessions/${tableId}?success=table-cleared`)
}
