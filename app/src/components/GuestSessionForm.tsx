'use client'

import { useActionState } from 'react'
import type { GuestSessionActionState } from '@/app/table/[tableId]/actions'
import FormActionButton from '@/components/FormActionButton'
import { FlashMessage } from '@/components/ui/flash-message'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
  const helperText = requirePin
    ? 'Enter your own details, then use the active session PIN to join this table from this device.'
    : 'These details are only used for your current table order.'

  return (
    <form action={formAction} className="mt-4 flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="guest-name">Guest name</Label>
        <Input
          id="guest-name"
          name="name"
          type="text"
          placeholder="Your name"
          defaultValue={initialName}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="guest-phone">Phone number</Label>
        <Input
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
        <div className="flex flex-col gap-2">
          <Label htmlFor="session-pin">Session PIN</Label>
          <Input
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

      <div className="formActions">
        <FormActionButton label="Continue to menu" loadingLabel="Opening your table..." />
        <p className="formSupportText">{helperText}</p>
      </div>

      {state.status !== 'idle' ? (
        <FlashMessage tone={state.status === 'success' ? 'success' : 'error'}>
          {state.message}
        </FlashMessage>
      ) : null}
    </form>
  )
}
