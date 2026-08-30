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

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const backendRes = await backendFetch(`/appointments/${id}`)
  const data = await backendRes.json().catch(() => ({}))
  return NextResponse.json(data, { status: backendRes.status })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const backendRes = await backendFetch(`/appointments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
  const data = await backendRes.json().catch(() => ({}))
  return NextResponse.json(data, { status: backendRes.status })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const backendRes = await backendFetch(`/appointments/${id}`, { method: 'DELETE' })
  if (backendRes.status === 204) return new NextResponse(null, { status: 204 })
  const data = await backendRes.json().catch(() => ({}))
  return NextResponse.json(data, { status: backendRes.status })
}
