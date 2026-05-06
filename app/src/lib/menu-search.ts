type SearchableMenuItem = {
  name: string
  description: string | null
  category_id: string
  sort_order: number
}

type RankedMenuItem<TItem> = {
  item: TItem
  score: number
}

function normalizeMenuSearchValue(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function splitMenuSearchTerms(value: string) {
  return normalizeMenuSearchValue(value).split(' ').filter(Boolean)
}

function levenshteinDistance(left: string, right: string) {
  if (left === right) return 0
  if (!left.length) return right.length
  if (!right.length) return left.length

  const costs = Array.from({ length: right.length + 1 }, (_, index) => index)

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let previousDiagonal = costs[0]
    costs[0] = leftIndex

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const nextDiagonal = costs[rightIndex]
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1

      costs[rightIndex] = Math.min(
        costs[rightIndex] + 1,
        costs[rightIndex - 1] + 1,
        previousDiagonal + substitutionCost
      )

      previousDiagonal = nextDiagonal
    }
  }

  return costs[right.length]
}

function getTermMatchScore(term: string, value: string, tokens: string[]) {
  if (!value) return null

  if (value === term) return 140
  if (tokens.includes(term)) return 120
  if (tokens.some((token) => token.startsWith(term))) return 90
  if (value.startsWith(term)) return 72
  if (value.includes(term)) return 54

  if (
    term.length >= 4 &&
    tokens.some((token) => {
      if (Math.abs(token.length - term.length) > 1) {
        return false
      }

      return levenshteinDistance(token, term) <= 1
    })
  ) {
    return 26
  }

  return null
}

export function searchMenuItems<TItem extends SearchableMenuItem>(
  items: TItem[],
  query: string,
  categoryNameById: Map<string, string>
): TItem[] {
  const normalizedQuery = normalizeMenuSearchValue(query)

  if (!normalizedQuery) {
    return items
  }

  const terms = splitMenuSearchTerms(query)

  const rankedItems = items.flatMap<RankedMenuItem<TItem>>((item) => {
    const normalizedName = normalizeMenuSearchValue(item.name)
    const normalizedDescription = normalizeMenuSearchValue(item.description ?? '')
    const normalizedCategory = normalizeMenuSearchValue(categoryNameById.get(item.category_id) ?? '')
    const nameTokens = splitMenuSearchTerms(item.name)
    const descriptionTokens = splitMenuSearchTerms(item.description ?? '')
    const categoryTokens = splitMenuSearchTerms(categoryNameById.get(item.category_id) ?? '')

    let score = normalizedName.includes(normalizedQuery) ? 160 : 0

    for (const term of terms) {
      const nameScore = getTermMatchScore(term, normalizedName, nameTokens)
      const categoryScore = getTermMatchScore(term, normalizedCategory, categoryTokens)
      const descriptionScore = getTermMatchScore(term, normalizedDescription, descriptionTokens)
      const bestTermScore = Math.max(nameScore ?? 0, categoryScore ?? 0, descriptionScore ?? 0)

      if (bestTermScore === 0) {
        return []
      }

      score += bestTermScore

      if (nameScore !== null && nameScore === bestTermScore) {
        score += 24
      } else if (categoryScore !== null && categoryScore === bestTermScore) {
        score += 10
      }
    }

    return [
      {
        item,
        score
      }
    ]
  })

  rankedItems.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score
    }

    if (left.item.sort_order !== right.item.sort_order) {
      return left.item.sort_order - right.item.sort_order
    }

    return left.item.name.localeCompare(right.item.name)
  })

  return rankedItems.map(({ item }) => item)
}
