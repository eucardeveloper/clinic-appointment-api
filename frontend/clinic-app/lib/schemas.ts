import { z } from 'zod'

/**
 * Zod schema for appointment creation/update.
 * Mirrors backend @Valid constraints exactly — same rules, client-side.
 */
export const appointmentSchema = z.object({
  patientName: z
    .string()
    .min(2, 'Patient name must be at least 2 characters')
    .max(100, 'Patient name must be at most 100 characters'),
  doctorName: z
    .string()
    .min(1, 'Please select a doctor'),
  department: z
    .string()
    .min(1, 'Please select a department'),
  appointmentTime: z
    .string()
    .min(1, 'Please select a date and time')
    .refine(val => {
      const d = new Date(val)
      return !isNaN(d.getTime()) && d > new Date()
    }, 'Appointment must be in the future'),
})

export type AppointmentFormValues = z.infer<typeof appointmentSchema>
