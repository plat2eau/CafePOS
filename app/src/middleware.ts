import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const accessTokenCookieName = 'cafepos-admin-access-token'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasAdminSession = Boolean(request.cookies.get(accessTokenCookieName)?.value)

  if (pathname.startsWith('/admin/sessions') && !hasAdminSession) {
    const loginUrl = new URL('/admin/login', request.url)
    loginUrl.searchParams.set('error', 'unauthorized')
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/sessions/:path*']
}
