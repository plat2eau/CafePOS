import PageLoadingState from '@/components/PageLoadingState'

export default function AdminDashboardLoadingPage() {
  return (
    <PageLoadingState
      eyebrow="Admin Analytics"
      title="Loading dashboard"
      description="Preparing sales, product, and ops metrics."
      cardCount={6}
    />
  )
}
