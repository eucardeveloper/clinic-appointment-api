// app/api/departments/[id]/route.ts
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:8084'

async function backendHeaders() {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const res = await fetch(`${BACKEND}/api/departments/${id}`, {
    method: 'DELETE',
    headers: await backendHeaders(),
  })
  if (res.status === 204) return new NextResponse(null, { status: 204 })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
