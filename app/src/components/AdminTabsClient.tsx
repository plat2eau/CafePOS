'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { apiFetch } from '@/lib/api-client'
import type { AdminTabDetailData, AdminTabsData } from '@/lib/admin-data'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { FlashMessage } from '@/components/ui/flash-message'
import { Input } from '@/components/ui/input'
import { LoadingButton } from '@/components/ui/loading-button'
import { SectionCard } from '@/components/ui/section-card'
import { SummaryRow } from '@/components/ui/summary-row'

type FlashState = {
  tone: 'success' | 'error'
  message: string
}

type AdminTabsClientProps = {
  initialData?: AdminTabsData
  initialDetail?: AdminTabDetailData
}

function toPrice(priceCents: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(priceCents / 100)
}

function centsToInput(priceCents: number) {
  return (priceCents / 100).toFixed(2)
}

function parsePriceToCents(value: string) {
  const normalized = value.trim().replace(/,/g, '')
  if (!normalized) return null

  const parsed = Number.parseFloat(normalized)
  if (!Number.isFinite(parsed) || parsed <= 0) return null

  return Math.round(parsed * 100)
}

function formatDateTime(value: string | null) {
  if (!value) return 'No payment yet'

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value))
}

export default function AdminTabsClient({ initialData, initialDetail }: AdminTabsClientProps) {
  const [data, setData] = useState(initialData)
  const [detail, setDetail] = useState(initialDetail)
  const [flash, setFlash] = useState<FlashState | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isPaying, setIsPaying] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [paymentAmount, setPaymentAmount] = useState(() =>
    initialDetail ? centsToInput(initialDetail.tab.due_cents) : ''
  )

  const totalDue = useMemo(
    () => data?.tabs.reduce((sum, tab) => sum + tab.due_cents, 0) ?? 0,
    [data]
  )

  async function refreshTabs() {
    const result = await apiFetch<AdminTabsData>(
      '/api/admin/tabs',
      {
        method: 'GET',
        cache: 'no-store'
      },
      'Could not refresh tabs.'
    )

    if (result.ok) {
      setData(result.data)
    }
  }

  async function refreshDetail(tabId: string) {
    const result = await apiFetch<AdminTabDetailData>(
      `/api/admin/tabs/${tabId}`,
      {
        method: 'GET',
        cache: 'no-store'
      },
      'Could not refresh tab.'
    )

    if (result.ok) {
      setDetail(result.data)
      setPaymentAmount(centsToInput(result.data.tab.due_cents))
    }
  }

  async function handleCreateTab() {
    const trimmedName = name.trim()
    const trimmedPhone = phone.trim()

    if (!trimmedName) {
      setFlash({ tone: 'error', message: 'Enter a tab account name.' })
      return
    }

    if (!trimmedPhone) {
      setFlash({ tone: 'error', message: 'Enter a phone number.' })
      return
    }

    setIsCreating(true)
    setFlash(null)

    const result = await apiFetch<{ message?: string }>(
      '/api/admin/tabs',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          phone: trimmedPhone
        })
      },
      'Could not create tab account.'
    )

    setIsCreating(false)

    if (!result.ok) {
      setFlash({ tone: 'error', message: result.message })
      return
    }

    setName('')
    setPhone('')
    setIsCreateOpen(false)
    setFlash({ tone: 'success', message: result.data?.message ?? 'Tab account created.' })
    await refreshTabs()
  }

  async function handleRecordPayment() {
    if (!detail) return

    const amountCents = parsePriceToCents(paymentAmount)

    if (amountCents === null) {
      setFlash({ tone: 'error', message: 'Enter a valid payment amount.' })
      return
    }

    setIsPaying(true)
    setFlash(null)

    const result = await apiFetch<{ message?: string }>(
      `/api/admin/tabs/${detail.tab.id}/payments`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountCents })
      },
      'Could not record tab payment.'
    )

    setIsPaying(false)

    if (!result.ok) {
      setFlash({ tone: 'error', message: result.message })
      return
    }

    setIsPaymentOpen(false)
    setFlash({ tone: 'success', message: result.data?.message ?? 'Tab payment recorded.' })
    await refreshDetail(detail.tab.id)
  }

  if (detail) {
    return (
      <div className="sectionStack">
        <div className="heroHeader compact">
          <Link className="backLink" href="/admin/tabs">
            Back to tabs
          </Link>
          <div className="adminConsoleHeader">
            <div>
              <p className="eyebrow">Tab Account</p>
              <h1>{detail.tab.name}</h1>
              <p className="lead">{detail.tab.phone}</p>
            </div>
            <Button
              type="button"
              disabled={detail.tab.due_cents <= 0}
              onClick={() => {
                setPaymentAmount(centsToInput(detail.tab.due_cents))
                setIsPaymentOpen(true)
              }}
            >
              Clear tab
            </Button>
          </div>
        </div>

        {flash ? <FlashMessage tone={flash.tone}>{flash.message}</FlashMessage> : null}

        <div className="compactGrid">
          <SectionCard>
            <p className="eyebrow">Remaining</p>
            <h2>{toPrice(detail.tab.due_cents)}</h2>
          </SectionCard>
          <SectionCard>
            <p className="eyebrow">Total orders</p>
            <h2>{detail.tab.total_orders}</h2>
          </SectionCard>
          <SectionCard>
            <p className="eyebrow">Last payment</p>
            <h2>{detail.tab.last_payment_cents === null ? 'None' : toPrice(detail.tab.last_payment_cents)}</h2>
            <p className="finePrint">{formatDateTime(detail.tab.last_payment_at)}</p>
          </SectionCard>
        </div>

        <div className="grid">
          <SectionCard>
            <div className="mb-4">
              <p className="eyebrow">Charges</p>
              <h2>Orders transferred to tab</h2>
            </div>
            <div className="sectionStack compact">
              {detail.charges.length === 0 ? (
                <p className="finePrint">No charges have been transferred yet.</p>
              ) : (
                detail.charges.map((charge) => (
                  <SummaryRow key={charge.id}>
                    <span>
                      {charge.source_type === 'table_session' ? 'Table session' : 'Out check'} · {charge.order_count} order{charge.order_count === 1 ? '' : 's'}
                      <br />
                      <span className="finePrint">{formatDateTime(charge.created_at)}</span>
                    </span>
                    <strong>{toPrice(charge.amount_cents)}</strong>
                  </SummaryRow>
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard>
            <div className="mb-4">
              <p className="eyebrow">Payments</p>
              <h2>Tab payment history</h2>
            </div>
            <div className="sectionStack compact">
              {detail.payments.length === 0 ? (
                <p className="finePrint">No payments recorded yet.</p>
              ) : (
                detail.payments.map((payment) => (
                  <SummaryRow key={payment.id}>
                    <span>{formatDateTime(payment.created_at)}</span>
                    <strong>{toPrice(payment.amount_cents)}</strong>
                  </SummaryRow>
                ))
              )}
            </div>
          </SectionCard>
        </div>

        <Dialog open={isPaymentOpen} onOpenChange={(open) => !isPaying && setIsPaymentOpen(open)}>
          <DialogContent>
            <DialogHeader>
              <p className="eyebrow">Clear tab</p>
              <DialogTitle>Record tab payment</DialogTitle>
              <DialogDescription>
                Enter the amount received from this customer.
              </DialogDescription>
            </DialogHeader>
            <div className="dialogSummary">
              <SummaryRow>
                <span>Remaining due</span>
                <strong>{toPrice(detail.tab.due_cents)}</strong>
              </SummaryRow>
            </div>
            <div className="formField">
              <label htmlFor="tab-payment-amount">Payment amount</label>
              <Input
                id="tab-payment-amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={paymentAmount}
                onChange={(event) => setPaymentAmount(event.target.value)}
              />
            </div>
            <DialogFooter>
              <DialogClose asChild disabled={isPaying}>
                <Button variant="secondary" size="form" type="button">
                  Cancel
                </Button>
              </DialogClose>
              <LoadingButton
                size="form"
                type="button"
                loading={isPaying}
                loadingLabel="Recording..."
                onClick={() => void handleRecordPayment()}
              >
                Record payment
              </LoadingButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div className="sectionStack">
      <div className="adminConsoleHeader">
        <div className="heroHeader compact">
          <p className="eyebrow">Tabs</p>
          <h1>Customer tabs</h1>
          <p className="lead">Track customer dues transferred from table sessions and out-checks.</p>
        </div>
        <Button type="button" onClick={() => setIsCreateOpen(true)}>
          New tab
        </Button>
      </div>

      {flash ? <FlashMessage tone={flash.tone}>{flash.message}</FlashMessage> : null}

      <div className="compactGrid">
        <SectionCard>
          <p className="eyebrow">Open tabs</p>
          <h2>{data?.tabs.length ?? 0}</h2>
        </SectionCard>
        <SectionCard>
          <p className="eyebrow">Total due</p>
          <h2>{toPrice(totalDue)}</h2>
        </SectionCard>
      </div>

      <SectionCard>
        <div className="purchaseLedgerGrid">
          {data?.tabs.length === 0 ? (
            <p className="finePrint">No tab accounts yet.</p>
          ) : (
            data?.tabs.map((tab) => (
              <Link className="tabAccountCard" key={tab.id} href={`/admin/tabs/${tab.id}`}>
                <div>
                  <p className="eyebrow">Tab account</p>
                  <h2>{tab.name}</h2>
                  <p className="finePrint">{tab.phone}</p>
                </div>
                <div className="dialogSummary">
                  <SummaryRow variant="total">
                    <span>Due</span>
                    <strong>{toPrice(tab.due_cents)}</strong>
                  </SummaryRow>
                  <SummaryRow>
                    <span>Orders</span>
                    <strong>{tab.total_orders}</strong>
                  </SummaryRow>
                  <SummaryRow>
                    <span>Last payment</span>
                    <strong>{tab.last_payment_cents === null ? 'None' : toPrice(tab.last_payment_cents)}</strong>
                  </SummaryRow>
                </div>
              </Link>
            ))
          )}
        </div>
      </SectionCard>

      <Dialog open={isCreateOpen} onOpenChange={(open) => !isCreating && setIsCreateOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <p className="eyebrow">New tab</p>
            <DialogTitle>Create tab account</DialogTitle>
            <DialogDescription>
              Add the customer name and phone number used to find this tab later.
            </DialogDescription>
          </DialogHeader>
          <div className="sectionStack compact">
            <div className="formField">
              <label htmlFor="tab-name">Name</label>
              <Input
                id="tab-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="formField">
              <label htmlFor="tab-phone">Phone number</label>
              <Input
                id="tab-phone"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild disabled={isCreating}>
              <Button variant="secondary" size="form" type="button">
                Cancel
              </Button>
            </DialogClose>
            <LoadingButton
              size="form"
              type="button"
              loading={isCreating}
              loadingLabel="Creating..."
              onClick={() => void handleCreateTab()}
            >
              Create tab
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
