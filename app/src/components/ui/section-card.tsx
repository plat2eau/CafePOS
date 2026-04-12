import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Card, type CardProps } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const sectionCardVariants = cva(
  'min-w-0 border-border text-card-foreground shadow-none [&_p]:leading-6 [&_p]:text-[var(--muted)]',
  {
    variants: {
      tone: {
        default: 'bg-card',
        support:
          'bg-[linear-gradient(135deg,rgb(var(--accent-rgb)/0.12),transparent_60%),var(--panel-strong)]',
        success:
          'bg-[radial-gradient(circle_at_top_right,var(--success-glow),transparent_34%),linear-gradient(135deg,var(--success-surface-start),var(--success-surface-end))]',
        warning:
          'bg-[radial-gradient(circle_at_top_right,rgba(176,76,61,0.12),transparent_34%),rgba(255,251,248,0.94)]'
      },
      density: {
        default: 'rounded-[18px] p-[clamp(18px,2.8vw,24px)]',
        compact: 'rounded-2xl p-4'
      }
    },
    defaultVariants: {
      tone: 'default',
      density: 'default'
    }
  }
)

type SectionCardProps = Omit<CardProps, 'asChild'> &
  VariantProps<typeof sectionCardVariants> & {
    as?: 'article' | 'div' | 'section'
  }

function SectionCard({
  as: Comp = 'article',
  className,
  tone,
  density,
  ...props
}: SectionCardProps) {
  return (
    <Card asChild className={cn(sectionCardVariants({ tone, density }), className)}>
      <Comp {...props} />
    </Card>
  )
}

export { SectionCard, sectionCardVariants }
export type { SectionCardProps }
