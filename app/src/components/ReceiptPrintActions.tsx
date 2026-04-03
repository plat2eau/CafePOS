'use client'

import { useMemo } from 'react'

type ReceiptPrintActionsProps = {
  token: string
}

export default function ReceiptPrintActions({ token }: ReceiptPrintActionsProps) {
  const bluetoothPrintHref = useMemo(() => {
    if (typeof window === 'undefined') {
      return '#'
    }

    const responseUrl = new URL('/api/print/receipt', window.location.origin)
    responseUrl.searchParams.set('token', token)
    return `my.bluetoothprint.scheme://${responseUrl.toString()}`
  }, [token])

  return (
    <div className="buttonRow">
      <a className="button" href={bluetoothPrintHref}>
        Print with Bluetooth Print app
      </a>
      <button className="button buttonSecondary" type="button" onClick={() => window.print()}>
        Browser print
      </button>
    </div>
  )
}
