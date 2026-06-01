'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import type { PlaceOrderActionState } from '@/app/table/[tableId]/actions'
import GuestOrderHistoryPoller from '@/components/GuestOrderHistoryPoller'
import GuestOrderingExperience from '@/components/GuestOrderingExperience'
import { Button } from '@/components/ui/button'
import { SectionCard } from '@/components/ui/section-card'

type CustomerTab = 'menu' | 'orders' | 'payment'

type MenuCategory = {
  id: string
  name: string
}

type MenuItem = {
  id: string
  category_id: string
  name: string
  description: string | null
  price_cents: number
  half_price_cents: number | null
  full_price_cents: number | null
  sort_order: number
}

type GuestCustomerFlowProps = {
  tableId: string
  categories: MenuCategory[]
  items: MenuItem[]
  initialPlaced?: boolean
  initialTab?: string | null
  action: (
    state: PlaceOrderActionState,
    formData: FormData
  ) => Promise<PlaceOrderActionState>
  guestName: string
  previewMode?: boolean
  menuIntro: ReactNode
  desktopServicePanel: ReactNode
  orderHistory: ReactNode
  paymentTab: ReactNode
}

function getCustomerTab(value: string | null): CustomerTab {
  if (value === 'orders' || value === 'payment') {
    return value
  }

  return 'menu'
}

export default function GuestCustomerFlow({
  tableId,
  categories,
  items,
  initialPlaced = false,
  initialTab = null,
  action,
  guestName,
  previewMode = false,
  menuIntro,
  desktopServicePanel,
  orderHistory,
  paymentTab
}: GuestCustomerFlowProps) {
  const pathname = usePathname()
  const [activeTab, setActiveTab] = useState<CustomerTab>(() => getCustomerTab(initialTab))
  const [hasPlacedOrder, setHasPlacedOrder] = useState(initialPlaced)

  useEffect(() => {
    setActiveTab(getCustomerTab(initialTab))
  }, [initialTab])

  useEffect(() => {
    setHasPlacedOrder(initialPlaced)
  }, [initialPlaced])

  useEffect(() => {
    const url = new URL(window.location.href)

    if (activeTab === 'menu') {
      url.searchParams.delete('tab')
    } else {
      url.searchParams.set('tab', activeTab)
    }

    if (hasPlacedOrder) {
      url.searchParams.set('placed', '1')
    } else {
      url.searchParams.delete('placed')
    }

    const nextUrl = `${pathname}${url.search}${url.hash}`
    window.history.replaceState(window.history.state, '', nextUrl)
  }, [activeTab, hasPlacedOrder, pathname])

  useEffect(() => {
    const handlePopState = () => {
      const url = new URL(window.location.href)
      setActiveTab(getCustomerTab(url.searchParams.get('tab')))
      setHasPlacedOrder(url.searchParams.get('placed') === '1')
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const openTab = useCallback((tab: CustomerTab, placed = false) => {
    setActiveTab(tab)
    setHasPlacedOrder(placed)
  }, [])

  const handleOrderSuccess = useCallback(() => {
    if (window.matchMedia('(max-width: 639px)').matches) {
      openTab('orders', true)
      return true
    }

    return false
  }, [openTab])

  const tabs = useMemo<Array<{ id: CustomerTab; label: string }>>(
    () => [
      { id: 'menu', label: 'Menu' },
      { id: 'orders', label: 'Past orders' },
      { id: 'payment', label: 'Payment' }
    ],
    []
  )

  return (
    <div className="guestCustomerFlow">
      <GuestOrderHistoryPoller active={activeTab === 'orders'} />

      <div className={`guestCustomerTabPanel ${activeTab === 'menu' ? 'isActive' : ''}`}>
        <div className="sectionStack">
          {menuIntro}
          <div className="guestDesktopOnly">{desktopServicePanel}</div>
          <GuestOrderingExperience
            tableId={tableId}
            categories={categories}
            items={items}
            action={action}
            guestName={guestName}
            previewMode={previewMode}
            onOrderSuccess={handleOrderSuccess}
          />
        </div>
      </div>

      <div className={`guestCustomerTabPanel ${activeTab === 'orders' ? 'isActive' : ''}`}>
        <div className="sectionStack">
          {hasPlacedOrder ? (
            <SectionCard tone="success">
              <p className="eyebrow">Order placed</p>
              <h2>Your order has been sent</h2>
              <p>The cafe team has your order now. You can check the latest details below.</p>
            </SectionCard>
          ) : null}
          {orderHistory}
        </div>
      </div>

      <div
        className={`guestCustomerTabPanel guestPaymentTabPanel ${activeTab === 'payment' ? 'isActive' : ''}`}
        aria-label="Payment"
      >
        <div className="sectionStack">{paymentTab}</div>
      </div>

      <nav className="guestMobileTabBar" aria-label="Customer sections">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            type="button"
            variant="ghost"
            className={`guestMobileTabButton ${activeTab === tab.id ? 'isActive' : ''}`}
            aria-current={activeTab === tab.id ? 'page' : undefined}
            onClick={() => openTab(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </nav>
    </div>
  )
}
