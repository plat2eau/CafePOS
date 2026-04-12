import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const actionGroupVariants = cva('', {
  variants: {
    layout: {
      stack: 'flex flex-col gap-2.5',
      wrap: 'flex flex-wrap gap-2.5'
    }
  },
  defaultVariants: {
    layout: 'wrap'
  }
})

type ActionGroupProps = React.ComponentProps<'div'> & VariantProps<typeof actionGroupVariants>

function ActionGroup({ className, layout, ...props }: ActionGroupProps) {
  return <div className={cn(actionGroupVariants({ layout }), className)} {...props} />
}

export { ActionGroup }
export type { ActionGroupProps }
