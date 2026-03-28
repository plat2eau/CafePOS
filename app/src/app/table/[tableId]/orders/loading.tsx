import PageLoadingState from '@/components/PageLoadingState'

export default function Loading() {
  return (
    <PageLoadingState
      eyebrow="Order History"
      title="Loading orders"
      description="Fetching the latest order history for this table session."
      cardCount={3}
    />
  )
}
