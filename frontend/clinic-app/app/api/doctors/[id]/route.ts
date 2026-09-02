// app/api/doctors/[id]/route.ts
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:8084'

async function backendHeaders(contentType = false) {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (contentType) headers['Content-Type'] = 'application/json'
  return headers
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.text()
  const res = await fetch(`${BACKEND}/api/doctors/${id}`, {
    method: 'PUT',
    headers: await backendHeaders(true),
    body,
  })
  const data = await res.json().catch(() => null)
  return NextResponse.json(data, { status: res.status })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.text()
  const res = await fetch(`${BACKEND}/api/doctors/${id}`, {
    method: 'PATCH',
    headers: await backendHeaders(true),
    body,
  })
  const data = await res.json().catch(() => null)
  return NextResponse.json(data, { status: res.status })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const res = await fetch(`${BACKEND}/api/doctors/${id}`, {
    method: 'DELETE',
    headers: await backendHeaders(),
  })
  if (res.status === 204) return new NextResponse(null, { status: 204 })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
