import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getAdminAuthContext } from '@/lib/admin-auth'
import { apiError, unauthorizedApiError } from '@/lib/api-errors'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type VendorRouteContext = {
  params: Promise<{
    vendorId: string
  }>
}

export async function PATCH(request: Request, context: VendorRouteContext) {
  const auth = await getAdminAuthContext()

  if (!auth) {
    return unauthorizedApiError()
  }

  const { vendorId } = await context.params
  const body = (await request.json().catch(() => null)) as
    | {
        isActive?: boolean
      }
    | null

  if (typeof body?.isActive !== 'boolean') {
    return apiError('Choose whether this vendor is active.', 400, { code: 'vendor_active_required' })
  }

  const supabase = createServerSupabaseClient()
  const { data: vendor, error } = await supabase
    .from('vendors')
    .update({
      is_active: body.isActive,
      updated_at: new Date().toISOString()
    })
    .eq('id', vendorId)
    .select('id, name, phone, address, notes, is_active, created_at, updated_at')
    .maybeSingle()

  if (error || !vendor) {
    return apiError('Could not update the vendor.', 500, {
      code: 'vendor_update_failed',
      context: 'admin.vendors.patch',
      cause: error
    })
  }

  revalidatePath('/admin/purchases')

  return NextResponse.json({
    ok: true,
    vendor,
    message: vendor.is_active ? 'Vendor reactivated.' : 'Vendor deactivated.'
  })
}
