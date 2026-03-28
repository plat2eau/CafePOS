import PageLoadingState from '@/components/PageLoadingState'

export default function Loading() {
  return (
    <PageLoadingState
      eyebrow="Admin Auth"
      title="Loading staff login"
      description="Preparing the secure admin sign-in screen."
      cardCount={2}
    />
  )
}
