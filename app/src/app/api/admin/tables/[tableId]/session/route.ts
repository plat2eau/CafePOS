import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getAdminAuthContext } from '@/lib/admin-auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type RouteContext = {
  params: Promise<{
    tableId: string
  }>
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await getAdminAuthContext()

  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })
  }

  const { tableId } = await context.params
  const body = (await request.json().catch(() => null)) as { sessionId?: string } | null
  const sessionId = body?.sessionId?.trim()

  if (!sessionId) {
    return NextResponse.json({ message: 'Missing session id.' }, { status: 400 })
  }

  const supabase = createServerSupabaseClient()
  const { data: session, error: sessionError } = await supabase
    .from('table_sessions')
    .select('id, table_id, status')
    .eq('id', sessionId)
    .eq('table_id', tableId)
    .maybeSingle()

  if (sessionError || !session) {
    return NextResponse.json(
      { message: 'That session could not be found for this table.' },
      { status: 404 }
    )
  }

  if (session.status !== 'active') {
    return NextResponse.json(
      { message: 'That table session is already inactive.' },
      { status: 400 }
    )
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
    return NextResponse.json(
      { message: 'Could not clear the table session.' },
      { status: 500 }
    )
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
    return NextResponse.json(
      { message: 'Table closed, but the session orders could not be archived.' },
      { status: 500 }
    )
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
    return NextResponse.json(
      { message: 'Table closed, but the service requests could not be resolved.' },
      { status: 500 }
    )
  }

  revalidatePath('/admin/sessions')
  revalidatePath(`/admin/sessions/${tableId}`)
  revalidatePath('/api/admin/overview')

  return NextResponse.json({
    ok: true,
    message: 'Table session cleared.'
  })
}
