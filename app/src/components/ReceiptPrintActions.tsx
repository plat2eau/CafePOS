'use client'

import { useState } from 'react'
import { ActionGroup } from '@/components/ui/action-group'
import { Button } from '@/components/ui/button'

type ReceiptPrintActionsProps = {
  responsePath: string
}

export default function ReceiptPrintActions({ responsePath }: ReceiptPrintActionsProps) {
  const [launchMessage, setLaunchMessage] = useState<string | null>(null)

  async function loadBluetoothPrintJson(responseUrl: URL) {
    try {
      const response = await fetch(responseUrl.toString())
      const bluetoothPrintJson = await response.json()
      console.log('Bluetooth print JSON', bluetoothPrintJson)
    } catch (error) {
      console.error('Could not load Bluetooth print JSON before launch.', error)
    }
  }

  async function handleAndroidBluetoothPrintLaunch() {
    setLaunchMessage('If nothing opens, try this page in Android Chrome instead of the installed app.')
    const responseUrl = new URL(responsePath, window.location.origin)
    await loadBluetoothPrintJson(responseUrl)
    window.location.href = `my.bluetoothprint.scheme://${responseUrl.toString()}`
  }

  async function handleIosBluetoothPrintLaunch() {
    setLaunchMessage('If nothing opens, enable Browser Print in the iOS Bluetooth Print app settings first.')
    const responseUrl = new URL(responsePath, window.location.origin)
    await loadBluetoothPrintJson(responseUrl)
    window.location.href = `bprint://${responseUrl.toString()}`
  }

  return (
    <div className="sectionStack compact">
      <ActionGroup>
        <Button size="form" className="md:w-auto" type="button" onClick={handleAndroidBluetoothPrintLaunch}>
          Print on Android app
        </Button>
        <Button size="form" className="md:w-auto" type="button" onClick={handleIosBluetoothPrintLaunch}>
          Print on iOS app
        </Button>
        <Button asChild variant="secondary" size="form" className="md:w-auto">
          <a href={responsePath} target="_blank" rel="noreferrer">
            Open debug JSON
          </a>
        </Button>
      </ActionGroup>
      <Button variant="secondary" size="form" className="md:w-auto" type="button" onClick={() => window.print()}>
        Browser print
      </Button>
      {launchMessage ? <p className="finePrint">{launchMessage}</p> : null}
      <p className="finePrint">
        Android: open this page in Chrome if the app does not launch. iOS: install Bluetooth Print, then enable Browser
        Print before tapping the iOS button.
      </p>
    </div>
  )
}
