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

export async function POST(request: Request, context: RouteContext) {
  const auth = await getAdminAuthContext()

  if (!auth) {
    return unauthorizedApiError()
  }

  const { tableId } = await context.params
  const body = (await request.json().catch(() => null)) as
    | {
        sessionId?: string
        tabAccountId?: string
      }
    | null
  const sessionId = body?.sessionId?.trim()
  const tabAccountId = body?.tabAccountId?.trim()

  if (!sessionId) {
    return apiError('Missing session id.', 400, { code: 'session_id_required' })
  }

  if (!tabAccountId) {
    return apiError('Choose a tab account.', 400, { code: 'tab_account_required' })
  }

  const supabase = createServerSupabaseClient()
  const { error } = await supabase.rpc('transfer_table_session_to_tab', {
    p_session_id: sessionId,
    p_table_id: tableId,
    p_tab_account_id: tabAccountId
  })

  if (error) {
    return apiError('Could not transfer the table session to tab.', 400, {
      code: 'table_session_tab_transfer_failed',
      context: 'admin.tables.session.transferToTab',
      cause: error
    })
  }

  revalidatePath('/admin/sessions')
  revalidatePath(`/admin/sessions/${tableId}`)
  revalidatePath('/admin/tabs')
  revalidatePath(`/table/${tableId}`)
  revalidatePath('/api/admin/overview')

  return NextResponse.json({
    ok: true,
    message: 'Table session transferred to tab.'
  })
}
