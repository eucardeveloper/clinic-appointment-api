import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import type { AppointmentStatus } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** German date format: TT.MM.JJJJ HH:mm */
export function formatDateTime(iso: string): string {
  return format(parseISO(iso), 'dd.MM.yyyy HH:mm', { locale: de })
}

export function formatDate(iso: string): string {
  return format(parseISO(iso), 'dd.MM.yyyy', { locale: de })
}

/** Calendar week (KW) — standard in DACH */
export function formatKW(iso: string): string {
  return format(parseISO(iso), "'KW' ww yyyy", { locale: de })
}

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING:   'Ausstehend',
  CONFIRMED: 'Bestätigt',
  COMPLETED: 'Abgeschlossen',
  CANCELLED: 'Storniert',
  NO_SHOW:   'Nicht erschienen',
}

export const STATUS_COLORS: Record<AppointmentStatus, string> = {
  PENDING:   'bg-amber-50 text-amber-700 border border-amber-200',
  CONFIRMED: 'bg-blue-50 text-blue-700 border border-blue-200',
  COMPLETED: 'bg-green-50 text-green-700 border border-green-200',
  CANCELLED: 'bg-red-50 text-red-700 border border-red-200',
  NO_SHOW:   'bg-slate-100 text-slate-600 border border-slate-200',
}

/** Extract a human-readable message from API errors (plain {title, detail} objects) or Error instances. */
export function errorMessage(err: unknown, fallback: string): string {
  if (!err) return fallback
  if (typeof err === 'string') return err
  const e = err as { detail?: unknown; message?: unknown; title?: unknown }
  if (typeof e.detail === 'string' && e.detail) return e.detail
  if (typeof e.message === 'string' && e.message) return e.message
  if (typeof e.title === 'string' && e.title) return e.title
  return fallback
}

/** Phone: 5-20 chars of digits, space, ( ) - and an optional leading + */
export const PHONE_REGEX = /^\+?[0-9 ()-]{5,20}$/
export const PHONE_MESSAGE = 'Phone must be 5-20 characters: digits, spaces, ( ) - (optional leading +)'

export const DEPARTMENTS = [
  'Cardiology', 'Neurology', 'Orthopedics', 'Dermatology',
  'Pediatrics', 'General Medicine', 'Emergency',
]

export const GERMAN_DOCTORS = [
  'Dr. James Wilson', 'Dr. Emily Carter', 'Dr. Lisa Cuddy',
  'Dr. Michael Park', 'Dr. Sarah Chen', 'Dr. Tom Nguyen',
  'Dr. Marcus Webb', 'Dr. Anna Kowalski',
]
