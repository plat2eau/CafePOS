'use client'

import { useActionState, useState } from 'react'
import type { ServiceRequestActionState } from '@/app/table/[tableId]/actions'
import FormActionButton from '@/components/FormActionButton'
import { Button } from '@/components/ui/button'
import { FlashMessage } from '@/components/ui/flash-message'
import { SectionCard } from '@/components/ui/section-card'
import { Textarea } from '@/components/ui/textarea'

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
    <SectionCard tone="support">
      <p className="eyebrow">Need help?</p>
      <h2>Call the server</h2>
      <p>Use this if you are ready to pay or need anything else from the cafe team.</p>

      {previewMode ? (
        <p className="finePrint">Admin preview: service requests are disabled in guest view preview mode.</p>
      ) : null}

      {!isOpen && !previewMode ? (
        <div className="buttonRow">
          <Button className="min-h-12 w-full rounded-full px-4 py-3 md:w-auto" type="button" onClick={() => setIsOpen(true)}>
            Call server
          </Button>
        </div>
      ) : !previewMode ? (
        <form action={formAction} className="sessionForm">
          <div className="requestTypeRow">
            <Button
              className="min-h-12 flex-1 rounded-full px-4 py-3"
              variant={requestType === 'payment' ? 'default' : 'secondary'}
              type="button"
              onClick={() => setRequestType('payment')}
            >
              Payment
            </Button>
            <Button
              className="min-h-12 flex-1 rounded-full px-4 py-3"
              variant={requestType === 'assistance' ? 'default' : 'secondary'}
              type="button"
              onClick={() => setRequestType('assistance')}
            >
              Need help
            </Button>
          </div>

          <input type="hidden" name="requestType" value={requestType} />

          <div className="formField">
            <label htmlFor="service-request-note">Note for the staff</label>
            <Textarea
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
            <Button variant="secondary" size="form" type="button" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
          </div>

          {state.status !== 'idle' ? (
            <FlashMessage tone={state.status === 'success' ? 'success' : 'error'}>
              {state.message}
            </FlashMessage>
          ) : null}
        </form>
      ) : null}
    </SectionCard>
  )
}
