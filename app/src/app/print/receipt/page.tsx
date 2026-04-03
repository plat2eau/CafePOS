import { notFound } from 'next/navigation'
import ReceiptPrintActions from '@/components/ReceiptPrintActions'
import {
  cafeReceiptHeader,
  formatReceiptTimestamp,
  toReceiptPrice
} from '@/lib/receipt-print'
import { verifyReceiptToken } from '@/lib/receipt-print-server'

type ReceiptPageProps = {
  searchParams: Promise<{
    token?: string
  }>
}

export default async function ReceiptPage({ searchParams }: ReceiptPageProps) {
  const { token } = await searchParams

  if (!token) {
    notFound()
  }

  const payload = verifyReceiptToken(token)

  if (!payload) {
    notFound()
  }

  return (
    <main>
      <section className="hero heroShell">
        <div className="heroHeader compact">
          <p className="eyebrow">Receipt</p>
          <h1>{cafeReceiptHeader.name}</h1>
          <p className="lead">
            {cafeReceiptHeader.address}
            <br />
            {cafeReceiptHeader.phone}
          </p>
        </div>

        <ReceiptPrintActions token={token} />

        <article className="card sessionGateCard">
          <div className="summaryRow">
            <strong>Guest</strong>
            <span>{payload.guestName}</span>
          </div>
          <div className="summaryRow total">
            <strong>Printed</strong>
            <span>{formatReceiptTimestamp(payload.generatedAt)}</span>
          </div>

          <div className="stack">
            {payload.orders.map((order) => (
              <div className="adminOrderCard" key={order.id}>
                <div className="summaryRow">
                  <strong>Order {order.id.slice(0, 8)}</strong>
                  <span>{formatReceiptTimestamp(order.createdAt)}</span>
                </div>
                <div className="stack">
                  {order.items.map((item, index) => (
                    <div className="summaryRow" key={`${order.id}-${index}`}>
                      <span>
                        {item.name} x {item.quantity}
                      </span>
                      <strong>{toReceiptPrice(item.lineTotalCents)}</strong>
                    </div>
                  ))}
                </div>
                {order.note ? <p>Note: {order.note}</p> : null}
                <div className="summaryRow total">
                  <span>Order total</span>
                  <strong>{toReceiptPrice(order.totalCents)}</strong>
                </div>
              </div>
            ))}
          </div>

          <div className="summaryRow total">
            <strong>Grand total</strong>
            <strong>{toReceiptPrice(payload.grandTotalCents)}</strong>
          </div>
        </article>
      </section>
    </main>
  )
}
