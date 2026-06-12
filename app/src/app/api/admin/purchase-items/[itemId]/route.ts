import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getAdminAuthContext } from '@/lib/admin-auth'
import { apiError, unauthorizedApiError } from '@/lib/api-errors'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type PurchaseItemRouteContext = {
  params: Promise<{
    itemId: string
  }>
}

export async function PATCH(request: Request, context: PurchaseItemRouteContext) {
  const auth = await getAdminAuthContext()

  if (!auth) {
    return unauthorizedApiError()
  }

  const { itemId } = await context.params
  const body = (await request.json().catch(() => null)) as
    | {
        isActive?: boolean
      }
    | null

  if (typeof body?.isActive !== 'boolean') {
    return apiError('Choose whether this item is active.', 400, { code: 'purchase_item_active_required' })
  }

  const supabase = createServerSupabaseClient()
  const { data: purchaseItem, error } = await supabase
    .from('purchase_items')
    .update({
      is_active: body.isActive,
      updated_at: new Date().toISOString()
    })
    .eq('id', itemId)
    .select('id, name, is_active, created_at, updated_at')
    .maybeSingle()

  if (error || !purchaseItem) {
    return apiError('Could not update the purchase item.', 500, {
      code: 'purchase_item_update_failed',
      context: 'admin.purchaseItems.patch',
      cause: error
    })
  }

  revalidatePath('/admin/purchases')

  return NextResponse.json({
    ok: true,
    purchaseItem,
    message: purchaseItem.is_active ? 'Purchase item reactivated.' : 'Purchase item deactivated.'
  })
}
