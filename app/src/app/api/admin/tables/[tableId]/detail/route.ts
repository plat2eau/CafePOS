import { NextResponse } from 'next/server'
import { getAdminAuthContext } from '@/lib/admin-auth'
import { getAdminTableDetailData } from '@/lib/admin-data'

type RouteContext = {
  params: Promise<{
    tableId: string
  }>
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await getAdminAuthContext()

  if (!auth) {
    return NextResponse.json(
      {
        message: 'Unauthorized.'
      },
      { status: 401 }
    )
  }

  const { tableId } = await context.params

  try {
    const data = await getAdminTableDetailData(tableId)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      {
        message: 'Could not load table detail data.'
      },
      { status: 500 }
    )
  }
}
