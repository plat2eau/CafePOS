import Image from 'next/image'
import QRCode from 'qrcode'
import { notFound } from 'next/navigation'
import ReceiptPrintActions from '@/components/ReceiptPrintActions'
import {
  buildReceiptQrValue,
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

  const responsePath = `/api/print/receipt?token=${encodeURIComponent(token)}`
  const qrCodeDataUrl = await QRCode.toDataURL(buildReceiptQrValue(payload), {
    margin: 1,
    width: 240
  })

  return (
    <main>
      <section className="hero heroShell receiptPageShell">
        <div className="receiptActionBar">
          <ReceiptPrintActions responsePath={responsePath} />
        </div>

        <article className="receiptPaperCard">
          <header className="receiptHeader">
            <h1>{cafeReceiptHeader.name}</h1>
            <p>{cafeReceiptHeader.address}</p>
            <p>{cafeReceiptHeader.phone}</p>
          </header>

          <div className="receiptRule" />

          <div className="receiptMetaBlock">
            <div className="summaryRow">
              <strong>Guest</strong>
              <span>{payload.guestName}</span>
            </div>
            <div className="summaryRow receiptDateRow">
              <strong>Date:</strong>
              <span>{formatReceiptTimestamp(payload.generatedAt)}</span>
            </div>
          </div>

          <div className="receiptRule" />

          <div className="stack">
            {payload.orders.map((order) => (
              <section className="receiptOrderBlock" key={order.id}>
                <div className="summaryRow receiptOrderHeader">
                  <strong>Order {order.id.slice(0, 8)}</strong>
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
                      <tr key={`${order.id}-${index}`}>
                        <td>{item.name}</td>
                        <td>{item.quantity}</td>
                        <td>{toReceiptPrice(item.lineTotalCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {order.note ? <p className="receiptNote">Note: {order.note}</p> : null}
                <div className="summaryRow receiptOrderTotal">
                  <span>Order total</span>
                  <strong>{toReceiptPrice(order.totalCents)}</strong>
                </div>
                <div className="receiptRule" />
              </section>
            ))}
          </div>

          <div className="receiptRule" />

          {payload.discountPercentage && payload.discountAmountCents ? (
            <>
              <div className="summaryRow receiptDiscountRow">
                <span>Discount ({payload.discountPercentage}%)</span>
                <strong>-{toReceiptPrice(payload.discountAmountCents)}</strong>
              </div>
              <div className="receiptRule" />
            </>
          ) : null}

          <div className="summaryRow receiptGrandTotal">
            <strong>Grand total</strong>
            <strong>{toReceiptPrice(payload.grandTotalCents)}</strong>
          </div>

          <div className="receiptRule" />

          <div className="receiptQrBlock">
            <p>Scan this QR code to pay.</p>
            <Image
              src={qrCodeDataUrl}
              alt="Receipt QR code"
              className="receiptQrImage"
              width={240}
              height={240}
              unoptimized
            />
          </div>
        </article>
      </section>
    </main>
  )
}
