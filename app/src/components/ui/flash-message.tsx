import * as React from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

type FlashMessageProps = React.ComponentProps<typeof Alert> & {
  tone?: 'success' | 'error'
}

function FlashMessage({
  className,
  tone = 'success',
  children,
  ...props
}: FlashMessageProps) {
  return (
    <Alert
      variant={tone === 'success' ? 'success' : 'destructive'}
      className={cn('font-semibold', className)}
      {...props}
    >
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  )
}

export { FlashMessage }
export type { FlashMessageProps }
