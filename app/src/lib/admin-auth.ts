import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'

const accessTokenCookieName = 'cafepos-admin-access-token'
const refreshTokenCookieName = 'cafepos-admin-refresh-token'

type StaffProfile = Database['public']['Tables']['staff_profiles']['Row']

export type AdminAuthContext = {
  userId: string
  email: string | null
  profile: StaffProfile
}

function getCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8
  }
}

export async function setAdminAuthCookies(accessToken: string, refreshToken: string) {
  const cookieStore = await cookies()
  const options = getCookieOptions()

  cookieStore.set(accessTokenCookieName, accessToken, options)
  cookieStore.set(refreshTokenCookieName, refreshToken, options)
}

export async function clearAdminAuthCookies() {
  const cookieStore = await cookies()

  cookieStore.delete(accessTokenCookieName)
  cookieStore.delete(refreshTokenCookieName)
}

export async function getAdminAuthContext(): Promise<AdminAuthContext | null> {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get(accessTokenCookieName)?.value
  const refreshToken = cookieStore.get(refreshTokenCookieName)?.value

  if (!accessToken || !refreshToken) {
    return null
  }

  const supabase = createServerSupabaseClient()
  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken
  })

  const user = sessionData.user

  if (sessionError || !user) {
    return null
  }

  const { data: profile, error: profileError } = await supabase
    .from('staff_profiles')
    .select('user_id, role, display_name, created_at')
    .eq('user_id', user.id)
    .maybeSingle()

  if (profileError || !profile) {
    return null
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    profile
  }
}

export async function requireAdminAuth() {
  const auth = await getAdminAuthContext()

  if (!auth) {
    redirect('/admin/login?error=unauthorized')
  }

  return auth
}
