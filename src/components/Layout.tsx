import { useEffect, useMemo, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'
import { supabase } from '../lib/supabase'
import { useI18n } from '../lib/i18n'
import TourOverlay from './tour/TourOverlay'
import { useScreenTour } from './tour/useScreenTour'
import { HeaderSlotsContext } from './headerSlots'

const navigationItems = [
  { key: 'Home', path: '/landing' }, { key: 'Progress', path: '/progress' }, { key: 'Plan', path: '/plan' },
  { key: 'Practice', path: '/practice' }, { key: 'Stats', path: '/stats' }, { key: 'Settings', path: '/settings' },
]

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const panelRef = useRef<HTMLDivElement | null>(null)
  const menuButtonRef = useRef<HTMLButtonElement | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [actionsSlot, setActionsSlot] = useState<HTMLElement | null>(null)
  const [panelSlot, setPanelSlot] = useState<HTMLElement | null>(null)
  const headerSlots = useMemo(() => ({ actions: actionsSlot, panel: panelSlot }), [actionsSlot, panelSlot])
  const { t } = useI18n()
  const tour = useScreenTour(location.pathname)

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!panelRef.current) return
      const target = event.target as Node
      if (!panelRef.current.contains(target) && !menuButtonRef.current?.contains(target)) {
        setMenuOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape' || !panelRef.current) return
      setMenuOpen(false)
      menuButtonRef.current?.focus()
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  function handleBack() {
    if (location.key !== 'default') {
      navigate(-1)
      return
    }
    navigate('/landing')
  }

  const currentScreen = navigationItems.find((item) => item.path === location.pathname) ?? {
    key: 'Home',
    path: '/landing',
  }
  const isLandingScreen = location.pathname === '/landing'
  const isPracticeScreen = location.pathname === '/practice'

  return (
    <HeaderSlotsContext.Provider value={headerSlots}>
    <div className="min-h-dvh bg-slate-900 text-slate-100">
      <header className="fixed inset-x-0 top-0 z-30 border-b border-slate-800 bg-slate-900/95 pt-[env(safe-area-inset-top)] backdrop-blur-sm">
        <div className="relative mx-auto max-w-6xl px-[var(--page-px)] py-3">
          <div className="grid grid-cols-[5.75rem_minmax(0,1fr)_5.75rem] items-center gap-1 sm:grid-cols-[8rem_minmax(0,1fr)_8rem]">
            <div className="flex items-center gap-1">
              <button
                ref={menuButtonRef}
                type="button"
                data-tour="menu"
                aria-label={t('Open navigation menu')}
                onClick={() => setMenuOpen((current) => !current)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-xl text-slate-200 transition hover:border-slate-500 hover:text-white"
              >
                ☰
              </button>

              {!isLandingScreen && (
                <button
                  type="button"
                  aria-label={t('Go back')}
                  onClick={handleBack}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-xl text-slate-200 transition hover:border-slate-500 hover:text-white"
                >
                  ←
                </button>
              )}
            </div>

            <div className="min-w-0 text-center">
              <p className={['truncate text-xs uppercase tracking-wider text-slate-400', isLandingScreen ? '' : 'max-[359px]:hidden'].join(' ')}>
                {isLandingScreen ? t('Guitar Practice Hub') : t('Current screen')}
              </p>
              {!isLandingScreen && <p className="truncate text-base font-semibold text-slate-200 max-[359px]:text-sm">{t(currentScreen.key)}</p>}
            </div>

            <div className="flex min-w-0 justify-end">
              {isPracticeScreen && <div ref={setActionsSlot} data-tour="practice-tools" className="flex items-center gap-1" />}
              {isLandingScreen && (
                <button
                  type="button"
                  aria-label={t('Sign out')}
                  title={t('Sign out')}
                  onClick={() => void supabase.auth.signOut()}
                  className="flex h-11 w-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-950 text-xs font-medium text-slate-300 transition hover:border-slate-500 hover:text-white sm:w-auto sm:px-3"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                  </svg>
                  <span className="hidden whitespace-nowrap sm:inline">{t('Sign out')}</span>
                </button>
              )}

              {location.pathname === '/progress' && (
                <button
                  type="button"
                  data-tour="stats-link"
                  onClick={() => navigate('/stats')}
                  className="btn btn-secondary min-w-0 truncate rounded-lg px-1.5 text-xs"
                >
                  {t('Stats')}
                </button>
              )}
            </div>
          </div>

          {menuOpen && (
            <div ref={panelRef} className="absolute left-4 top-16 z-40 w-[min(18rem,calc(100%-2rem))] overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-2xl shadow-slate-950/50">
              <div className="border-b border-slate-800 bg-slate-900/80 px-3 py-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                {t('Navigation')}
              </div>

              <nav aria-label={t('App navigation')} className="py-1">
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
                      <span>{t(item.key)}</span>
                      {isActive ? <span className="text-sky-300">●</span> : null}
                    </button>
                  )
                })}
              </nav>
            </div>
          )}
        </div>
        {isPracticeScreen && <div ref={setPanelSlot} className="absolute inset-x-0 top-full" />}
      </header>

      <main className="mx-auto flex min-h-dvh max-w-6xl flex-col px-[var(--page-px)] pb-[max(1rem,env(safe-area-inset-bottom))] pt-[calc(var(--app-header-h)+1rem)]">
        <div className={isLandingScreen ? 'flex flex-1 flex-col' : 'flex-1'}><Outlet key={location.pathname} /></div>
        {tour.canReplay && (
          <footer className="section mt-6 flex justify-center">
            <button
              type="button"
              hidden={tour.isOpen}
              title={t('Guided tour')}
              onClick={tour.replay}
              className="btn btn-secondary rounded-lg text-xs"
            >
              {t('Help')}
            </button>
          </footer>
        )}
      </main>

      {tour.isOpen && <TourOverlay steps={tour.steps} index={tour.index} mode={tour.mode} onIndex={tour.goTo} onClose={tour.close} onSkip={tour.skip} />}
    </div>
    </HeaderSlotsContext.Provider>
  )
}