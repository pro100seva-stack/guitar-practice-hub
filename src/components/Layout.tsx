import { Outlet, useLocation } from 'react-router'
import { supabase } from '../lib/supabase'

export default function Layout() {
  const location = useLocation()

  const navigationItems = [
    { label: 'Sessions', path: '/' },
    { label: 'Plan', path: '/plan' },
    { label: 'Stats', path: '/stats' },
  ]

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <nav aria-label="Primary navigation" className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900 px-4 py-3">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium">
          {navigationItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <a
                key={item.path}
                href={item.path}
                aria-current={isActive ? 'page' : undefined}
                className={isActive ? 'text-sky-300 transition hover:text-sky-200' : 'text-slate-400 transition hover:text-white'}
              >
                {item.label}
              </a>
            )
          })}
        </div>
        <button onClick={() => supabase.auth.signOut()} className="text-sm text-slate-400 transition hover:text-slate-200">
          Sign out
        </button>
      </nav>
      <main className="p-4"><Outlet key={location.pathname} /></main>
    </div>
  )
}