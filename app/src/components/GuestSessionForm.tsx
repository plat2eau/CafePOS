'use client'

import { useActionState } from 'react'
import type { GuestSessionActionState } from '@/app/table/[tableId]/actions'
import FormActionButton from '@/components/FormActionButton'

type GuestSessionFormProps = {
  action: (
    state: GuestSessionActionState,
    formData: FormData
  ) => Promise<GuestSessionActionState>
  initialName?: string
  initialPhone?: string
  requirePin?: boolean
}

const guestSessionInitialState: GuestSessionActionState = {
  status: 'idle'
}

export default function GuestSessionForm({
  action,
  initialName = '',
  initialPhone = '',
  requirePin = false
}: GuestSessionFormProps) {
  const [state, formAction] = useActionState(action, guestSessionInitialState)

  return (
    <form action={formAction} className="sessionForm">
      <div className="formField">
        <label htmlFor="guest-name">Guest name</label>
        <input
          id="guest-name"
          name="name"
          type="text"
          placeholder="Your name"
          defaultValue={initialName}
          required
        />
      </div>

      <div className="formField">
        <label htmlFor="guest-phone">Phone number</label>
        <input
          id="guest-phone"
          name="phone"
          type="tel"
          inputMode="numeric"
          placeholder="10-digit phone number"
          defaultValue={initialPhone}
          required
        />
      </div>

      {requirePin ? (
        <div className="formField">
          <label htmlFor="session-pin">Session PIN</label>
          <input
            id="session-pin"
            name="pin"
            type="password"
            inputMode="numeric"
            pattern="[0-9]{4}"
            minLength={4}
            maxLength={4}
            placeholder="4-digit PIN"
            required
          />
        </div>
      ) : null}

      <div className="formFooter">
        <FormActionButton label="Continue to menu" loadingLabel="Opening your table..." />
        <p className="finePrint">
          {requirePin
            ? 'Enter your own details, then use the active session PIN to join this table from this device.'
            : 'These details are only used for your current table order.'}
        </p>
      </div>

      {state.status !== 'idle' ? (
        <p className={state.status === 'success' ? 'statusMessage success' : 'statusMessage error'}>
          {state.message}
        </p>
      ) : null}
    </form>
  )
}
