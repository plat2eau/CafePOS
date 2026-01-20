import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import NotFound from './routes/NotFound.tsx'
import OrdersPage from './routes/OrdersPage.tsx'

// Initialize theme from localStorage (default: light)
const storedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
if (!storedTheme) {
  localStorage.setItem('theme', 'light')
  document.documentElement.dataset.theme = 'light'
} else {
  document.documentElement.dataset.theme = storedTheme
}

const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/table/1" replace /> },
  { path: '/table/:tableId', element: <App /> },
  { path: '/table/:tableId/orders', element: <OrdersPage /> },
  { path: '*', element: <NotFound /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChakraProvider value={defaultSystem}>
      <RouterProvider router={router} />
    </ChakraProvider>
  </StrictMode>,
)
