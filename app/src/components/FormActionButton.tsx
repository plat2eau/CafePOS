'use client'

import { useFormStatus } from 'react-dom'
import { Button, ButtonSpinner, type ButtonProps } from '@/components/ui/button'

type FormActionButtonProps = {
  label: string
  loadingLabel: string
  className?: string
  disabled?: boolean
  form?: string
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
} & Pick<ButtonProps, 'formAction' | 'name' | 'value'>

export default function FormActionButton({
  label,
  loadingLabel,
  className,
  disabled = false,
  form,
  variant = 'default',
  size = 'form',
  formAction,
  name,
  value
}: FormActionButtonProps) {
  const { pending } = useFormStatus()

  return (
    <Button
      className={className}
      type="submit"
      variant={variant}
      size={size}
      disabled={disabled || pending}
      aria-busy={pending}
      data-loading={pending ? 'true' : undefined}
      form={form}
      formAction={formAction}
      name={name}
      value={value}
    >
      {pending ? (
        <>
          <ButtonSpinner />
          {loadingLabel}
        </>
      ) : (
        label
      )}
    </Button>
  )
}
