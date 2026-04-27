import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getAdminAuthContext } from '@/lib/admin-auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type RouteContext = {
  params: Promise<{
    outCheckId: string
  }>
}

export async function POST(_request: Request, context: RouteContext) {
  const auth = await getAdminAuthContext()

  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })
  }

  const { outCheckId } = await context.params
  const supabase = createServerSupabaseClient()
  const { error } = await supabase.rpc('close_out_check', {
    p_out_check_id: outCheckId
  })

  if (error) {
    return NextResponse.json(
      { message: 'Could not close the out check. It may already be closed.' },
      { status: 400 }
    )
  }

  revalidatePath('/admin/sessions')
  revalidatePath('/api/admin/overview')

  return NextResponse.json({
    ok: true,
    message: 'Out check closed.'
  })
}
