import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.API_URL || 'http://localhost:8084'

export async function POST(req: NextRequest) {
  const body = await req.json()

  const backendRes = await fetch(`${BACKEND}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = await backendRes.json().catch(() => ({}))

  if (!backendRes.ok) {
    return NextResponse.json(data, { status: backendRes.status })
  }

  // Forward the Set-Cookie header from backend to browser
  const res = NextResponse.json(data, { status: 200 })
  const setCookie = backendRes.headers.get('set-cookie')
  if (setCookie) {
    res.headers.set('set-cookie', setCookie)
  }
  return res
}
