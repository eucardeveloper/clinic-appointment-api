import { cn, STATUS_COLORS } from '@/lib/utils'
import type { AppointmentStatus } from '@/lib/types'

interface Props {
  status: AppointmentStatus
  statusLabels: Record<AppointmentStatus, string>
  className?: string
}

export function StatusBadge({ status, statusLabels, className }: Props) {
  return (
    <span
      role="status"
      aria-label={`Status: ${statusLabels[status]}`}
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        STATUS_COLORS[status],
        className
      )}
    >
      {statusLabels[status]}
    </span>
  )
}
