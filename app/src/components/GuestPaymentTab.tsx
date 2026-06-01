'use client'

import { EmptyStateCard } from '@/components/AppCards'
import { Button } from '@/components/ui/button'
import {
  buildReceiptQrValue,
  cafeReceiptHeader,
  formatReceiptTimestamp,
  toReceiptPrice,
  type ReceiptPayload
} from '@/lib/receipt-print'

type GuestPaymentTabProps = {
  accessibleSessionId: string | null
  adminPreview?: boolean
  receiptPayload: ReceiptPayload | null
}

export default function GuestPaymentTab({
  accessibleSessionId,
  adminPreview = false,
  receiptPayload
}: GuestPaymentTabProps) {
  const openUpi = () => {
    if (!receiptPayload) {
      return
    }

    const upiUrl = buildReceiptQrValue(receiptPayload)
    const paymentWindow = window.open(upiUrl, '_blank', 'noopener,noreferrer')

    if (!paymentWindow) {
      window.location.href = upiUrl
    }
  }

  return (
    <div className="sectionStack guestPaymentTabContent">
      <div className="guestOrderHistoryHeader">
        <h2>Payment</h2>
        {accessibleSessionId && adminPreview ? (
          <div className="metaPillRow">
            <span className="metaPill">Admin preview mode
            </span>
          </div>
        ) : null}
      </div>

      {!accessibleSessionId ? (
        <EmptyStateCard
          eyebrow="Session required"
          title="No linked table session"
          description="Start a table session before trying to view the payment receipt."
          tone="support"
          density="default"
        />
      ) : !receiptPayload || receiptPayload.orders.length === 0 ? (
        <EmptyStateCard
          eyebrow="Nothing to pay yet"
          title="Your receipt is empty"
          description="Place an order from the menu tab and the payment receipt will appear here."
          density="default"
        />
      ) : (
        <>
          <div className="guestPaymentActions">
            <Button type="button" className="guestUpiButton" onClick={openUpi}>
              Pay by UPI
            </Button>
          </div>

          <article className="receiptPaperCard guestReceiptPaperCard">
            <header className="receiptHeader">
              <h1>{cafeReceiptHeader.name}</h1>
              <p>{cafeReceiptHeader.address}</p>
              <p>{cafeReceiptHeader.phone}</p>
            </header>

            <div className="receiptRule" />

            <div className="receiptMetaBlock">
              <div className="summaryRow">
                <strong>Guest</strong>
                <span>{receiptPayload.guestName}</span>
              </div>
              <div className="summaryRow receiptDateRow">
                <strong>Date:</strong>
                <span>{formatReceiptTimestamp(receiptPayload.generatedAt)}</span>
              </div>
            </div>

            <div className="receiptRule" />

            {receiptPayload.orders.map((order) => (
              <section className="receiptOrderBlock" key={order.id}>
                <div className="summaryRow receiptOrderHeader">
                  <strong>Order {order.id.slice(0, 8)}</strong>
                  <span>{formatReceiptTimestamp(order.createdAt)}</span>
                </div>
                <table className="receiptItemsTable">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Qty</th>
                      <th>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item, index) => (
                      <tr key={`${order.id}-${item.name}-${index}`}>
                        <td>{item.name}</td>
                        <td>{item.quantity}</td>
                        <td>{toReceiptPrice(item.lineTotalCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {order.note ? <p className="guestReceiptNote">Note: {order.note}</p> : null}
                <div className="summaryRow receiptOrderTotal">
                  <span>Order total</span>
                  <strong>{toReceiptPrice(order.totalCents)}</strong>
                </div>
                <div className="receiptRule" />
              </section>
            ))}

            <div className="summaryRow receiptDiscountRow">
              <span>Subtotal</span>
              <strong>{toReceiptPrice(receiptPayload.subtotalCents)}</strong>
            </div>
            {receiptPayload.discountPercentage && receiptPayload.discountAmountCents ? (
              <>
                <div className="receiptRule" />
                <div className="summaryRow receiptDiscountRow">
                  <span>Discount ({receiptPayload.discountPercentage}%)</span>
                  <strong>-{toReceiptPrice(receiptPayload.discountAmountCents)}</strong>
                </div>
              </>
            ) : null}

            <div className="receiptRule" />

            <div className="summaryRow receiptGrandTotal">
              <strong>Total</strong>
              <strong>{toReceiptPrice(receiptPayload.grandTotalCents)}</strong>
            </div>
          </article>
        </>
      )}
    </div>
  )
}
