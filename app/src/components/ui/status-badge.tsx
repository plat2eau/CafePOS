import * as React from 'react'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type StatusBadgeProps = BadgeProps

function StatusBadge({ className, variant = 'secondary', ...props }: StatusBadgeProps) {
  return (
    <Badge
      variant={variant}
      className={cn('capitalize tracking-[0.01em]', className)}
      {...props}
    />
  )
}

export { StatusBadge }
export type { StatusBadgeProps }
