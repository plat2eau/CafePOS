import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex min-h-7 items-center rounded-full px-2.5 py-1 text-sm font-semibold',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        secondary: 'bg-[var(--accent-soft)] text-[var(--accent)]',
        outline: 'border border-border bg-transparent text-foreground'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
)

type BadgeProps = React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
export type { BadgeProps }
