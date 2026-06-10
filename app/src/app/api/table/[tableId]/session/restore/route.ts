import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { apiError } from '@/lib/api-errors'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  getTableOrderIdentityCookieName,
  getTableSessionCookieName,
  getTableSessionCookieOptions,
  serializeTableOrderIdentityCookie
} from '@/lib/table-session'

type RouteContext = {
  params: Promise<{
    tableId: string
  }>
}

export async function POST(request: Request, context: RouteContext) {
  const { tableId } = await context.params
  const body = (await request.json().catch(() => null)) as { sessionId?: string } | null
  const sessionId = body?.sessionId?.trim()

  if (!sessionId) {
    return apiError('Missing session id.', 400, { code: 'session_id_required' })
  }

  const supabase = createServerSupabaseClient()
  const { data: session, error } = await supabase
    .from('table_sessions')
    .select('id, table_id, status, guest_name, guest_phone')
    .eq('id', sessionId)
    .eq('table_id', tableId)
    .eq('status', 'active')
    .maybeSingle()

  if (error || !session) {
    return apiError('That table session is no longer active.', 404, {
      code: 'table_session_not_active',
      context: 'table.session.restore.post.loadSession',
      cause: error
    })
  }

  const cookieStore = await cookies()
  const cookieOptions = getTableSessionCookieOptions()

  cookieStore.set(getTableSessionCookieName(tableId), session.id, cookieOptions)

  if (session.guest_phone && /^\d{10}$/.test(session.guest_phone.trim())) {
    cookieStore.set(
      getTableOrderIdentityCookieName(tableId),
      serializeTableOrderIdentityCookie({
        name: session.guest_name,
        phone: session.guest_phone.trim()
      }),
      cookieOptions
    )
  }

  return NextResponse.json({ ok: true })
}
