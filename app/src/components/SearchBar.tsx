'use client'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

type SearchBarProps = {
  value: string
  onChange: (nextValue: string) => void
  label?: string
  placeholder?: string
  summary?: string
  className?: string
  children?: ReactNode
}

export default function SearchBar({
  value,
  onChange,
  label = 'Search',
  placeholder = 'Search',
  summary,
  className = '',
  children
}: SearchBarProps) {
  const inputId = `search-bar-${label.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <div className={cn('searchBarShell', className)}>
      <div className="searchBarField">
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
      {children ? <div className="searchBarExtras">{children}</div> : null}
    </div>
  )
}
