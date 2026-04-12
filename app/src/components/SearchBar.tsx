'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type SearchBarProps = {
  value: string
  onChange: (nextValue: string) => void
  label?: string
  placeholder?: string
  summary?: string
  className?: string
}

export default function SearchBar({
  value,
  onChange,
  label = 'Search',
  placeholder = 'Search',
  summary,
  className = ''
}: SearchBarProps) {
  const inputId = `search-bar-${label.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <div className={cn('searchBarShell', className)}>
      <div className="searchBarField">
        <Label className="searchBarLabel" htmlFor={inputId}>
          {label}
        </Label>
        <div className="searchBarInputWrap">
          <Input
            id={inputId}
            className="searchBarInput border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
            type="search"
            inputMode="search"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
          />
        </div>
      </div>

      {summary ? <p className="searchBarSummary">{summary}</p> : null}
    </div>
  )
}
