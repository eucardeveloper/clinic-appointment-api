import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const BACKEND = process.env.API_URL || 'http://localhost:8084'

async function backendFetch(path: string, init: RequestInit = {}) {
  const cookieStore = await cookies()
  const authToken = cookieStore.get('access_token')
  return fetch(`${BACKEND}/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Cookie: `access_token=${authToken.value}` } : {}),
      ...(init.headers as Record<string, string> || {}),
    },
  })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.toString()
  const path = query ? `/appointments/search?${query}` : '/appointments'
  const backendRes = await backendFetch(path)
  const data = await backendRes.json().catch(() => ({}))
  return NextResponse.json(data, { status: backendRes.status })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const backendRes = await backendFetch('/appointments', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  const data = await backendRes.json().catch(() => ({}))
  return NextResponse.json(data, { status: backendRes.status })
}
