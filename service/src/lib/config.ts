export function parseTableIds(input: string | undefined) {
  const raw = (input || '').trim()
  if (!raw) return [] as string[]

  const ids = raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  if (ids.some(id => !/^[-_a-zA-Z0-9]+$/.test(id))) {
    throw new Error('TABLE_IDS must be a comma-separated list of non-empty ids (allowed: a-z A-Z 0-9 - _)')
  }

  return Array.from(new Set(ids)).sort((a, b) => a.localeCompare(b))
}
