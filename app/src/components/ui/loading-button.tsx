import * as React from 'react'
import { Button, ButtonSpinner, type ButtonProps } from '@/components/ui/button'

type LoadingButtonProps = ButtonProps & {
  loading?: boolean
  loadingLabel?: string
}

function LoadingButton({
  loading = false,
  loadingLabel,
  children,
  disabled,
  ...props
}: LoadingButtonProps) {
  return (
    <Button
      disabled={disabled || loading}
      aria-busy={loading}
      data-loading={loading ? 'true' : undefined}
      {...props}
    >
      {loading ? (
        <>
          <ButtonSpinner />
          {loadingLabel ?? children}
        </>
      ) : (
        children
      )}
    </Button>
  )
}

export { LoadingButton }
export type { LoadingButtonProps }
