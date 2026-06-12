import PageLoadingState from '@/components/PageLoadingState'

export default function AdminPurchasesLoading() {
  return (
    <PageLoadingState
      title="Loading purchases"
      description="Preparing vendor bills and purchase item data."
    />
  )
}
