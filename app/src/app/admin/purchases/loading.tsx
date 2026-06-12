import PageLoadingState from '@/components/PageLoadingState'

export default function AdminPurchasesLoading() {
  return (
    <PageLoadingState
      eyebrow="Admin Purchases"
      title="Loading purchases"
      description="Preparing vendor bills and purchase item data."
    />
  )
}
