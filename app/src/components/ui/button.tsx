import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[transform,color,background-color,box-shadow] outline-none disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-[3px] focus-visible:ring-ring data-[loading=true]:pointer-events-none data-[loading=true]:cursor-wait',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-sm hover:-translate-y-px hover:bg-primary/95',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        outline: 'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
        secondary:
          'border border-primary bg-transparent text-primary shadow-sm hover:-translate-y-px hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline'
      },
      size: {
        default: 'h-10 px-4 py-2',
        form: 'min-h-12 w-full rounded-full px-4 py-3 text-[0.95rem] font-semibold',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button'

  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

function ButtonSpinner({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      aria-hidden="true"
      className={cn('size-4 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent', className)}
      {...props}
    />
  )
}

export { Button, ButtonSpinner, buttonVariants }
export type { ButtonProps }
