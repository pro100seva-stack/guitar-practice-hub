import { createBrowserRouter, Navigate } from 'react-router'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Progress from './pages/Progress'
import Settings from './pages/Settings'
import Sessions from './pages/Sessions'
import Plan from './pages/Plan'
import Stats from './pages/Stats'

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Navigate to="/landing" replace /> },
      { path: '/landing', element: <Landing /> },
      { path: '/progress', element: <Progress /> },
      { path: '/plan', element: <Plan /> },
      { path: '/practice', element: <Sessions /> },
      { path: '/sessions', element: <Navigate to="/practice" replace /> },
      { path: '/stats', element: <Stats /> },
      { path: '/settings', element: <Settings /> },
    ],
  },
])