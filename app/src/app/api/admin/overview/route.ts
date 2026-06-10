import { NextResponse } from 'next/server'
import { getAdminAuthContext } from '@/lib/admin-auth'
import { getAdminOverviewData } from '@/lib/admin-data'
import { apiError, unauthorizedApiError } from '@/lib/api-errors'

export async function GET() {
  const auth = await getAdminAuthContext()

  if (!auth) {
    return unauthorizedApiError()
  }

  try {
    const data = await getAdminOverviewData()
    return NextResponse.json(data)
  } catch (error) {
    return apiError('Could not load admin overview data.', 500, {
      code: 'admin_overview_load_failed',
      context: 'admin.overview.get',
      cause: error
    })
  }
}
