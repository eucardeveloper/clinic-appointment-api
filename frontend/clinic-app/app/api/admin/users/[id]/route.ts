// app/api/admin/users/[id]/route.ts
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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const res = await fetch(`${BACKEND}/api/admin/users/${id}`, {
    method: 'DELETE',
    headers: await backendHeaders(),
  })
  if (res.status === 204) return new NextResponse(null, { status: 204 })
  const text = await res.text()
  return NextResponse.json(text ? JSON.parse(text) : {}, { status: res.status })
}
