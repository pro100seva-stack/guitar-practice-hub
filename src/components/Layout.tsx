import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'
import { supabase } from '../lib/supabase'

const navigationItems = [
  { label: 'Home', path: '/landing' },
  { label: 'Progress', path: '/progress' },
  { label: 'Plan', path: '/plan' },
  { label: 'Practice', path: '/practice' },
  { label: 'Stats', path: '/stats' },
  { label: 'Settings', path: '/settings' },
]

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const panelRef = useRef<HTMLDivElement | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!panelRef.current) return
      if (!panelRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  function handleBack() {
    if (location.key !== 'default') {
      navigate(-1)
      return
    }
    navigate('/landing')
  }

  const currentScreen = navigationItems.find((item) => item.path === location.pathname) ?? {
    label: 'Home',
    path: '/landing',
  }
  const isLandingScreen = location.pathname === '/landing'

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm">
        <div className="relative mx-auto max-w-6xl px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Open navigation menu"
                onClick={() => setMenuOpen((current) => !current)}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-xl text-slate-200 transition hover:border-slate-500 hover:text-white"
              >
                ☰
              </button>

              {!isLandingScreen && (
                <button
                  type="button"
                  aria-label="Go back"
                  onClick={handleBack}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-xl text-slate-200 transition hover:border-slate-500 hover:text-white"
                >
                  ←
                </button>
              )}
            </div>

            <div className="min-w-0 flex-1 text-center">
              <p className="truncate text-[10px] uppercase tracking-[0.25em] text-slate-400">
                {isLandingScreen ? 'Guitar Practice Hub' : 'Current screen'}
              </p>
              {!isLandingScreen && <p className="text-sm font-medium text-slate-200">{currentScreen.label}</p>}
            </div>

            {isLandingScreen && (
              <button
                type="button"
                onClick={() => void supabase.auth.signOut()}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-500 hover:text-white"
              >
                Sign out
              </button>
            )}
          </div>

          {menuOpen && (
            <div ref={panelRef} className="absolute left-4 top-16 z-40 w-[min(18rem,calc(100%-2rem))] overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-2xl shadow-slate-950/50">
              <div className="border-b border-slate-800 bg-slate-900/80 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                Navigation
              </div>

              <nav aria-label="App navigation" className="py-1">
                {navigationItems.map((item) => {
                  const isActive = location.pathname === item.path
                  return (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => {
                        setMenuOpen(false)
                        navigate(item.path)
                      }}
                      aria-current={isActive ? 'page' : undefined}
                      className={[
                        'flex w-full items-center justify-between border-y border-transparent px-3 py-3 text-left text-sm transition',
                        isActive ? 'border-y border-sky-500/60 bg-slate-800/80 text-sky-200' : 'text-slate-300 hover:bg-slate-900 hover:text-white',
                      ].join(' ')}
                    >
                      <span>{item.label}</span>
                      {isActive ? <span className="text-sky-300">●</span> : null}
                    </button>
                  )
                })}
              </nav>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto min-h-[calc(100vh-73px)] max-w-6xl p-4"><Outlet key={location.pathname} /></main>
    </div>
  )
}