import { IconButton, Box } from '@chakra-ui/react'
import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [mode, setMode] = useState<'light' | 'dark'>(() => {
    const m = (localStorage.getItem('theme') as 'light' | 'dark' | null) ?? 'light'
    return m
  })

  useEffect(() => {
    document.documentElement.dataset.theme = mode
    localStorage.setItem('theme', mode)
  }, [mode])

  const toggle = () => setMode(prev => (prev === 'light' ? 'dark' : 'light'))

  const isLight = mode === 'light'
  const icon = isLight ? '☀️' : '🌙'
  const iconColor = isLight ? '#f6c343' : '#cbd5e1'

  return (
    <IconButton
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      variant="ghost"
      size="sm"
      onClick={toggle}
      _hover={{ bg: 'transparent' }}
      _active={{ bg: 'transparent' }}
    >
      <Box as="span" fontSize="lg" color={iconColor} lineHeight={1}>
        {icon}
      </Box>
    </IconButton>
  )
}
