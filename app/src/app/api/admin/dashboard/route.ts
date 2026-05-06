import { NextResponse } from 'next/server'
import { getAdminAuthContext } from '@/lib/admin-auth'
import { getAdminDashboardData } from '@/lib/admin-data'

export async function GET(request: Request) {
  const auth = await getAdminAuthContext()

  if (!auth) {
    return NextResponse.json(
      {
        message: 'Unauthorized.'
      },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(request.url)
  const fromTimestamp = searchParams.get('from')
  const toTimestamp = searchParams.get('to')
  const timezone = searchParams.get('timezone')?.trim() || 'Asia/Kolkata'

  try {
    const data = await getAdminDashboardData({ fromTimestamp, toTimestamp, timezone })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      {
        message: 'Could not load admin dashboard data.'
      },
      { status: 500 }
    )
  }
}
