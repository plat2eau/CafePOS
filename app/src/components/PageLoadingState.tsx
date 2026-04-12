import { SectionCard } from '@/components/ui/section-card'

type PageLoadingStateProps = {
  eyebrow: string
  title: string
  description: string
  cardCount?: number
}

export default function PageLoadingState({
  eyebrow,
  title,
  description,
  cardCount = 3
}: PageLoadingStateProps) {
  return (
    <main>
      <section className="hero heroShell">
        <div className="heroHeader compact">
          <p className="eyebrow">{eyebrow}</p>
          <div className="loadingLine loadingLineTitle" />
          <div className="loadingLine loadingLineBody" />
          <p className="loadingAssistText">{description}</p>
        </div>

        <div className="compactGrid">
          {Array.from({ length: cardCount }).map((_, index) => (
            <SectionCard as="article" className="loadingCard" key={index}>
              <div className="loadingLine loadingLineShort" />
              <div className="loadingLine loadingLineMedium" />
              <div className="loadingLine loadingLineBody" />
            </SectionCard>
          ))}
        </div>

        <div className="loadingScreenLabel" aria-live="polite">
          <span className="loadingPulseDot" aria-hidden="true" />
          {title}
        </div>
      </section>
    </main>
  )
}
