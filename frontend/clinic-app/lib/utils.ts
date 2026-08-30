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
  PENDING:   'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  CONFIRMED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  NO_SHOW:   'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

export const DEPARTMENTS = [
  'Cardiology', 'Neurology', 'Orthopedics', 'Dermatology',
  'Pediatrics', 'General Medicine', 'Emergency',
]

export const GERMAN_DOCTORS = [
  'Dr. James Wilson', 'Dr. Emily Carter', 'Dr. Lisa Cuddy',
  'Dr. Michael Park', 'Dr. Sarah Chen', 'Dr. Tom Nguyen',
  'Dr. Marcus Webb', 'Dr. Anna Kowalski',
]
