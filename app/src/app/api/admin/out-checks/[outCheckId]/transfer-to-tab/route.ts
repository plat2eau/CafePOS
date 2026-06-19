import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getAdminAuthContext } from '@/lib/admin-auth'
import { apiError, unauthorizedApiError } from '@/lib/api-errors'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type RouteContext = {
  params: Promise<{
    outCheckId: string
  }>
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await getAdminAuthContext()

  if (!auth) {
    return unauthorizedApiError()
  }

  const { outCheckId } = await context.params
  const body = (await request.json().catch(() => null)) as { tabAccountId?: string } | null
  const tabAccountId = body?.tabAccountId?.trim()

  if (!tabAccountId) {
    return apiError('Choose a tab account.', 400, { code: 'tab_account_required' })
  }

  const supabase = createServerSupabaseClient()
  const { error } = await supabase.rpc('transfer_out_check_to_tab', {
    p_out_check_id: outCheckId,
    p_tab_account_id: tabAccountId
  })

  if (error) {
    return apiError('Could not transfer the out check to tab.', 400, {
      code: 'out_check_tab_transfer_failed',
      context: 'admin.outChecks.transferToTab',
      cause: error
    })
  }

  revalidatePath('/admin/sessions')
  revalidatePath('/admin/tabs')
  revalidatePath('/api/admin/overview')

  return NextResponse.json({
    ok: true,
    message: 'Out check transferred to tab.'
  })
}
