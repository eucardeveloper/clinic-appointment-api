// Doctor & Department API client functions
// These call Next.js Route Handlers (BFF proxy) — never the backend directly

export interface DoctorResponse {
  id: number
  name: string
  departmentId: number | null
  departmentName: string | null
  email: string
  phone: string | null
  active: boolean
}

export interface DepartmentResponse {
  id: number
  name: string
  floor: number | null
  headDoctor: string | null
  activeDoctors: number
}

export interface DoctorRequest {
  name: string
  departmentId: number | null
  email: string
  phone: string
}

export interface DepartmentRequest {
  name: string
  floor: number | null
  headDoctor: string
}

// ── Doctors ──────────────────────────────────────────────────────────────────

export async function getDoctors(): Promise<DoctorResponse[]> {
  const res = await fetch('/api/doctors')
  if (!res.ok) throw new Error('Failed to fetch doctors')
  return res.json()
}

export async function createDoctor(data: DoctorRequest): Promise<DoctorResponse> {
  const res = await fetch('/api/doctors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message ?? 'Failed to create doctor')
  }
  return res.json()
}

export async function toggleDoctorStatus(id: number, active: boolean): Promise<DoctorResponse> {
  const res = await fetch(`/api/doctors/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ active }),
  })
  if (!res.ok) throw new Error('Failed to update doctor status')
  return res.json()
}

export async function deleteDoctor(id: number): Promise<void> {
  const res = await fetch(`/api/doctors/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete doctor')
}

// ── Departments ───────────────────────────────────────────────────────────────

export async function getDepartments(): Promise<DepartmentResponse[]> {
  const res = await fetch('/api/departments')
  if (!res.ok) throw new Error('Failed to fetch departments')
  return res.json()
}

export async function createDepartment(data: DepartmentRequest): Promise<DepartmentResponse> {
  const res = await fetch('/api/departments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message ?? 'Failed to create department')
  }
  return res.json()
}

export async function deleteDepartment(id: number): Promise<void> {
  const res = await fetch(`/api/departments/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete department')
}
