import * as React from 'react'
import { cn } from '@/lib/utils'

type TextareaProps = React.ComponentProps<'textarea'>

function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex min-h-24 w-full rounded-[14px] border border-input bg-[var(--card-bg-strong)] px-[14px] py-3 text-base text-foreground shadow-none outline-none transition-[color,box-shadow,border-color] placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring md:text-sm',
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
export type { TextareaProps }
