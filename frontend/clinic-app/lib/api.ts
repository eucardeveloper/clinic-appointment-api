import type {
  Appointment,
  AppointmentRequest,
  LoginRequest,
  LoginResponse,
  PagedResponse,
  StatusTransitionRequest,
  AppointmentStatus,
} from './types'

// Tüm istekler Next.js route handler üzerinden geçer (/api/...)
// Route handler'lar sunucu tarafında backend'e bağlanır — CORS ve cookie sorunu olmaz
const BASE = '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ title: 'Unknown error', detail: res.statusText }))
    throw err
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const login = (data: LoginRequest) =>
  request<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) })

export const logout = () =>
  request<void>('/auth/logout', { method: 'POST' })

// ── Appointments ──────────────────────────────────────────────────────────────

export const getAppointments = () =>
  request<Appointment[]>('/appointments')

export interface SearchParams {
  status?: AppointmentStatus
  doctorName?: string
  from?: string
  to?: string
  page?: number
  size?: number
  sortBy?: string
  sortDir?: 'asc' | 'desc'
}

export const searchAppointments = (params: SearchParams = {}) => {
  const q = new URLSearchParams()
  if (params.status)     q.set('status', params.status)
  if (params.doctorName) q.set('doctorName', params.doctorName)
  if (params.from)       q.set('from', params.from)
  if (params.to)         q.set('to', params.to)
  q.set('page',    String(params.page    ?? 0))
  q.set('size',    String(params.size    ?? 10))
  q.set('sortBy',  params.sortBy  ?? 'appointmentTime')
  q.set('sortDir', params.sortDir ?? 'asc')
  return request<PagedResponse<Appointment>>(`/appointments?${q}`)
}

export const getAppointment = (id: number) =>
  request<Appointment>(`/appointments/${id}`)

export const createAppointment = (data: AppointmentRequest) =>
  request<Appointment>('/appointments', { method: 'POST', body: JSON.stringify(data) })

export const updateAppointment = (id: number, data: AppointmentRequest) =>
  request<Appointment>(`/appointments/${id}`, { method: 'PUT', body: JSON.stringify(data) })

export const transitionStatus = (id: number, data: StatusTransitionRequest) =>
  request<Appointment>(`/appointments/${id}/status`, { method: 'PATCH', body: JSON.stringify(data) })

export const deleteAppointment = (id: number) =>
  request<void>(`/appointments/${id}`, { method: 'DELETE' })

// ── Doctors ───────────────────────────────────────────────────────────────────

export interface DoctorResponse {
  id: number
  name: string
  departmentId: number | null
  departmentName: string | null
  email: string
  phone: string | null
  active: boolean
}

export interface DoctorRequest {
  name: string
  departmentId: number | null
  email: string
  phone: string
}

export const getDoctors = () =>
  request<DoctorResponse[]>('/doctors')

export const createDoctor = (data: DoctorRequest) =>
  request<DoctorResponse>('/doctors', { method: 'POST', body: JSON.stringify(data) })

export const toggleDoctorStatus = (id: number, active: boolean) =>
  request<DoctorResponse>(`/doctors/${id}/status`, { method: 'PATCH', body: JSON.stringify({ active }) })

export const deleteDoctor = (id: number) =>
  request<void>(`/doctors/${id}`, { method: 'DELETE' })

export const updateDoctor = (id: number, data: DoctorRequest) =>
  request<DoctorResponse>(`/doctors/${id}`, { method: 'PUT', body: JSON.stringify(data) })

// ── Departments ───────────────────────────────────────────────────────────────

export interface DepartmentResponse {
  id: number
  name: string
  floor: number | null
  headDoctor: string | null
  activeDoctors: number
}

export interface DepartmentRequest {
  name: string
  floor: number | null
  headDoctor: string
}

export const getDepartments = () =>
  request<DepartmentResponse[]>('/departments')

export const createDepartment = (data: DepartmentRequest) =>
  request<DepartmentResponse>('/departments', { method: 'POST', body: JSON.stringify(data) })

export const deleteDepartment = (id: number) =>
  request<void>(`/departments/${id}`, { method: 'DELETE' })

export const updateDepartment = (id: number, data: DepartmentRequest) =>
  request<DepartmentResponse>(`/departments/${id}`, { method: 'PUT', body: JSON.stringify(data) })

// ── Admin User Management ────────────────────────────────────────────────────

export interface UserResponse {
  id: number
  username: string
  role: string
  displayName?: string
}

export interface CreateUserRequest {
  username: string
  password: string
  role: 'ROLE_DOCTOR' | 'ROLE_PATIENT'
  displayName: string
}

export const getUsers = () =>
  request<UserResponse[]>('/admin/users')

export const createUser = (data: CreateUserRequest) =>
  request<UserResponse>('/admin/users', { method: 'POST', body: JSON.stringify(data) })

export const deleteUser = (id: number) =>
  request<void>(`/admin/users/${id}`, { method: 'DELETE' })
