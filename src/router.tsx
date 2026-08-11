import { createBrowserRouter } from 'react-router'
import Layout from './components/Layout'
import Sessions from './pages/Sessions'
import Plan from './pages/Plan'
import Stats from './pages/Stats'

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Sessions /> },
      { path: '/plan', element: <Plan /> },
      { path: '/stats', element: <Stats /> },
    ],
  },
])