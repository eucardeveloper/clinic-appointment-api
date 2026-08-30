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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const backendRes = await backendFetch(`/appointments/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  const data = await backendRes.json().catch(() => ({}))
  return NextResponse.json(data, { status: backendRes.status })
}
