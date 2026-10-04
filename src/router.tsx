import { createBrowserRouter, Navigate } from 'react-router'
import Layout from './components/Layout'
import RouteErrorFallback from './components/RouteErrorFallback'
import { lazyPageReadyHandle } from './lib/lazyChunkRecovery'

export const router = createBrowserRouter([
  {
    element: <Layout />,
    errorElement: <RouteErrorFallback />,
    children: [
      { path: '/', element: <Navigate to="/landing" replace /> },
      { path: '/landing', lazy: async () => ({ Component: (await import('./pages/Landing')).default, handle: lazyPageReadyHandle }) },
      { path: '/progress', lazy: async () => ({ Component: (await import('./pages/Progress')).default, handle: lazyPageReadyHandle }) },
      { path: '/plan', lazy: async () => ({ Component: (await import('./pages/Plan')).default, handle: lazyPageReadyHandle }) },
      { path: '/practice', lazy: async () => ({ Component: (await import('./pages/Sessions')).default, handle: lazyPageReadyHandle }) },
      { path: '/sessions', element: <Navigate to="/practice" replace /> },
      { path: '/stats', lazy: async () => ({ Component: (await import('./pages/Stats')).default, handle: lazyPageReadyHandle }) },
      { path: '/settings', lazy: async () => ({ Component: (await import('./pages/Settings')).default, handle: lazyPageReadyHandle }) },
    ],
  },
])
