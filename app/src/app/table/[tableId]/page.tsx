import Image from 'next/image'
import Link from 'next/link'
import { cookies } from 'next/headers'
import {
  createOrRefreshTableSession,
  createServiceRequestForTable,
  placeOrderForTable
} from '@/app/table/[tableId]/actions'
import { EmptyStateCard } from '@/components/AppCards'
import GuestCustomerFlow from '@/components/GuestCustomerFlow'
import GuestOrderHistory from '@/components/GuestOrderHistory'
import GuestPaymentTab from '@/components/GuestPaymentTab'
import GuestSessionAutoResume from '@/components/GuestSessionAutoResume'
import GuestSessionForm from '@/components/GuestSessionForm'
import GuestServiceRequestPanel from '@/components/GuestServiceRequestPanel'
import { Button } from '@/components/ui/button'
import { SectionCard } from '@/components/ui/section-card'
import { getAdminAuthContext } from '@/lib/admin-auth'
import { logApiError } from '@/lib/api-errors'
import type { AdminOrder } from '@/lib/admin-data'
import { buildReceiptPayloadForOrders } from '@/lib/receipt-print'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  getTableOrderIdentityCookieName,
  getTableSessionCookieName,
  parseTableOrderIdentityCookie
} from '@/lib/table-session'

type TablePageProps = {
  params: Promise<{
    tableId: string
  }>
  searchParams: Promise<{
    placed?: string
    tab?: string
  }>
}

export default async function TablePage({ params, searchParams }: TablePageProps) {
  const { tableId } = await params
  const { placed, tab } = await searchParams
  const supabase = createServerSupabaseClient()
  const cookieStore = await cookies()
  const currentSessionId = cookieStore.get(getTableSessionCookieName(tableId))?.value
  const orderIdentity = parseTableOrderIdentityCookie(
    cookieStore.get(getTableOrderIdentityCookieName(tableId))?.value
  )

  const [
    adminAuth,
    { data: table, error: tableError },
    { data: activeSession, error: activeSessionError },
    { data: categories, error: categoriesError },
    { data: items, error: itemsError }
  ] = await Promise.all([
    getAdminAuthContext(),
    supabase
      .from('tables')
      .select('id, label, is_active')
      .eq('id', tableId)
      .maybeSingle(),
    supabase
      .from('table_sessions')
      .select('id, guest_name, guest_phone, last_active_at, session_pin, status')
      .eq('table_id', tableId)
      .eq('status', 'active')
      .maybeSingle(),
    supabase
      .from('menu_categories')
      .select('id, name, sort_order, created_at')
      .order('sort_order', { ascending: true }),
    supabase
      .from('menu_items')
      .select('id, category_id, name, description, price_cents, half_price_cents, full_price_cents, is_available, sort_order, created_at, updated_at')
      .eq('is_available', true)
      .order('sort_order', { ascending: true })
  ])

  const hasError = tableError || activeSessionError || categoriesError || itemsError

  if (hasError) {
    if (tableError) logApiError('table.page.loadTable', tableError)
    if (activeSessionError) logApiError('table.page.loadActiveSession', activeSessionError)
    if (categoriesError) logApiError('table.page.loadCategories', categoriesError)
    if (itemsError) logApiError('table.page.loadItems', itemsError)
  }

  const isCurrentGuestSession = activeSession?.id === currentSessionId
  const sessionAction = createOrRefreshTableSession.bind(null, tableId)
  const placeOrderAction = placeOrderForTable.bind(null, tableId)
  const serviceRequestAction = createServiceRequestForTable.bind(null, tableId)
  const isAdminPreview = Boolean(adminAuth)
  const canAccessOrdering = Boolean(
    table?.is_active && (isAdminPreview || (activeSession && isCurrentGuestSession))
  )
  const activeOrdererName = orderIdentity?.name ?? activeSession?.guest_name ?? ''
  const accessibleSessionId = currentSessionId ?? (isAdminPreview ? activeSession?.id ?? null : null)

  const { data: orders, error: ordersError } = accessibleSessionId
    ? await supabase
      .from('orders')
      .select(
        'id, created_at, status, note, total_cents, ordered_by_name, ordered_by_phone, order_items(item_name, quantity, line_total_cents)'
      )
      .eq('table_id', tableId)
      .eq('session_id', accessibleSessionId)
      .order('created_at', { ascending: false })
    : { data: null, error: null }

  if (ordersError) {
    logApiError('table.page.loadOrders', ordersError)
  }

  const receiptOrders: AdminOrder[] = (orders ?? []).map((order) => ({
    id: order.id,
    table_id: tableId,
    created_at: order.created_at,
    status: order.status as AdminOrder['status'],
    note: order.note,
    total_cents: order.total_cents,
    session_id: accessibleSessionId,
    guest_name: activeSession?.guest_name ?? null,
    ordered_by_name: order.ordered_by_name,
    ordered_by_phone: order.ordered_by_phone ?? '',
    items: (order.order_items ?? []).map((item, index) => ({
      id: `${order.id}-${index}`,
      menu_item_id: null,
      item_name: item.item_name,
      portion: null,
      quantity: item.quantity,
      unit_price_cents:
        item.quantity > 0 ? Math.round(item.line_total_cents / item.quantity) : item.line_total_cents,
      line_total_cents: item.line_total_cents
    }))
  }))

  const receiptPayload =
    accessibleSessionId && receiptOrders.length > 0
      ? buildReceiptPayloadForOrders({
          guestName: activeSession?.guest_name || activeOrdererName || 'Guest',
          orders: receiptOrders
        })
      : null

  return (
    <main>
      <section className="hero heroShell">
        {!isAdminPreview ? (
          <GuestSessionAutoResume
            tableId={tableId}
            activeSessionId={activeSession?.id ?? null}
            canAccessOrdering={canAccessOrdering}
          />
        ) : null}

        <div className="heroHeader compact">
          <div className="customerBrandBlink" aria-hidden="true">
            <div className="customerBrandBlinkFrame">
              <Image
                src="/cheekoo-light.png"
                alt=""
                className="customerBrandBlinkAsset customerBrandBlinkAssetLight"
                width={894}
                height={144}
                priority
              />
              <Image
                src="/cheekoo-dark.png"
                alt=""
                className="customerBrandBlinkAsset customerBrandBlinkAssetDark"
                width={894}
                height={144}
                priority
              />
            </div>
          </div>
          <div className="heroHeaderRow">
            <div className="sectionStack">
              {hasError ? (
                <p className="lead">We are having trouble loading this table right now. Please ask a staff member for help.</p>
              ) : !table ? (
                <p className="lead">This table is not available right now. Please check with the cafe team.</p>
              ) : !table.is_active ? (
                <p className="lead">This table is currently unavailable. Please ask the cafe team for assistance.</p>
              ) : (
                ""
              )}
            </div>
          </div>
        </div>

        {!hasError && table && table.is_active && !canAccessOrdering && (
          <SectionCard
            className="mx-auto max-w-[760px] bg-[radial-gradient(circle_at_top_right,rgb(var(--accent-rgb)/0.08),transparent_34%),var(--card-bg-strong)]"
          >
            <p className="eyebrow">Welcome</p>
            <h2>Start your table order</h2>
            <p className="lead">
              {activeSession && !isCurrentGuestSession
                ? 'This table is already in session. Enter your details and the table PIN to join from this device.'
                : 'Share your details to open the menu for this table.'}
            </p>
            {activeSession ? (
              <div className="compactGrid">
                <EmptyStateCard
                  eyebrow="Already active"
                  title={activeSession.guest_name}
                  description={
                    isCurrentGuestSession
                      ? 'Continue with this table by confirming your details below.'
                      : 'Use your own name and phone, then enter the session PIN from staff or the person who started this table.'
                  }
                  tone="support"
                  density="default"
                />
              </div>
            ) : null}
            <GuestSessionForm
              action={sessionAction}
              initialName={isCurrentGuestSession ? activeSession?.guest_name : ''}
              initialPhone={isCurrentGuestSession ? (activeSession?.guest_phone ?? '') : ''}
              requirePin={Boolean(activeSession && !isCurrentGuestSession)}
            />
          </SectionCard>
        )}

        {!hasError && table && table.is_active && canAccessOrdering && (activeSession || isAdminPreview) && (
          <div className="sectionStack compact">
            <div className="metaPillRow guestDesktopTopMetaRow">
              <strong className="metaPill">{table?.label ?? `Table ${tableId}`}</strong>
              {activeSession ? (
                <span className="metaPill">
                  Session PIN &nbsp; <strong>{activeSession.session_pin}</strong>
                </span>
              ) : null}
              {isAdminPreview ? <span className="metaPill">Admin preview</span> : null}
              <Button asChild variant="secondary" size="sm" className="guestDesktopTopHistoryButton">
                <Link href={`/table/${tableId}?tab=orders`}>View order history</Link>
              </Button>
            </div>

            <GuestCustomerFlow
              tableId={tableId}
              categories={categories ?? []}
              items={items ?? []}
              initialPlaced={placed === '1'}
              initialTab={tab ?? null}
              action={placeOrderAction}
              guestName={
                isAdminPreview
                  ? adminAuth?.profile.display_name ?? adminAuth?.email ?? 'Admin preview'
                  : activeOrdererName || activeSession?.guest_name || 'Guest'
              }
              previewMode={isAdminPreview}
              menuIntro={null}
              desktopServicePanel={
                <GuestServiceRequestPanel action={serviceRequestAction} previewMode={isAdminPreview} />
              }
              orderHistory={
                <GuestOrderHistory
                  accessibleSessionId={accessibleSessionId}
                  adminPreview={isAdminPreview}
                  errorMessage={ordersError?.message}
                  orders={orders}
                />
              }
              paymentTab={
                <GuestPaymentTab
                  accessibleSessionId={accessibleSessionId}
                  adminPreview={isAdminPreview}
                  receiptPayload={receiptPayload}
                />
              }
            />
          </div>
        )}
      </section>
    </main>
  )
}
