import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getAdminAuthContext } from '@/lib/admin-auth'
import { apiError, unauthorizedApiError } from '@/lib/api-errors'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const auth = await getAdminAuthContext()

  if (!auth) {
    return unauthorizedApiError()
  }

  const body = (await request.json().catch(() => null)) as
    | {
        name?: string
      }
    | null

  const name = body?.name?.trim() ?? ''

  if (!name) {
    return apiError('Enter an item name.', 400, { code: 'purchase_item_name_required' })
  }

  const supabase = createServerSupabaseClient()
  const { data: purchaseItem, error } = await supabase
    .from('purchase_items')
    .insert({
      name
    })
    .select('id, name, is_active, created_at, updated_at')
    .single()

  if (error || !purchaseItem) {
    return apiError('Could not create the purchase item.', 500, {
      code: 'purchase_item_create_failed',
      context: 'admin.purchaseItems.post',
      cause: error
    })
  }

  revalidatePath('/admin/purchases')

  return NextResponse.json({
    ok: true,
    purchaseItem,
    message: 'Purchase item added.'
  })
}
