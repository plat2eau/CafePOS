import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { cn } from '@/lib/utils'

type LabelProps = React.ComponentProps<typeof LabelPrimitive.Root>

function Label({ className, ...props }: LabelProps) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        'flex items-center gap-2 text-sm font-medium leading-none text-foreground select-none',
        className
      )}
      {...props}
    />
  )
}

export { Label }
export type { LabelProps }
