'use client'

import { useFormStatus } from 'react-dom'

type FormActionButtonProps = {
  label: string
  loadingLabel: string
  className?: string
  disabled?: boolean
}

export default function FormActionButton({
  label,
  loadingLabel,
  className = 'button',
  disabled = false
}: FormActionButtonProps) {
  const { pending } = useFormStatus()

  return (
    <button
      className={`${className}${pending ? ' buttonLoading' : ''}`}
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending}
    >
      {pending ? (
        <>
          <span className="buttonSpinner" aria-hidden="true" />
          {loadingLabel}
        </>
      ) : (
        label
      )}
    </button>
  )
}
