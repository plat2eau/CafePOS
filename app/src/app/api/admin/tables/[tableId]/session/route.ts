import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getAdminAuthContext } from '@/lib/admin-auth'
import { apiError, unauthorizedApiError } from '@/lib/api-errors'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type RouteContext = {
  params: Promise<{
    tableId: string
  }>
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await getAdminAuthContext()

  if (!auth) {
    return unauthorizedApiError()
  }

  const { tableId } = await context.params
  const body = (await request.json().catch(() => null)) as { sessionId?: string } | null
  const sessionId = body?.sessionId?.trim()

  if (!sessionId) {
    return apiError('Missing session id.', 400, { code: 'session_id_required' })
  }

  const supabase = createServerSupabaseClient()
  const { data: session, error: sessionError } = await supabase
    .from('table_sessions')
    .select('id, table_id, status')
    .eq('id', sessionId)
    .eq('table_id', tableId)
    .maybeSingle()

  if (sessionError || !session) {
    return apiError('That session could not be found for this table.', 404, {
      code: 'session_not_found',
      context: 'admin.tables.session.delete.loadSession',
      cause: sessionError
    })
  }

  if (session.status !== 'active') {
    return apiError('That table session is already inactive.', 400, {
      code: 'session_inactive'
    })
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
    return apiError('Could not clear the table session.', 500, {
      code: 'session_close_failed',
      context: 'admin.tables.session.delete.closeSession',
      cause: closeError
    })
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
    return apiError('Table closed, but the session orders could not be archived.', 500, {
      code: 'session_orders_archive_failed',
      context: 'admin.tables.session.delete.archiveOrders',
      cause: archiveOrdersError
    })
  }

  const { error: resolveRequestsError } = await supabase
    .from('service_requests')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString()
    })
    .eq('session_id', sessionId)
    .eq('status', 'open')

  if (resolveRequestsError) {
    return apiError('Table closed, but the service requests could not be resolved.', 500, {
      code: 'service_requests_resolve_failed',
      context: 'admin.tables.session.delete.resolveRequests',
      cause: resolveRequestsError
    })
  }

  revalidatePath('/admin/sessions')
  revalidatePath(`/admin/sessions/${tableId}`)
  revalidatePath('/api/admin/overview')

  return NextResponse.json({
    ok: true,
    message: 'Table session cleared.'
  })
}
