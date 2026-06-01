import { redirect } from 'next/navigation'

type TableOrdersPageProps = {
  params: Promise<{
    tableId: string
  }>
  searchParams: Promise<{
    placed?: string
  }>
}

export default async function TableOrdersPage({ params, searchParams }: TableOrdersPageProps) {
  const { tableId } = await params
  const { placed } = await searchParams

  redirect(`/table/${tableId}?tab=orders${placed === '1' ? '&placed=1' : ''}`)
}
