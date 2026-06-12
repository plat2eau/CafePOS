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
        phone?: string
        address?: string
        notes?: string
      }
    | null

  const name = body?.name?.trim() ?? ''

  if (!name) {
    return apiError('Enter a vendor name.', 400, { code: 'vendor_name_required' })
  }

  const supabase = createServerSupabaseClient()
  const { data: vendor, error } = await supabase
    .from('vendors')
    .insert({
      name,
      phone: body?.phone?.trim() || null,
      address: body?.address?.trim() || null,
      notes: body?.notes?.trim() || null
    })
    .select('id, name, phone, address, notes, is_active, created_at, updated_at')
    .single()

  if (error || !vendor) {
    return apiError('Could not create the vendor.', 500, {
      code: 'vendor_create_failed',
      context: 'admin.vendors.post',
      cause: error
    })
  }

  revalidatePath('/admin/purchases')

  return NextResponse.json({
    ok: true,
    vendor,
    message: 'Vendor added.'
  })
}
