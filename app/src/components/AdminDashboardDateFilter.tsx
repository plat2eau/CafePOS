'use client'

import type { FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SectionCard } from '@/components/ui/section-card'

type AdminDashboardDateFilterProps = {
  fromDate: string
  toDate: string
  timezone: string
}

type DateParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

type DateOnlyParts = Pick<DateParts, 'year' | 'month' | 'day'>

type QuickFilter = {
  label: string
  from: DateOnlyParts
  to: DateOnlyParts
}

function parseDateInput(value: string) {
  const [year, month, day] = value.split('-').map((part) => Number.parseInt(part, 10))

  if (!year || !month || !day) {
    return null
  }

  return { year, month, day }
}

function padDatePart(value: number) {
  return value.toString().padStart(2, '0')
}

function formatDateInputValue(parts: DateOnlyParts) {
  return `${parts.year}-${padDatePart(parts.month)}-${padDatePart(parts.day)}`
}

function addCivilDays(year: number, month: number, day: number, days: number) {
  const next = new Date(Date.UTC(year, month - 1, day + days))

  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate()
  }
}

function getDateTimeParts(date: Date, timezone: string): DateParts {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date)
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number.parseInt(part.value, 10)])
  ) as Record<'year' | 'month' | 'day' | 'hour' | 'minute' | 'second', number>

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second
  }
}

function getTimeZoneOffsetMs(date: Date, timezone: string) {
  const parts = getDateTimeParts(date, timezone)

  return (
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second
    ) - date.getTime()
  )
}

function zonedDateTimeToUnixSeconds(parts: DateParts, timezone: string) {
  const utcGuess = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
  )
  const offset = getTimeZoneOffsetMs(utcGuess, timezone)

  return Math.floor((utcGuess.getTime() - offset) / 1000)
}

function buildDashboardUrl(from: DateOnlyParts, to: DateOnlyParts, timezone: string) {
  const fromTimestamp = zonedDateTimeToUnixSeconds(
    {
      ...from,
      hour: 0,
      minute: 0,
      second: 0
    },
    timezone
  )
  const exclusiveToDate = addCivilDays(to.year, to.month, to.day, 1)
  const toTimestamp = zonedDateTimeToUnixSeconds(
    {
      ...exclusiveToDate,
      hour: 0,
      minute: 0,
      second: 0
    },
    timezone
  )
  const params = new URLSearchParams({
    from: fromTimestamp.toString(),
    to: toTimestamp.toString()
  })

  if (timezone !== 'Asia/Kolkata') {
    params.set('timezone', timezone)
  }

  return `/admin/dashboard?${params.toString()}`
}

function getQuickFilters(timezone: string): QuickFilter[] {
  const today = getDateTimeParts(new Date(), timezone)
  const todayDate = {
    year: today.year,
    month: today.month,
    day: today.day
  }
  const yesterday = addCivilDays(today.year, today.month, today.day, -1)

  return [
    {
      label: 'Today',
      from: todayDate,
      to: todayDate
    },
    {
      label: 'Yesterday',
      from: yesterday,
      to: yesterday
    },
    {
      label: 'Last Week',
      from: addCivilDays(today.year, today.month, today.day, -6),
      to: todayDate
    },
    {
      label: 'Last Month',
      from: addCivilDays(today.year, today.month, today.day, -29),
      to: todayDate
    },
    {
      label: 'Last 3 months',
      from: addCivilDays(today.year, today.month, today.day, -89),
      to: todayDate
    },
    {
      label: 'Last 6 months',
      from: addCivilDays(today.year, today.month, today.day, -179),
      to: todayDate
    },
    {
      label: 'Last Year',
      from: addCivilDays(today.year, today.month, today.day, -364),
      to: todayDate
    }
  ]
}

function dateInputToUnixSeconds(value: string, timezone: string, boundary: 'start' | 'end') {
  const parsed = parseDateInput(value)

  if (!parsed) {
    return null
  }

  const date =
    boundary === 'end'
      ? addCivilDays(parsed.year, parsed.month, parsed.day, 1)
      : parsed

  return zonedDateTimeToUnixSeconds(
    {
      year: date.year,
      month: date.month,
      day: date.day,
      hour: 0,
      minute: 0,
      second: 0
    },
    timezone
  )
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

    if (timezone !== 'Asia/Kolkata') {
      params.set('timezone', timezone)
    }

    router.push(`/admin/dashboard?${params.toString()}`)
  }

  return (
    <SectionCard as="div" density="compact" className="bg-[var(--card-bg-strong)]">
      <div className="mb-4 flex flex-wrap gap-2">
        {quickFilters.map((filter) => {
          const isActive =
            fromDate === formatDateInputValue(filter.from) &&
            toDate === formatDateInputValue(filter.to)

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
