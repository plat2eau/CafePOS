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
}

const guestSessionInitialState: GuestSessionActionState = {
  status: 'idle'
}

export default function GuestSessionForm({
  action,
  initialName = '',
  initialPhone = ''
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

      <div className="formFooter">
        <FormActionButton label="Continue to menu" loadingLabel="Opening your table..." />
        <p className="finePrint">These details are only used for your current table order.</p>
      </div>

      {state.status !== 'idle' ? (
        <p className={state.status === 'success' ? 'statusMessage success' : 'statusMessage error'}>
          {state.message}
        </p>
      ) : null}
    </form>
  )
}
