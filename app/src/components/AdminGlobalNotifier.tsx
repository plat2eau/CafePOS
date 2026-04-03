'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { AdminOrder, AdminOverviewData, AdminServiceRequest } from '@/lib/admin-data'

type AdminGlobalNotifierProps = {
  intervalMs?: number
}

const defaultNotificationSoundSrc = '/soundreality-telephone-ring-129620.mp3'
const notificationSoundSrc =
  process.env.NEXT_PUBLIC_ADMIN_ALERT_SOUND_PATH?.trim() || defaultNotificationSoundSrc
const seenNoticeStorageKey = 'cafepos-admin-seen-notices'
const soundPromptDismissedStorageKey = 'cafepos-admin-sound-prompt-dismissed'
const soundReadyStorageKey = 'cafepos-admin-sound-ready'

type Notice = {
  id: string
  kind: 'order' | 'service'
  tableId: string
  title: string
  message: string
}

function toPrice(priceCents: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(priceCents / 100)
}

function buildOrderNotice(order: AdminOrder): Notice {
  return {
    id: `order:${order.id}`,
    kind: 'order',
    tableId: order.table_id,
    title: `${order.guest_name ?? 'Guest'} placed an order`,
    message: `Table ${order.table_id} just placed a new order for ${toPrice(order.total_cents)}.`
  }
}

function buildServiceNotice(request: AdminServiceRequest): Notice {
  return {
    id: `service:${request.id}`,
    kind: 'service',
    tableId: request.table_id,
    title: `${request.guest_name ?? 'Guest'} needs the staff`,
    message: `Table ${request.table_id} requested ${
      request.request_type === 'payment' ? 'payment' : 'assistance'
    }.`
  }
}

export default function AdminGlobalNotifier({
  intervalMs = 5000
}: AdminGlobalNotifierProps) {
  const router = useRouter()
  const [notices, setNotices] = useState<Notice[]>([])
  const [isSoundReady, setIsSoundReady] = useState(false)
  const [isTestingSound, setIsTestingSound] = useState(false)
  const [soundStatusMessage, setSoundStatusMessage] = useState<string | null>(null)
  const [isSoundPromptDismissed, setIsSoundPromptDismissed] = useState(false)
  const initializedRef = useRef(false)
  const seenOrderIdsRef = useRef<Set<string>>(new Set())
  const seenServiceRequestIdsRef = useRef<Set<string>>(new Set())
  const seenNoticeIdsRef = useRef<Set<string>>(new Set())
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)

  const createAudioElement = useCallback((src: string) => {
    const audio = new Audio(src)
    audio.preload = 'auto'
    audio.loop = false
    audio.load()
    return audio
  }, [])

  const ensureAudioReady = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new window.AudioContext()
    }

    await audioContextRef.current.resume().catch(() => undefined)

    if (!audioElementRef.current) {
      audioElementRef.current = createAudioElement(notificationSoundSrc)
    }
  }, [createAudioElement])

  useEffect(() => {
    const storedSeenNotices = window.sessionStorage.getItem(seenNoticeStorageKey)

    if (storedSeenNotices) {
      try {
        const parsed = JSON.parse(storedSeenNotices) as string[]
        seenNoticeIdsRef.current = new Set(parsed)
      } catch {
        window.sessionStorage.removeItem(seenNoticeStorageKey)
      }
    }

    if (window.sessionStorage.getItem(soundReadyStorageKey) === 'true') {
      setIsSoundReady(true)
    }

    if (window.sessionStorage.getItem(soundPromptDismissedStorageKey) === 'true') {
      setIsSoundPromptDismissed(true)
    }
  }, [])

  function persistSeenNoticeIds(nextIds: Set<string>) {
    seenNoticeIdsRef.current = nextIds
    window.sessionStorage.setItem(seenNoticeStorageKey, JSON.stringify(Array.from(nextIds)))
  }

  useEffect(() => {
    function warmUpAudio() {
      void ensureAudioReady()
    }

    window.addEventListener('pointerdown', warmUpAudio)
    window.addEventListener('keydown', warmUpAudio)

    return () => {
      window.removeEventListener('pointerdown', warmUpAudio)
      window.removeEventListener('keydown', warmUpAudio)
      void audioContextRef.current?.close().catch(() => undefined)
      audioContextRef.current = null
      audioElementRef.current = null
    }
  }, [ensureAudioReady])

  useEffect(() => {
    let cancelled = false

    async function playFallbackNotificationSound() {
      const context = audioContextRef.current

      if (!context) {
        return
      }

      if (context.state === 'suspended') {
        await context.resume().catch(() => undefined)
      }

      if (context.state !== 'running') {
        return
      }

      const gain = context.createGain()
      gain.gain.setValueAtTime(0.0001, context.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.42)
      gain.connect(context.destination)

      const firstTone = context.createOscillator()
      firstTone.type = 'triangle'
      firstTone.frequency.setValueAtTime(880, context.currentTime)
      firstTone.connect(gain)
      firstTone.start(context.currentTime)
      firstTone.stop(context.currentTime + 0.14)

      const secondTone = context.createOscillator()
      secondTone.type = 'triangle'
      secondTone.frequency.setValueAtTime(1175, context.currentTime + 0.16)
      secondTone.connect(gain)
      secondTone.start(context.currentTime + 0.16)
      secondTone.stop(context.currentTime + 0.3)
    }

    async function playNotificationSound() {
      await ensureAudioReady()

      if (!audioElementRef.current) {
        audioElementRef.current = createAudioElement(notificationSoundSrc)
      }

      try {
        audioElementRef.current.pause()
        audioElementRef.current.currentTime = 0
        await audioElementRef.current.play()
      } catch {
        if (notificationSoundSrc !== defaultNotificationSoundSrc) {
          try {
            audioElementRef.current = createAudioElement(defaultNotificationSoundSrc)
            await audioElementRef.current.play()
            return
          } catch {
            // Fall through to the generated beep.
          }
        }

        await playFallbackNotificationSound()
      }
    }

    async function refreshNotifications() {
      const response = await fetch('/api/admin/overview', {
        method: 'GET',
        cache: 'no-store'
      }).catch(() => null)

      if (!response || cancelled) {
        return
      }

      if (response.status === 401) {
        router.replace('/admin/login?error=unauthorized')
        return
      }

      if (!response.ok) {
        return
      }

      const nextData = (await response.json()) as AdminOverviewData

      if (cancelled) {
        return
      }

      const nextOrderIds = new Set(nextData.orders.map((order) => order.id))
      const nextServiceIds = new Set(nextData.serviceRequests.map((request) => request.id))

      if (!initializedRef.current) {
        seenOrderIdsRef.current = nextOrderIds
        seenServiceRequestIdsRef.current = nextServiceIds
        initializedRef.current = true
        return
      }

      const newOrderNotices = nextData.orders
        .filter((order) => !seenOrderIdsRef.current.has(order.id))
        .map(buildOrderNotice)
        .filter((notice) => !seenNoticeIdsRef.current.has(notice.id))
      const newServiceNotices = nextData.serviceRequests
        .filter((request) => !seenServiceRequestIdsRef.current.has(request.id))
        .map(buildServiceNotice)
        .filter((notice) => !seenNoticeIdsRef.current.has(notice.id))

      seenOrderIdsRef.current = nextOrderIds
      seenServiceRequestIdsRef.current = nextServiceIds

      const nextNotices = [...newServiceNotices, ...newOrderNotices]

      if (nextNotices.length === 0) {
        return
      }

      const persistedNoticeIds = new Set(seenNoticeIdsRef.current)

      for (const notice of nextNotices) {
        persistedNoticeIds.add(notice.id)
      }

      persistSeenNoticeIds(persistedNoticeIds)
      setNotices((current) => [...nextNotices, ...current].slice(0, 4))
      void playNotificationSound()
    }

    void refreshNotifications()

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshNotifications()
      }
    }

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refreshNotifications()
      }
    }, intervalMs)

    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      cancelled = true
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [createAudioElement, ensureAudioReady, intervalMs, router])

  function dismissNotice(id: string) {
    setNotices((current) => current.filter((notice) => notice.id !== id))
  }

  function dismissSoundPrompt() {
    stopTestingSound()
    setSoundStatusMessage(null)
    setIsSoundPromptDismissed(true)
    window.sessionStorage.setItem(soundPromptDismissedStorageKey, 'true')
  }

  function stopTestingSound() {
    if (audioElementRef.current) {
      audioElementRef.current.pause()
      audioElementRef.current.currentTime = 0
      audioElementRef.current.loop = false
    }

    setIsTestingSound(false)
  }

  function stopAlertSound() {
    if (audioElementRef.current) {
      audioElementRef.current.pause()
      audioElementRef.current.currentTime = 0
      audioElementRef.current.loop = false
    }
  }

  async function unlockAndTestSound() {
    setSoundStatusMessage(null)

    try {
      await ensureAudioReady()

      if (!audioElementRef.current) {
        audioElementRef.current = createAudioElement(notificationSoundSrc)
      }

      audioElementRef.current.pause()
      audioElementRef.current.currentTime = 0
      audioElementRef.current.loop = true
      await audioElementRef.current.play()
      setIsTestingSound(true)
      setSoundStatusMessage('Testing alert sound. Stop it or confirm that it works.')
    } catch {
      stopTestingSound()
      setIsSoundReady(false)
      setSoundStatusMessage('Browser blocked playback. Tap again after interacting with the page.')
    }
  }

  function confirmSoundReady() {
    stopTestingSound()
    setIsSoundReady(true)
    setIsSoundPromptDismissed(true)
    window.sessionStorage.setItem(soundReadyStorageKey, 'true')
    window.sessionStorage.setItem(soundPromptDismissedStorageKey, 'true')
    setSoundStatusMessage('Alert sound enabled.')
  }

  if (notices.length === 0 && (isSoundReady || isSoundPromptDismissed)) {
    return null
  }

  return (
    <div className="adminNotifierStack" aria-live="polite" aria-atomic="false">
      {!isSoundReady && !isSoundPromptDismissed ? (
        <article className="card supportCard adminAlertPopup">
          <div className="summaryRow">
            <p className="eyebrow">Alert sound</p>
            <button
              className="popupCloseButton"
              type="button"
              aria-label="Close alert sound prompt"
              onClick={dismissSoundPrompt}
            >
              Close
            </button>
          </div>
          <h2>Enable notification sound</h2>
          <p>Browsers often require one manual tap before new-order sounds can play automatically.</p>
          <div className="buttonRow">
            {!isTestingSound ? (
              <button className="button" type="button" onClick={() => void unlockAndTestSound()}>
                Enable and test sound
              </button>
            ) : null}
            {isTestingSound ? (
              <button className="button" type="button" onClick={stopTestingSound}>
                Stop sound
              </button>
            ) : null}
            {isTestingSound ? (
              <button className="button buttonSecondary" type="button" onClick={confirmSoundReady}>
                Yes, it works
              </button>
            ) : null}
          </div>
          {soundStatusMessage ? <p className="finePrint">{soundStatusMessage}</p> : null}
        </article>
      ) : null}

      {notices.map((notice) => (
        <article className="card supportCard adminAlertPopup" key={notice.id}>
          <p className="eyebrow">{notice.kind === 'order' ? 'New order' : 'Server call'}</p>
          <h2>{notice.title}</h2>
          <p>{notice.message}</p>
          <div className="buttonRow">
            <button
              className="button"
              type="button"
              onClick={() => {
                stopAlertSound()
                dismissNotice(notice.id)
                router.push(`/admin/sessions/${notice.tableId}`)
              }}
            >
              Open table session
            </button>
            <button
              className="button buttonSecondary"
              type="button"
              onClick={() => {
                stopAlertSound()
                dismissNotice(notice.id)
              }}
            >
              Dismiss
            </button>
          </div>
        </article>
      ))}
    </div>
  )
}
