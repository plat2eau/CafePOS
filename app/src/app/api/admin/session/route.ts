import { NextResponse } from 'next/server'
import {
  clearAdminAuthCookies,
  getAdminAuthContext,
  setAdminAuthCookies
} from '@/lib/admin-auth'
import { apiError, logApiError } from '@/lib/api-errors'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type SessionRequestBody = {
  accessToken?: string
  refreshToken?: string
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as SessionRequestBody | null
  const accessToken = body?.accessToken?.trim()
  const refreshToken = body?.refreshToken?.trim()

  if (!accessToken || !refreshToken) {
    return apiError('Missing auth session tokens.', 400, { code: 'missing_auth_tokens' })
  }

  const supabase = createServerSupabaseClient()
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser(accessToken)

  if (userError || !user) {
    return apiError('Could not verify this Supabase session.', 401, {
      code: 'supabase_session_invalid',
      context: 'admin.session.post.getUser',
      cause: userError
    })
  }

  const { data: profile, error: profileError } = await supabase
    .from('staff_profiles')
    .select('user_id, role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (profileError || !profile) {
    logApiError('admin.session.post.staffProfile', profileError)
    return apiError('This account does not have staff access yet.', 403, {
      code: 'staff_access_missing'
    })
  }

  await setAdminAuthCookies(accessToken, refreshToken)

  return NextResponse.json({
    ok: true
  })
}

export async function DELETE() {
  await clearAdminAuthCookies()

  return NextResponse.json({
    ok: true
  })
}

export async function GET() {
  const auth = await getAdminAuthContext({
    persistRefreshedSession: true,
    clearInvalidSession: true
  })

  if (!auth) {
    return NextResponse.json(
      {
        authenticated: false
      },
      { status: 401 }
    )
  }

  return NextResponse.json({
    authenticated: true,
    role: auth.profile.role,
    displayName: auth.profile.display_name,
    email: auth.email
  })
}
