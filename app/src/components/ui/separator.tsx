import * as React from 'react'
import { cn } from '@/lib/utils'

type SeparatorProps = React.ComponentProps<'div'> & {
  decorative?: boolean
  orientation?: 'horizontal' | 'vertical'
}

function Separator({
  className,
  decorative = true,
  orientation = 'horizontal',
  ...props
}: SeparatorProps) {
  return (
    <div
      role={decorative ? 'presentation' : 'separator'}
      aria-orientation={orientation}
      data-slot="separator"
      className={cn(
        'shrink-0 bg-border',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className
      )}
      {...props}
    />
  )
}

export { Separator }
export type { SeparatorProps }
