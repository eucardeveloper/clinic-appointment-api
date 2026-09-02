import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const token = req.cookies.get('access_token')?.value

  if (!token) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('from', req.nextUrl.pathname)
    const res = NextResponse.redirect(loginUrl)
    // Prevent bfcache so back-button never restores a stale admin page
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    return res
  }

  // Authenticated — still disable bfcache for admin pages
  const res = NextResponse.next()
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  return res
}

export const config = {
  matcher: ['/admin/:path*'],
}
