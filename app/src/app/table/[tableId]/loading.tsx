import PageLoadingState from '@/components/PageLoadingState'

export default function Loading() {
  return (
    <PageLoadingState
      eyebrow="CafePOS"
      title="Loading table menu"
      description="Getting this table ready with the latest guest and menu details."
      cardCount={4}
    />
  )
}
