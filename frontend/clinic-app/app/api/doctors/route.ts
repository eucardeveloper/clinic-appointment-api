// app/api/doctors/route.ts
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

async function safeJson(res: Response) {
  const text = await res.text()
  if (!text) return null
  try { return JSON.parse(text) } catch { return null }
}

export async function GET() {
  const res = await fetch(`${BACKEND}/api/doctors`, {
    headers: await backendHeaders(),
    cache: 'no-store',
  })
  const data = await safeJson(res)
  if (!res.ok) return NextResponse.json(data ?? { message: 'Backend error' }, { status: res.status })
  return NextResponse.json(data ?? [], { status: res.status })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const res = await fetch(`${BACKEND}/api/doctors`, {
    method: 'POST',
    headers: await backendHeaders(),
    body: JSON.stringify(body),
  })
  const data = await safeJson(res)
  return NextResponse.json(data ?? {}, { status: res.status })
}
