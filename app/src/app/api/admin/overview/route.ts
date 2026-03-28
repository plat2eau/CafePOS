import { NextResponse } from 'next/server'
import { getAdminAuthContext } from '@/lib/admin-auth'
import { getAdminOverviewData } from '@/lib/admin-data'

export async function GET() {
  const auth = await getAdminAuthContext()

  if (!auth) {
    return NextResponse.json(
      {
        message: 'Unauthorized.'
      },
      { status: 401 }
    )
  }

  try {
    const data = await getAdminOverviewData()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      {
        message: 'Could not load admin overview data.'
      },
      { status: 500 }
    )
  }
}
