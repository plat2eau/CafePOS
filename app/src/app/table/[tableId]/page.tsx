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
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'
import { getTableSessionCookieName } from '@/lib/table-session'

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

  const [
    { data: table, error: tableError },
    { data: activeSession, error: activeSessionError },
    { data: categories, error: categoriesError },
    { data: items, error: itemsError }
  ] = await Promise.all([
    supabase
      .from('tables')
      .select('id, label, is_active')
      .eq('id', tableId)
      .maybeSingle(),
    supabase
      .from('table_sessions')
      .select('id, guest_name, guest_phone, last_active_at, status')
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
  const canAccessOrdering = Boolean(activeSession && isCurrentGuestSession)

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
            <p className="lead">Share your details to open the menu for this table.</p>
            {activeSession ? (
              <div className="compactGrid">
                <article className="card supportCard">
                  <p className="eyebrow">Already active</p>
                  <h2>{activeSession.guest_name}</h2>
                  <p>Continue with this table by confirming your details below.</p>
                </article>
              </div>
            ) : null}
            <GuestSessionForm
              action={sessionAction}
              initialName={isCurrentGuestSession ? activeSession?.guest_name : ''}
              initialPhone={isCurrentGuestSession ? activeSession?.guest_phone : ''}
            />
          </article>
        )}

        {!hasError && table && table.is_active && canAccessOrdering && activeSession && (
          <div className="sectionStack">
            <article className="card supportCard guestBanner">
              <p className="eyebrow">Ready to order</p>
              <h2>Ordering as {activeSession.guest_name}</h2>
              <p>Pick your favourites and send your order whenever you are ready.</p>
            </article>
            <GuestServiceRequestPanel action={serviceRequestAction} />
            <GuestOrderingExperience
              tableId={tableId}
              categories={categories ?? []}
              items={items ?? []}
              action={placeOrderAction}
              guestName={activeSession.guest_name}
            />
          </div>
        )}
      </section>
    </main>
  )
}
