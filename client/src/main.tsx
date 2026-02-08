import { createRoot } from 'react-dom/client'
import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import NotFound from './routes/NotFound.tsx'
import OrdersPage from './routes/OrdersPage.tsx'
import { BRAND } from './config/brand'

// Initialize theme from localStorage or system preference
const storedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
const systemPrefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
const initialTheme: 'light' | 'dark' = storedTheme ?? (systemPrefersDark ? 'dark' : 'light')
localStorage.setItem('theme', initialTheme)
document.documentElement.dataset.theme = initialTheme

// Branding: Set page title and favicon to cafe brand
document.title = BRAND.name
const faviconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null
const favHref = BRAND.logoUrl as string
const ext = favHref.split('.').pop()?.toLowerCase()
const mime = ext === 'svg' ? 'image/svg+xml' : ext === 'png' ? 'image/png' : ext === 'ico' ? 'image/x-icon' : ext === 'webp' ? 'image/webp' : ''
if (faviconLink) {
  faviconLink.href = favHref
  if (mime) faviconLink.type = mime
} else {
  const link = document.createElement('link')
  link.rel = 'icon'
  link.href = favHref
  if (mime) link.type = mime
  document.head.appendChild(link)
}

const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/table/1" replace /> },
  { path: '/table/:tableId', element: <App /> },
  { path: '/table/:tableId/orders', element: <OrdersPage /> },
  { path: '*', element: <NotFound /> },
])

createRoot(document.getElementById('root')!).render(
  <ChakraProvider value={defaultSystem}>
    <RouterProvider router={router} />
  </ChakraProvider>
)
