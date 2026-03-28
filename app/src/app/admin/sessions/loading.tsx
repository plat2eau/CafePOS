import PageLoadingState from '@/components/PageLoadingState'

export default function Loading() {
  return (
    <PageLoadingState
      eyebrow="Admin Ops"
      title="Loading active sessions"
      description="Fetching occupied tables and the live order feed."
      cardCount={4}
    />
  )
}
