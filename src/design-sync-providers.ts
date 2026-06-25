import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

export { QueryClientProvider, MemoryRouter }
export const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
