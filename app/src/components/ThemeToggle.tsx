'use client'

import { useEffect, useState } from 'react'
import {
  colorSchemeStorageKey,
  defaultColorScheme,
  type ColorSchemeId
} from '@/lib/color-schemes'

function applyColorScheme(nextScheme: ColorSchemeId) {
  document.documentElement.dataset.colorScheme = nextScheme
  window.localStorage.setItem(colorSchemeStorageKey, nextScheme)
}

export default function ThemeToggle() {
  const [selectedScheme, setSelectedScheme] = useState<ColorSchemeId>(defaultColorScheme)

  useEffect(() => {
    const activeScheme =
      (document.documentElement.dataset.colorScheme as ColorSchemeId | undefined) ??
      defaultColorScheme

    setSelectedScheme(activeScheme)
  }, [])

  const isDarkMode = selectedScheme === 'dark'

  return (
    <button
      type="button"
      className="themeToggle"
      onClick={() => {
        const nextScheme: ColorSchemeId = isDarkMode ? 'light' : 'dark'
        setSelectedScheme(nextScheme)
        applyColorScheme(nextScheme)
      }}
      aria-pressed={isDarkMode}
      aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
      title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span className="themeToggleIcon" aria-hidden="true">
        {isDarkMode ? '🌚' : '☀️'}
      </span>
    </button>
  )
}
