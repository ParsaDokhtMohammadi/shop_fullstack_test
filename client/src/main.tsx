import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router/dom'
import { queryClient } from './app/query-client'
import { router } from './app/router'
import { GuestCartProvider } from './features/cart/GuestCartProvider'
import './styles/index.css'

const container = document.getElementById('root')
if (!container) throw new Error('Root element #root was not found in index.html')

createRoot(container).render(
  <StrictMode>
    {/* QueryClientProvider is outermost: the guest cart provider does not need
        it, but every page inside the router does. */}
    <QueryClientProvider client={queryClient}>
      <GuestCartProvider>
        <RouterProvider router={router} />
      </GuestCartProvider>
    </QueryClientProvider>
  </StrictMode>,
)
