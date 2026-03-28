import { NextResponse } from 'next/server'
import {
  clearAdminAuthCookies,
  getAdminAuthContext,
  setAdminAuthCookies
} from '@/lib/admin-auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type SessionRequestBody = {
  accessToken?: string
  refreshToken?: string
}

export async function POST(request: Request) {
  const body = (await request.json()) as SessionRequestBody
  const accessToken = body.accessToken?.trim()
  const refreshToken = body.refreshToken?.trim()

  if (!accessToken || !refreshToken) {
    return NextResponse.json(
      {
        message: 'Missing auth session tokens.'
      },
      { status: 400 }
    )
  }

  const supabase = createServerSupabaseClient()
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser(accessToken)

  if (userError || !user) {
    return NextResponse.json(
      {
        message: 'Could not verify this Supabase session.'
      },
      { status: 401 }
    )
  }

  const { data: profile, error: profileError } = await supabase
    .from('staff_profiles')
    .select('user_id, role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (profileError || !profile) {
    return NextResponse.json(
      {
        message: 'This account does not have staff access yet.'
      },
      { status: 403 }
    )
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
  const auth = await getAdminAuthContext()

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
