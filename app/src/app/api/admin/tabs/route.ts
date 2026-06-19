import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getAdminAuthContext } from '@/lib/admin-auth'
import { apiError, unauthorizedApiError } from '@/lib/api-errors'
import { getAdminTabsData } from '@/lib/admin-data'
import { createServerSupabaseClient } from '@/lib/supabase/server'

function normalizePhone(value: string) {
  return value.replace(/\D/g, '')
}

export async function GET() {
  const auth = await getAdminAuthContext()

  if (!auth) {
    return unauthorizedApiError()
  }

  try {
    return NextResponse.json(await getAdminTabsData())
  } catch (error) {
    return apiError('Could not load tabs.', 500, {
      code: 'tabs_load_failed',
      context: 'admin.tabs.get',
      cause: error
    })
  }
}

export async function POST(request: Request) {
  const auth = await getAdminAuthContext()

  if (!auth) {
    return unauthorizedApiError()
  }

  const body = (await request.json().catch(() => null)) as
    | {
        name?: string
        phone?: string
      }
    | null
  const name = body?.name?.trim() ?? ''
  const phone = normalizePhone(body?.phone ?? '')

  if (!name) {
    return apiError('Enter a tab account name.', 400, { code: 'tab_name_required' })
  }

  if (!/^\d{10}$/.test(phone)) {
    return apiError('Enter a valid 10-digit phone number.', 400, { code: 'tab_phone_invalid' })
  }

  const supabase = createServerSupabaseClient()
  const { data: tab, error } = await supabase
    .from('tab_accounts')
    .insert({
      name,
      phone
    })
    .select('id, name, phone, is_active, created_at, updated_at')
    .single()

  if (error || !tab) {
    if (error?.code === '23505') {
      return apiError('A tab account already exists for that phone number.', 409, {
        code: 'tab_phone_duplicate'
      })
    }

    return apiError('Could not create the tab account.', 500, {
      code: 'tab_create_failed',
      context: 'admin.tabs.post',
      cause: error
    })
  }

  revalidatePath('/admin/tabs')

  return NextResponse.json({
    ok: true,
    tab,
    message: 'Tab account created.'
  })
}
