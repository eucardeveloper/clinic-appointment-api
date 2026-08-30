// app/api/doctors/[id]/status/route.ts
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:8084'

async function backendHeaders() {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const res = await fetch(`${BACKEND}/api/doctors/${id}/status`, {
    method: 'PATCH',
    headers: await backendHeaders(),
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
