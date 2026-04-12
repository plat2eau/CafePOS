import Image from 'next/image'
import Link from 'next/link'
import { cookies } from 'next/headers'
import {
  createOrRefreshTableSession,
  createServiceRequestForTable,
  placeOrderForTable
} from '@/app/table/[tableId]/actions'
import GuestSessionForm from '@/components/GuestSessionForm'
import GuestOrderingExperience from '@/components/GuestOrderingExperience'
import GuestServiceRequestPanel from '@/components/GuestServiceRequestPanel'
import { getAdminAuthContext } from '@/lib/admin-auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'
import {
  getTableOrderIdentityCookieName,
  getTableSessionCookieName,
  parseTableOrderIdentityCookie
} from '@/lib/table-session'

type TablePageProps = {
  params: Promise<{
    tableId: string
  }>
}

type MenuCategory = Database['public']['Tables']['menu_categories']['Row']
type MenuItem = Database['public']['Tables']['menu_items']['Row']

export default async function TablePage({ params }: TablePageProps) {
  const { tableId } = await params
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
      .select('id, category_id, name, description, price_cents, is_available, sort_order, created_at, updated_at')
      .eq('is_available', true)
      .order('sort_order', { ascending: true })
  ])

  const hasError = tableError || activeSessionError || categoriesError || itemsError
  const isCurrentGuestSession = activeSession?.id === currentSessionId
  const sessionAction = createOrRefreshTableSession.bind(null, tableId)
  const placeOrderAction = placeOrderForTable.bind(null, tableId)
  const serviceRequestAction = createServiceRequestForTable.bind(null, tableId)
  const isAdminPreview = Boolean(adminAuth)
  const canAccessOrdering = Boolean(
    table?.is_active && (isAdminPreview || (activeSession && isCurrentGuestSession))
  )
  const activeOrdererName = orderIdentity?.name ?? activeSession?.guest_name ?? ''

  const itemsByCategory = new Map<string, MenuItem[]>(
    (categories ?? []).map((category: MenuCategory) => [category.id, []])
  )

  for (const item of items ?? []) {
    const list = itemsByCategory.get(item.category_id)
    if (list) {
      list.push(item)
    } else {
      itemsByCategory.set(item.category_id, [item])
    }
  }

  return (
    <main>
      <section className="hero heroShell">
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
          <p className="eyebrow">CafePOS</p>
          <div className="heroHeaderRow">
            <div className="sectionStack">
              <h1>{table?.label ?? `Table ${tableId}`}</h1>
              {hasError ? (
                <p className="lead">We are having trouble loading this table right now. Please ask a staff member for help.</p>
              ) : !table ? (
                <p className="lead">This table is not available right now. Please check with the cafe team.</p>
              ) : !table.is_active ? (
                <p className="lead">This table is currently unavailable. Please ask the cafe team for assistance.</p>
              ) : (
                <p className="lead">Fresh coffee, tea, and bites made for your table.</p>
              )}
            </div>
          </div>
        </div>

        {canAccessOrdering ? (
          <div className="buttonRow">
            <Link className="button" href={`/table/${tableId}/orders`}>
              View order history
            </Link>
          </div>
        ) : null}

        {!hasError && table && table.is_active && !canAccessOrdering && (
          <article className="card sessionGateCard">
            <p className="eyebrow">Welcome</p>
            <h2>Start your table order</h2>
            <p className="lead">
              {activeSession && !isCurrentGuestSession
                ? 'This table is already in session. Enter your details and the table PIN to join from this device.'
                : 'Share your details to open the menu for this table.'}
            </p>
            {activeSession ? (
              <div className="compactGrid">
                <article className="card supportCard">
                  <p className="eyebrow">Already active</p>
                  <h2>{activeSession.guest_name}</h2>
                  <p>
                    {isCurrentGuestSession
                      ? 'Continue with this table by confirming your details below.'
                      : 'Use your own name and phone, then enter the session PIN from staff or the person who started this table.'}
                  </p>
                </article>
              </div>
            ) : null}
            <GuestSessionForm
              action={sessionAction}
              initialName={isCurrentGuestSession ? activeSession?.guest_name : ''}
              initialPhone={isCurrentGuestSession ? (activeSession?.guest_phone ?? '') : ''}
              requirePin={Boolean(activeSession && !isCurrentGuestSession)}
            />
          </article>
        )}

        {!hasError && table && table.is_active && canAccessOrdering && (activeSession || isAdminPreview) && (
          <div className="sectionStack">
            <article className="card supportCard guestBanner">
              <p className="eyebrow">{isAdminPreview ? 'Admin preview' : 'Ready to order'}</p>
              <h2>
                {isAdminPreview
                  ? activeSession
                    ? `Previewing ${activeSession.guest_name}'s table`
                    : `Previewing table ${tableId}`
                  : `Ordering as ${activeOrdererName || activeSession?.guest_name || 'Guest'}`}
              </h2>
              <p>
                {isAdminPreview
                  ? 'You are viewing the guest experience as staff. Ordering and service actions are disabled in preview mode.'
                  : 'Pick your favourites and send your order whenever you are ready.'}
              </p>
              {activeSession ? (
                <>
                  <div className="metaPillRow">
                    <span className="metaPill">
                      Session PIN <strong>{activeSession.session_pin}</strong>
                    </span>
                  </div>
                  <p className="finePrint">
                    Share this PIN only with someone joining this same table on another device.
                  </p>
                </>
              ) : null}
            </article>
            <GuestServiceRequestPanel action={serviceRequestAction} previewMode={isAdminPreview} />
            <GuestOrderingExperience
              tableId={tableId}
              categories={categories ?? []}
              items={items ?? []}
              action={placeOrderAction}
              guestName={
                isAdminPreview
                  ? adminAuth?.profile.display_name ?? adminAuth?.email ?? 'Admin preview'
                  : activeOrdererName || activeSession?.guest_name || 'Guest'
              }
              previewMode={isAdminPreview}
            />
          </div>
        )}
      </section>
    </main>
  )
}
