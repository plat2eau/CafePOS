'use client'

import { useActionState, useState } from 'react'
import type { ServiceRequestActionState } from '@/app/table/[tableId]/actions'
import FormActionButton from '@/components/FormActionButton'

type GuestServiceRequestPanelProps = {
  action: (
    state: ServiceRequestActionState,
    formData: FormData
  ) => Promise<ServiceRequestActionState>
  previewMode?: boolean
}

const initialState: ServiceRequestActionState = {
  status: 'idle'
}

export default function GuestServiceRequestPanel({
  action,
  previewMode = false
}: GuestServiceRequestPanelProps) {
  const [state, formAction] = useActionState(action, initialState)
  const [isOpen, setIsOpen] = useState(false)
  const [requestType, setRequestType] = useState<'payment' | 'assistance'>('payment')

  return (
    <article className="card supportCard">
      <p className="eyebrow">Need help?</p>
      <h2>Call the server</h2>
      <p>Use this if you are ready to pay or need anything else from the cafe team.</p>

      {previewMode ? (
        <p className="finePrint">Admin preview: service requests are disabled in guest view preview mode.</p>
      ) : null}

      {!isOpen && !previewMode ? (
        <div className="buttonRow">
          <button className="button" type="button" onClick={() => setIsOpen(true)}>
            Call server
          </button>
        </div>
      ) : !previewMode ? (
        <form action={formAction} className="sessionForm">
          <div className="requestTypeRow">
            <button
              className={`button${requestType === 'payment' ? '' : ' buttonSecondary'}`}
              type="button"
              onClick={() => setRequestType('payment')}
            >
              Payment
            </button>
            <button
              className={`button${requestType === 'assistance' ? '' : ' buttonSecondary'}`}
              type="button"
              onClick={() => setRequestType('assistance')}
            >
              Need help
            </button>
          </div>

          <input type="hidden" name="requestType" value={requestType} />

          <div className="formField">
            <label htmlFor="service-request-note">Note for the staff</label>
            <textarea
              id="service-request-note"
              name="note"
              rows={3}
              placeholder={
                requestType === 'payment'
                  ? 'Card machine please, split bill, pay at counter...'
                  : 'Need water, need extra cutlery, table help...'
              }
            />
          </div>

          <div className="formFooter">
            <FormActionButton
              label={requestType === 'payment' ? 'Request payment' : 'Request assistance'}
              loadingLabel="Calling the staff..."
            />
            <button className="button buttonSecondary" type="button" onClick={() => setIsOpen(false)}>
              Cancel
            </button>
          </div>

          {state.status !== 'idle' ? (
            <p className={state.status === 'success' ? 'statusMessage success' : 'statusMessage error'}>
              {state.message}
            </p>
          ) : null}
        </form>
      ) : null}
    </article>
  )
}
