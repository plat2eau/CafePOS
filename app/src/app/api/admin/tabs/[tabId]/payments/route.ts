import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getAdminAuthContext } from '@/lib/admin-auth'
import { apiError, unauthorizedApiError } from '@/lib/api-errors'
import { getAdminTabDetailData } from '@/lib/admin-data'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type RouteContext = {
  params: Promise<{
    tabId: string
  }>
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await getAdminAuthContext()

  if (!auth) {
    return unauthorizedApiError()
  }

  const { tabId } = await context.params
  const body = (await request.json().catch(() => null)) as { amountCents?: number } | null
  const amountCents = Number(body?.amountCents ?? 0)

  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    return apiError('Enter a valid payment amount.', 400, { code: 'tab_payment_amount_invalid' })
  }

  const detail = await getAdminTabDetailData(tabId)

  if (!detail) {
    return apiError('Tab account not found.', 404, { code: 'tab_not_found' })
  }

  if (!detail.tab.is_active) {
    return apiError('That tab account is inactive.', 400, { code: 'tab_inactive' })
  }

  if (amountCents > detail.tab.due_cents) {
    return apiError('Payment cannot be more than the remaining tab due.', 400, {
      code: 'tab_payment_overpayment'
    })
  }

  const supabase = createServerSupabaseClient()
  const { data: payment, error } = await supabase
    .from('tab_payments')
    .insert({
      tab_account_id: tabId,
      amount_cents: amountCents
    })
    .select('id, tab_account_id, amount_cents, created_at')
    .single()

  if (error || !payment) {
    return apiError('Could not record the tab payment.', 500, {
      code: 'tab_payment_create_failed',
      context: 'admin.tabs.payments.post',
      cause: error
    })
  }

  revalidatePath('/admin/tabs')
  revalidatePath(`/admin/tabs/${tabId}`)

  return NextResponse.json({
    ok: true,
    payment,
    message: 'Tab payment recorded.'
  })
}
