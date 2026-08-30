export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'

export interface Appointment {
  id: number
  patientName: string
  doctorName: string
  appointmentTime: string
  department: string
  status: AppointmentStatus
  allowedTransitions: AppointmentStatus[]
}

export interface AppointmentRequest {
  patientName: string
  doctorName: string
  appointmentTime: string
  department: string
}

export interface StatusTransitionRequest {
  status: AppointmentStatus
}

export interface PagedResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  last: boolean
}

export interface ProblemDetail {
  type: string
  title: string
  status: number
  detail: string
  fieldErrors?: Record<string, string>
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  username: string
  role: string
  message: string
}

export type UserRole = 'ROLE_ADMIN' | 'ROLE_DOCTOR' | 'ROLE_PATIENT'
