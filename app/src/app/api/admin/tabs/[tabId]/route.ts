import { NextResponse } from 'next/server'
import { getAdminAuthContext } from '@/lib/admin-auth'
import { apiError, unauthorizedApiError } from '@/lib/api-errors'
import { getAdminTabDetailData } from '@/lib/admin-data'

type RouteContext = {
  params: Promise<{
    tabId: string
  }>
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await getAdminAuthContext()

  if (!auth) {
    return unauthorizedApiError()
  }

  const { tabId } = await context.params

  try {
    const data = await getAdminTabDetailData(tabId)

    if (!data) {
      return apiError('Tab account not found.', 404, { code: 'tab_not_found' })
    }

    return NextResponse.json(data)
  } catch (error) {
    return apiError('Could not load tab account.', 500, {
      code: 'tab_detail_load_failed',
      context: 'admin.tabs.detail.get',
      cause: error
    })
  }
}
