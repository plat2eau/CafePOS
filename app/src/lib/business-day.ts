export type DateTimeParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

export type DateOnlyParts = Pick<DateTimeParts, 'year' | 'month' | 'day'>

export const businessDayStartHour = 7
export const defaultBusinessTimezone = 'Asia/Kolkata'

const formatterCache = new Map<string, Intl.DateTimeFormat>()

export function normalizeBusinessTimezone(timezone?: string | null) {
  const candidate = timezone?.trim() || defaultBusinessTimezone

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: candidate }).format(new Date())
    return candidate
  } catch {
    return defaultBusinessTimezone
  }
}

function getPartsFormatter(timezone: string) {
  const key = `parts:${timezone}`

  if (!formatterCache.has(key)) {
    formatterCache.set(
      key,
      new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23'
      })
    )
  }

  return formatterCache.get(key)!
}

export function getDateLabelFormatter(timezone: string) {
  const key = `label:${timezone}`

  if (!formatterCache.has(key)) {
    formatterCache.set(
      key,
      new Intl.DateTimeFormat('en-IN', {
        timeZone: timezone,
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    )
  }

  return formatterCache.get(key)!
}

export function getDateTimeParts(date: Date, timezone: string): DateTimeParts {
  const parts = getPartsFormatter(timezone).formatToParts(date)
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

export function zonedDateTimeToUtc(parts: DateTimeParts, timezone: string) {
  const utcGuess = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
  )
  const offset = getTimeZoneOffsetMs(utcGuess, timezone)

  return new Date(utcGuess.getTime() - offset)
}

export function zonedDateTimeToUnixSeconds(parts: DateTimeParts, timezone: string) {
  return Math.floor(zonedDateTimeToUtc(parts, timezone).getTime() / 1000)
}

export function addCivilDays(year: number, month: number, day: number, days: number) {
  const next = new Date(Date.UTC(year, month - 1, day + days))

  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate()
  }
}

function padDatePart(value: number) {
  return value.toString().padStart(2, '0')
}

export function formatDateKey(parts: DateOnlyParts) {
  return `${parts.year}-${padDatePart(parts.month)}-${padDatePart(parts.day)}`
}

export function parseDateKey(value: string) {
  const [year, month, day] = value.split('-').map((part) => Number.parseInt(part, 10))

  if (!year || !month || !day) {
    return null
  }

  return { year, month, day }
}

export function getBusinessDateParts(date: Date, timezone: string): DateOnlyParts {
  const parts = getDateTimeParts(date, timezone)

  if (parts.hour < businessDayStartHour) {
    return addCivilDays(parts.year, parts.month, parts.day, -1)
  }

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day
  }
}

export function getBusinessDateKey(date: Date, timezone: string) {
  return formatDateKey(getBusinessDateParts(date, timezone))
}

export function businessDateToRange(parts: DateOnlyParts, timezone: string) {
  const next = addCivilDays(parts.year, parts.month, parts.day, 1)
  const startAt = zonedDateTimeToUtc(
    {
      ...parts,
      hour: businessDayStartHour,
      minute: 0,
      second: 0
    },
    timezone
  )
  const endAt = zonedDateTimeToUtc(
    {
      ...next,
      hour: businessDayStartHour,
      minute: 0,
      second: 0
    },
    timezone
  )

  return { startAt, endAt }
}

export function businessDateRangeToUnixSeconds(from: DateOnlyParts, to: DateOnlyParts, timezone: string) {
  const { startAt } = businessDateToRange(from, timezone)
  const { endAt } = businessDateToRange(to, timezone)

  return {
    fromTimestamp: Math.floor(startAt.getTime() / 1000),
    toTimestamp: Math.floor(endAt.getTime() / 1000)
  }
}

export function getBusinessDateLabel(dateKey: string, timezone: string) {
  const parsed = parseDateKey(dateKey)

  if (!parsed) {
    return dateKey
  }

  const labelDate = zonedDateTimeToUtc(
    {
      ...parsed,
      hour: 12,
      minute: 0,
      second: 0
    },
    timezone
  )

  return getDateLabelFormatter(timezone).format(labelDate)
}
