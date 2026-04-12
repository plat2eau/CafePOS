'use client'

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
    <div className={`searchBarShell${className ? ` ${className}` : ''}`}>
      <div className="searchBarField">
        <label className="searchBarLabel" htmlFor={inputId}>
          {label}
        </label>
        <div className="searchBarInputWrap">
          <input
            id={inputId}
            className="searchBarInput"
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
