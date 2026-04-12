import * as React from 'react'
import { SectionCard, type SectionCardProps } from '@/components/ui/section-card'
import { SurfaceCard } from '@/components/ui/surface-card'
import { SummaryRow } from '@/components/ui/summary-row'
import { cn } from '@/lib/utils'

type MetricCardProps = {
  eyebrow: string
  value: React.ReactNode
  description: string
  tone?: SectionCardProps['tone']
  className?: string
}

function MetricCard({ eyebrow, value, description, tone, className }: MetricCardProps) {
  return (
    <SectionCard className={className} tone={tone}>
      <p className="eyebrow">{eyebrow}</p>
      <h2>{value}</h2>
      <p>{description}</p>
    </SectionCard>
  )
}

type EmptyStateCardProps = {
  eyebrow: string
  title: string
  description: string
  tone?: SectionCardProps['tone']
  density?: SectionCardProps['density']
  className?: string
  actions?: React.ReactNode
}

function EmptyStateCard({
  eyebrow,
  title,
  description,
  tone = 'default',
  density = 'compact',
  className,
  actions
}: EmptyStateCardProps) {
  return (
    <SectionCard as="div" className={className} tone={tone} density={density}>
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p>{description}</p>
      {actions ? <div className="pt-2">{actions}</div> : null}
    </SectionCard>
  )
}

type OrderCardItem = {
  id?: string
  name: string
  quantity: number
  total: string
}

type OrderCardProps = {
  title: string
  timestamp?: string
  summary: React.ReactNode
  items: OrderCardItem[]
  note?: string | null
  total: string
  actions?: React.ReactNode
  className?: string
}

function OrderCard({
  title,
  timestamp,
  summary,
  items,
  note,
  total,
  actions,
  className
}: OrderCardProps) {
  return (
    <SurfaceCard className={cn('flex flex-col gap-4', className)}>
      <SummaryRow>
        <strong>{title}</strong>
        {timestamp ? <span>{timestamp}</span> : <span />}
      </SummaryRow>
      <div>{summary}</div>
      <div className="flex flex-col gap-3">
        {items.map((item, index) => (
          <SummaryRow key={item.id ?? `${item.name}-${index}`}>
            <span>
              {item.name} x {item.quantity}
            </span>
            <strong>{item.total}</strong>
          </SummaryRow>
        ))}
      </div>
      {note ? <p>Note: {note}</p> : null}
      <SummaryRow variant="total">
        <span>Total</span>
        <strong>{total}</strong>
      </SummaryRow>
      {actions ? <div>{actions}</div> : null}
    </SurfaceCard>
  )
}

type SessionCardProps = {
  title: string
  summary?: React.ReactNode
  guestName: string
  guestPhone?: string | null
  sessionPin?: string
  startedAt?: string
  lastActiveAt?: string
  actions?: React.ReactNode
  className?: string
}

function SessionCard({
  title,
  summary,
  guestName,
  guestPhone,
  sessionPin,
  startedAt,
  lastActiveAt,
  actions,
  className
}: SessionCardProps) {
  return (
    <SurfaceCard className={cn('flex flex-col gap-3', className)}>
      {summary ? (
        <SummaryRow>
          <strong>{title}</strong>
          <span>{summary}</span>
        </SummaryRow>
      ) : (
        <p>
          <strong>{title}</strong>
        </p>
      )}
      <p>{guestName}</p>
      {guestPhone ? <p>{guestPhone}</p> : null}
      {sessionPin ? (
        <p>
          Session PIN <strong>{sessionPin}</strong>
        </p>
      ) : null}
      {startedAt ? <p>Started {startedAt}</p> : null}
      {lastActiveAt ? <p>Last active {lastActiveAt}</p> : null}
      {actions ? <div>{actions}</div> : null}
    </SurfaceCard>
  )
}

type ServiceRequestCardProps = {
  title: string
  timestamp: string
  guestName?: string | null
  note?: string | null
  className?: string
}

function ServiceRequestCard({
  title,
  timestamp,
  guestName,
  note,
  className
}: ServiceRequestCardProps) {
  return (
    <SurfaceCard className={cn('flex flex-col gap-3', className)}>
      <SummaryRow>
        <strong>{title}</strong>
        <span>{timestamp}</span>
      </SummaryRow>
      <p>{guestName ?? 'Guest'}</p>
      {note ? <p>Note: {note}</p> : null}
    </SurfaceCard>
  )
}

export { EmptyStateCard, MetricCard, OrderCard, ServiceRequestCard, SessionCard }
