import PageLoadingState from '@/components/PageLoadingState'

export default function Loading() {
  return (
    <PageLoadingState
      eyebrow="CafePOS"
      title="Loading dashboard"
      description="Preparing the current cafe workspace."
      cardCount={4}
    />
  )
}
