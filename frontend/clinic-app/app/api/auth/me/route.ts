import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const BACKEND = process.env.API_URL || 'http://localhost:8084'

export async function GET(_req: NextRequest) {
  const cookieStore = await cookies()
  const authToken = cookieStore.get('access_token')

  if (!authToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const backendRes = await fetch(`${BACKEND}/api/auth/me`, {
    headers: { Cookie: `access_token=${authToken.value}` },
  })

  if (!backendRes.ok) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const data = await backendRes.json()
  return NextResponse.json(data)
}
