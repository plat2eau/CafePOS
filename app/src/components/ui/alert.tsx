import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const alertVariants = cva('relative w-full rounded-[14px] border px-4 py-3 text-sm', {
  variants: {
    variant: {
      default: 'border-border bg-card text-card-foreground',
      success:
        'border-[rgb(84_133_94_/_0.24)] bg-[rgba(84,133,94,0.14)] text-[#2d6b38]',
      destructive:
        'border-[rgb(176_76_61_/_0.24)] bg-[rgba(176,76,61,0.14)] text-[#8a2d24]'
    }
  },
  defaultVariants: {
    variant: 'default'
  }
})

type AlertProps = React.ComponentProps<'div'> & VariantProps<typeof alertVariants>

function Alert({ className, variant, ...props }: AlertProps) {
  return (
    <div
      role="alert"
      data-slot="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="alert-title" className={cn('font-semibold tracking-tight', className)} {...props} />
  )
}

function AlertDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-description"
      className={cn('text-sm leading-6 [&_p]:m-0', className)}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
export type { AlertProps }
