import * as React from 'react'
import { SectionCard, type SectionCardProps } from '@/components/ui/section-card'

type SurfaceCardProps = Omit<SectionCardProps, 'as' | 'density'>

function SurfaceCard(props: SurfaceCardProps) {
  return <SectionCard as="div" density="compact" {...props} />
}

export { SurfaceCard }
export type { SurfaceCardProps }
