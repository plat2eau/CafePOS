'use client'

import type { FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SectionCard } from '@/components/ui/section-card'
import {
  addCivilDays,
  businessDateRangeToUnixSeconds,
  businessDateToRange,
  defaultBusinessTimezone,
  formatDateKey,
  getBusinessDateParts,
  parseDateKey
} from '@/lib/business-day'
import type { DateOnlyParts } from '@/lib/business-day'

type AdminDashboardDateFilterProps = {
  fromDate: string
  toDate: string
  timezone: string
}

type QuickFilter = {
  label: string
  from: DateOnlyParts
  to: DateOnlyParts
}

function parseDateInput(value: string) {
  return parseDateKey(value)
}

function buildDashboardUrl(from: DateOnlyParts, to: DateOnlyParts, timezone: string) {
  const { fromTimestamp, toTimestamp } = businessDateRangeToUnixSeconds(from, to, timezone)
  const params = new URLSearchParams({
    from: fromTimestamp.toString(),
    to: toTimestamp.toString()
  })

  if (timezone !== defaultBusinessTimezone) {
    params.set('timezone', timezone)
  }

  return `/admin/dashboard?${params.toString()}`
}

function getQuickFilters(timezone: string): QuickFilter[] {
  const today = getBusinessDateParts(new Date(), timezone)
  const yesterday = addCivilDays(today.year, today.month, today.day, -1)

  return [
    {
      label: 'Today',
      from: today,
      to: today
    },
    {
      label: 'Yesterday',
      from: yesterday,
      to: yesterday
    },
    {
      label: 'Last Week',
      from: addCivilDays(today.year, today.month, today.day, -6),
      to: today
    },
    {
      label: 'Last Month',
      from: addCivilDays(today.year, today.month, today.day, -29),
      to: today
    },
    {
      label: 'Last 3 months',
      from: addCivilDays(today.year, today.month, today.day, -89),
      to: today
    },
    {
      label: 'Last 6 months',
      from: addCivilDays(today.year, today.month, today.day, -179),
      to: today
    },
    {
      label: 'Last Year',
      from: addCivilDays(today.year, today.month, today.day, -364),
      to: today
    }
  ]
}

function dateInputToUnixSeconds(value: string, timezone: string, boundary: 'start' | 'end') {
  const parsed = parseDateInput(value)

  if (!parsed) {
    return null
  }

  const range = businessDateToRange(parsed, timezone)
  const date = boundary === 'start' ? range.startAt : range.endAt

  return Math.floor(date.getTime() / 1000)
}

export default function AdminDashboardDateFilter({
  fromDate,
  toDate,
  timezone
}: AdminDashboardDateFilterProps) {
  const router = useRouter()
  const quickFilters = getQuickFilters(timezone)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const nextFromDate = String(formData.get('fromDate') ?? '')
    const nextToDate = String(formData.get('toDate') ?? '')
    const fromTimestamp = dateInputToUnixSeconds(nextFromDate, timezone, 'start')
    const toTimestamp = dateInputToUnixSeconds(nextToDate, timezone, 'end')

    if (fromTimestamp === null || toTimestamp === null || fromTimestamp >= toTimestamp) {
      router.push('/admin/dashboard')
      return
    }

    const params = new URLSearchParams({
      from: fromTimestamp.toString(),
      to: toTimestamp.toString()
    })

    if (timezone !== defaultBusinessTimezone) {
      params.set('timezone', timezone)
    }

    router.push(`/admin/dashboard?${params.toString()}`)
  }

  return (
    <SectionCard as="div" density="compact" className="bg-[var(--card-bg-strong)]">
      <div className="mb-4 flex flex-wrap gap-2">
        {quickFilters.map((filter) => {
          const isActive =
            fromDate === formatDateKey(filter.from) &&
            toDate === formatDateKey(filter.to)

          return (
            <Button
              asChild
              key={filter.label}
              size="sm"
              variant={isActive ? 'default' : 'secondary'}
            >
              <Link href={buildDashboardUrl(filter.from, filter.to, timezone)}>
                {filter.label}
              </Link>
            </Button>
          )
        })}
      </div>
      <form
        className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end"
        onSubmit={handleSubmit}
      >
        <div className="grid gap-2">
          <Label htmlFor="dashboard-from-date">From</Label>
          <Input id="dashboard-from-date" name="fromDate" type="date" defaultValue={fromDate} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="dashboard-to-date">To</Label>
          <Input id="dashboard-to-date" name="toDate" type="date" defaultValue={toDate} />
        </div>
        <Button type="submit" size="form" className="md:w-auto">
          Apply
        </Button>
      </form>
    </SectionCard>
  )
}
