import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const BACKEND = process.env.API_URL || 'http://localhost:8084'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const authToken = cookieStore.get('access_token')

  const backendRes = await fetch(`${BACKEND}/api/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Cookie: `access_token=${authToken.value}` } : {}),
    },
  })

  const res = NextResponse.json({ ok: true }, { status: 200 })
  // Clear the cookie on browser side
  res.cookies.set('access_token', '', { maxAge: 0, path: '/' })
  return res
}
