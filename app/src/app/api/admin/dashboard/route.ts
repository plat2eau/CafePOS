import { NextResponse } from 'next/server'
import { getAdminAuthContext } from '@/lib/admin-auth'
import { getAdminDashboardData } from '@/lib/admin-data'
import { apiError, unauthorizedApiError } from '@/lib/api-errors'

export async function GET(request: Request) {
  const auth = await getAdminAuthContext()

  if (!auth) {
    return unauthorizedApiError()
  }

  const { searchParams } = new URL(request.url)
  const fromTimestamp = searchParams.get('from')
  const toTimestamp = searchParams.get('to')
  const timezone = searchParams.get('timezone')?.trim() || 'Asia/Kolkata'

  try {
    const data = await getAdminDashboardData({ fromTimestamp, toTimestamp, timezone })
    return NextResponse.json(data)
  } catch (error) {
    return apiError('Could not load admin dashboard data.', 500, {
      code: 'admin_dashboard_load_failed',
      context: 'admin.dashboard.get',
      cause: error
    })
  }
}
