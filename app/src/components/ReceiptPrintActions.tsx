'use client'

import { useState } from 'react'

type ReceiptPrintActionsProps = {
  responsePath: string
}

export default function ReceiptPrintActions({ responsePath }: ReceiptPrintActionsProps) {
  const [launchMessage, setLaunchMessage] = useState<string | null>(null)

  function handleBluetoothPrintLaunch() {
    setLaunchMessage('If nothing opens, try this page in Android Chrome instead of the installed app.')
    const responseUrl = new URL(responsePath, window.location.origin)
    window.location.href = `my.bluetoothprint.scheme://${responseUrl.toString()}`
  }

  return (
    <div className="sectionStack compact">
      <div className="buttonRow">
        <button className="button" type="button" onClick={handleBluetoothPrintLaunch}>
          Print with Bluetooth Print app
        </button>
        <a className="button buttonSecondary" href={responsePath} target="_blank" rel="noreferrer">
          Open debug JSON
        </a>
      </div>
      <button className="button buttonSecondary" type="button" onClick={() => window.print()}>
        Browser print
      </button>
      {launchMessage ? <p className="finePrint">{launchMessage}</p> : null}
      <p className="finePrint">
        Android only. If the Bluetooth Print app does not open, try this receipt page in Chrome,
        not the installed PWA.
      </p>
    </div>
  )
}
