import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getAdminAuthContext } from '@/lib/admin-auth'
import { apiError, unauthorizedApiError } from '@/lib/api-errors'
import {
  normalizeAdminPurchasePayload,
  type RequestedPurchasePayload
} from '@/lib/admin-purchase-write'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type PurchaseRouteContext = {
  params: Promise<{
    purchaseId: string
  }>
}

export async function PATCH(request: Request, context: PurchaseRouteContext) {
  const auth = await getAdminAuthContext()

  if (!auth) {
    return unauthorizedApiError()
  }

  const { purchaseId } = await context.params
  const body = (await request.json().catch(() => null)) as RequestedPurchasePayload | null
  const normalized = await normalizeAdminPurchasePayload(body)

  if (!normalized.ok) {
    return normalized.response
  }

  const supabase = createServerSupabaseClient()
  const now = new Date().toISOString()
  const { data: purchase, error: purchaseError } = await supabase
    .from('purchases')
    .update({
      ...normalized.payload.purchase,
      updated_at: now
    })
    .eq('id', purchaseId)
    .select('id')
    .maybeSingle()

  if (purchaseError || !purchase) {
    return apiError('Could not update the purchase.', 500, {
      code: 'purchase_update_failed',
      context: 'admin.purchases.patch.updatePurchase',
      cause: purchaseError
    })
  }

  const lineRows = normalized.payload.lines.map((line) => ({
    id: randomUUID(),
    purchase_id: purchaseId,
    ...line
  }))
  const { error: insertLinesError } = await supabase.from('purchase_lines').insert(lineRows)

  if (insertLinesError) {
    return apiError('Could not save the updated purchase lines.', 500, {
      code: 'purchase_lines_update_failed',
      context: 'admin.purchases.patch.insertLines',
      cause: insertLinesError
    })
  }

  const retainedLineIds = lineRows.map((line) => line.id).join(',')
  const { error: deleteOldLinesError } = await supabase
    .from('purchase_lines')
    .delete()
    .eq('purchase_id', purchaseId)
    .not('id', 'in', `(${retainedLineIds})`)

  if (deleteOldLinesError) {
    return apiError('Purchase updated, but old lines could not be removed.', 500, {
      code: 'purchase_old_lines_delete_failed',
      context: 'admin.purchases.patch.deleteOldLines',
      cause: deleteOldLinesError
    })
  }

  revalidatePath('/admin/purchases')

  return NextResponse.json({
    ok: true,
    purchaseId,
    message: 'Purchase updated.'
  })
}
