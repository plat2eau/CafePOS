import PageLoadingState from '@/components/PageLoadingState'

export default function Loading() {
  return (
    <PageLoadingState
      title="Loading active sessions"
      description="Fetching occupied tables and the live order feed."
      cardCount={4}
    />
  )
}
