import PageLoadingState from '@/components/PageLoadingState'

export default function Loading() {
  return (
    <PageLoadingState
      eyebrow="Admin Detail"
      title="Loading table details"
      description="Pulling the current session and order queue for this table."
      cardCount={3}
    />
  )
}
