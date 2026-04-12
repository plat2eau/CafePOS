import * as React from 'react'
import { cn } from '@/lib/utils'

type QuantityStepperProps = {
  value: number
  onIncrement: () => void
  onDecrement: () => void
  incrementLabel: string
  decrementLabel: string
  disabled?: boolean
  className?: string
}

function QuantityStepper({
  value,
  onIncrement,
  onDecrement,
  incrementLabel,
  decrementLabel,
  disabled = false,
  className
}: QuantityStepperProps) {
  return (
    <div className={cn('quantityControls', className)}>
      <button
        className="quantityButton"
        type="button"
        disabled={disabled}
        aria-label={decrementLabel}
        onClick={onDecrement}
      >
        −
      </button>
      <span className="quantityValue" aria-live="polite" aria-atomic="true">
        {value}
      </span>
      <button
        className="quantityButton"
        type="button"
        disabled={disabled}
        aria-label={incrementLabel}
        onClick={onIncrement}
      >
        +
      </button>
    </div>
  )
}

export { QuantityStepper }
export type { QuantityStepperProps }
