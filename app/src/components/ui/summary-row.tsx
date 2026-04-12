import * as React from 'react'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

type SummaryRowProps = React.ComponentProps<'div'> & {
  variant?: 'default' | 'total'
}

function SummaryRow({ className, variant = 'default', children, ...props }: SummaryRowProps) {
  const row = (
    <div
      className={cn(
        'flex items-start justify-between gap-3 md:items-center',
        variant === 'total' && 'font-semibold',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )

  if (variant === 'total') {
    return (
      <div className="space-y-3.5">
        <Separator />
        {row}
      </div>
    )
  }

  return row
}

export { SummaryRow }
export type { SummaryRowProps }
