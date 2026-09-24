import { createBrowserRouter, Navigate } from 'react-router'
import Layout from './components/Layout'

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Navigate to="/landing" replace /> },
      { path: '/landing', lazy: async () => ({ Component: (await import('./pages/Landing')).default }) },
      { path: '/progress', lazy: async () => ({ Component: (await import('./pages/Progress')).default }) },
      { path: '/plan', lazy: async () => ({ Component: (await import('./pages/Plan')).default }) },
      { path: '/practice', lazy: async () => ({ Component: (await import('./pages/Sessions')).default }) },
      { path: '/sessions', element: <Navigate to="/practice" replace /> },
      { path: '/stats', lazy: async () => ({ Component: (await import('./pages/Stats')).default }) },
      { path: '/settings', lazy: async () => ({ Component: (await import('./pages/Settings')).default }) },
    ],
  },
])