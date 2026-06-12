import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getAdminPurchasesData } from '@/lib/admin-data'
import { getAdminAuthContext } from '@/lib/admin-auth'
import { apiError, logApiError, unauthorizedApiError } from '@/lib/api-errors'
import {
  normalizeAdminPurchasePayload,
  type RequestedPurchasePayload
} from '@/lib/admin-purchase-write'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET() {
  const auth = await getAdminAuthContext()

  if (!auth) {
    return unauthorizedApiError()
  }

  try {
    return NextResponse.json(await getAdminPurchasesData())
  } catch (error) {
    return apiError('Could not load purchases.', 500, {
      code: 'purchases_load_failed',
      context: 'admin.purchases.get',
      cause: error
    })
  }
}

export async function POST(request: Request) {
  const auth = await getAdminAuthContext()

  if (!auth) {
    return unauthorizedApiError()
  }

  const body = (await request.json().catch(() => null)) as RequestedPurchasePayload | null
  const normalized = await normalizeAdminPurchasePayload(body)

  if (!normalized.ok) {
    return normalized.response
  }

  const supabase = createServerSupabaseClient()
  const { data: purchase, error: purchaseError } = await supabase
    .from('purchases')
    .insert({
      ...normalized.payload.purchase,
      created_by: auth.userId
    })
    .select('id')
    .single()

  if (purchaseError || !purchase) {
    return apiError('Could not create the purchase.', 500, {
      code: 'purchase_create_failed',
      context: 'admin.purchases.post.createPurchase',
      cause: purchaseError
    })
  }

  const { error: linesError } = await supabase.from('purchase_lines').insert(
    normalized.payload.lines.map((line) => ({
      purchase_id: purchase.id,
      ...line
    }))
  )

  if (linesError) {
    const { error: cleanupError } = await supabase.from('purchases').delete().eq('id', purchase.id)
    if (cleanupError) {
      logApiError('admin.purchases.post.cleanupPurchaseAfterLinesFailure', cleanupError)
    }

    return apiError('Could not save the purchase lines.', 500, {
      code: 'purchase_lines_create_failed',
      context: 'admin.purchases.post.createLines',
      cause: linesError
    })
  }

  revalidatePath('/admin/purchases')

  return NextResponse.json({
    ok: true,
    purchaseId: purchase.id,
    message: 'Purchase saved.'
  })
}
