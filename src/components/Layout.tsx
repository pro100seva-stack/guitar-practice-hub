import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Outlet, useLocation, useMatches, useNavigate, useNavigation } from 'react-router'
import { captureLocalMaterialAccess, isLocalMaterialAccessCurrent, onLocalMaterialInvalidation, signOutLocalMaterialIdentity } from '../lib/localMaterialAccess'
import { useI18n } from '../lib/i18n'
import TourOverlay from './tour/TourOverlay'
import { useScreenTour } from './tour/useScreenTour'
import { HeaderSlotsContext } from './headerSlots'
import { isRenderedLazyPageReady, lazyChunkRecovery } from '../lib/lazyChunkRecovery'
import { versionLabel } from '../lib/buildInfo'

const navigationItems = [
  { key: 'Home', path: '/landing' }, { key: 'Progress', path: '/progress' }, { key: 'Plan', path: '/plan' },
  { key: 'Practice', path: '/practice' }, { key: 'Stats', path: '/stats' }, { key: 'Settings', path: '/settings' },
]

export default function Layout() {
  const location = useLocation()
  const isLandingScreen = location.pathname === '/landing'
  const isPracticeScreen = location.pathname === '/practice'
  const navigate = useNavigate()
  const matches = useMatches()
  const navigation = useNavigation()
  const pageHandle = matches.at(-1)?.handle
  const panelRef = useRef<HTMLDivElement | null>(null)
  const layoutRef = useRef<HTMLDivElement | null>(null)
  const menuButtonRef = useRef<HTMLButtonElement | null>(null)
  const headerRef = useRef<HTMLElement | null>(null)
  const leadingControlsRef = useRef<HTMLDivElement | null>(null)
  const trailingControlsRef = useRef<HTMLDivElement | null>(null)
  const mainRef = useRef<HTMLElement | null>(null)
  const focusedPathRef = useRef<string | null>(location.pathname)
  const [menuOpen, setMenuOpen] = useState(false)
  const [actionsSlot, setActionsSlot] = useState<HTMLElement | null>(null)
  const [panelSlot, setPanelSlot] = useState<HTMLElement | null>(null)
  const headerSlots = useMemo(() => ({ actions: actionsSlot, panel: panelSlot }), [actionsSlot, panelSlot])
  const { t } = useI18n()
  const tour = useScreenTour(location.pathname)

  useEffect(() => {
    const header = headerRef.current
    if (!header) return
    const updateHeight = () => {
      layoutRef.current?.style.setProperty('--app-header-h', `${header.getBoundingClientRect().height}px`)
      const sideWidth = Math.max(leadingControlsRef.current?.getBoundingClientRect().width ?? 0, trailingControlsRef.current?.getBoundingClientRect().width ?? 0)
      layoutRef.current?.style.setProperty('--app-header-side-width', `${sideWidth}px`)
    }
    const observer = new ResizeObserver(updateHeight)
    observer.observe(header)
    if (leadingControlsRef.current) observer.observe(leadingControlsRef.current)
    if (trailingControlsRef.current) observer.observe(trailingControlsRef.current)
    updateHeight()
    return () => observer.disconnect()
  }, [])

  useLayoutEffect(() => {
    if (!isLandingScreen) return
    const html = document.documentElement
    const body = document.body
    const scrollPosition = { left: window.scrollX, top: window.scrollY }
    function preserveProperties(style: CSSStyleDeclaration, names: string[]) {
      const properties = names.map((name) => ({ name, value: style.getPropertyValue(name), priority: style.getPropertyPriority(name) }))
      return () => properties.forEach(({ name, value, priority }) => {
        if (value) style.setProperty(name, value, priority)
        else style.removeProperty(name)
      })
    }
    const restoreHtml = preserveProperties(html.style, ['overflow', 'height', 'overscroll-behavior'])
    const restoreBody = preserveProperties(body.style, ['position', 'top', 'left', 'right', 'width', 'height', 'overflow', 'overscroll-behavior'])
    window.scrollTo({ left: 0, top: 0, behavior: 'instant' })
    Object.assign(html.style, { overflow: 'hidden', height: '100%', overscrollBehavior: 'none' })
    Object.assign(body.style, { position: 'fixed', top: '0', left: '0', right: '0', width: '100%', height: '100%', overflow: 'hidden', overscrollBehavior: 'none' })
    return () => {
      restoreHtml()
      restoreBody()
      window.scrollTo({ ...scrollPosition, behavior: 'instant' })
    }
  }, [isLandingScreen])

  useEffect(() => {
    const screen = navigationItems.find((item) => item.path === location.pathname)
    document.title = `${t(screen?.key ?? 'Home')} · ${t('Pro100Practice')}`
    if (navigation.state !== 'idle' || !isRenderedLazyPageReady(pageHandle, navigation.state) || focusedPathRef.current === location.pathname) return
    const main = mainRef.current
    if (!main) return
    const focusHeading = () => {
      if (focusedPathRef.current === location.pathname) return
      const heading = main.querySelector<HTMLElement>('h1')
      if (!heading) return
      if (document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]')) {
        focusedPathRef.current = location.pathname
        return
      }
      heading.tabIndex = -1
      heading.focus({ preventScroll: true })
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
      focusedPathRef.current = location.pathname
    }
    focusHeading()
    const observer = new MutationObserver(focusHeading)
    observer.observe(main, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [location.pathname, navigation.state, pageHandle, t])

  useEffect(() => {
    const access = captureLocalMaterialAccess()
    return onLocalMaterialInvalidation(() => {
      if (isLocalMaterialAccessCurrent(access)) return
      layoutRef.current?.querySelectorAll('video, audio').forEach((element) => {
        const media = element as HTMLMediaElement
        media.pause()
        media.removeAttribute('src')
        media.load()
      })
      layoutRef.current?.querySelectorAll('iframe').forEach((frame) => frame.removeAttribute('src'))
      if (layoutRef.current) layoutRef.current.hidden = true
    })
  }, [])

  useEffect(() => {
    if (isRenderedLazyPageReady(pageHandle, navigation.state)) lazyChunkRecovery.markRouteReady()
  }, [pageHandle, navigation.state])

  useEffect(() => {
    if (tour.isOpen) setMenuOpen(false)
  }, [tour.isOpen])

  useEffect(() => {
    if (menuOpen) panelRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
  }, [menuOpen])

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

  return (
    <HeaderSlotsContext.Provider value={headerSlots}>
    <div ref={layoutRef} className={isLandingScreen ? 'app-home min-h-dvh text-slate-100' : 'min-h-dvh bg-slate-900 text-slate-100'}>
      <a href="#main-content" onClick={() => mainRef.current?.focus()} className="skip-link">{t('ux.skipContent')}</a>
      <header ref={headerRef} className={isLandingScreen ? 'home-header fixed inset-x-0 top-0 z-30 pt-[env(safe-area-inset-top)]' : 'fixed inset-x-0 top-0 z-30 border-b border-slate-800 bg-slate-900/95 pt-[env(safe-area-inset-top)] backdrop-blur-sm'}>
        <div className={isLandingScreen ? 'home-header-inner relative' : 'relative mx-auto max-w-6xl px-[var(--page-px)] py-3'}>
          <div className={isLandingScreen ? 'home-header-grid' : isPracticeScreen ? 'app-header-grid app-header-practice' : 'app-header-grid'}>
            <div ref={leadingControlsRef} className="app-header-leading flex shrink-0 items-center gap-1">
              <button
                ref={menuButtonRef}
                type="button"
                data-tour="menu"
                aria-label={t('Open navigation menu')}
                aria-expanded={menuOpen}
                aria-controls="app-navigation"
                onClick={() => setMenuOpen((current) => !current)}
                className={isLandingScreen ? 'home-wood home-header-button' : 'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-xl text-slate-200 transition hover:border-slate-500 hover:text-white'}
              >
                {isLandingScreen ? <svg aria-hidden="true" viewBox="0 0 32 32" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round"><path d="M4 7h24M4 16h24M4 25h24" /></svg> : '☰'}
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

            <div className="app-header-title min-w-0 text-center">
              <p className={isLandingScreen ? 'home-brand' : 'hidden text-xs uppercase tracking-wider text-slate-400'}>
                {isLandingScreen ? t('Pro100Practice') : t('Current screen')}
              </p>
              {!isLandingScreen && <p className="text-base font-semibold text-slate-200">{t(currentScreen.key)}</p>}
            </div>

            <div ref={trailingControlsRef} className={isPracticeScreen ? 'app-header-trailing app-header-tools flex min-w-0 justify-end' : 'app-header-trailing flex min-w-0 justify-end'}>
              {isPracticeScreen && <div ref={setActionsSlot} data-tour="practice-tools" className="flex items-center justify-end gap-1" />}
              {isLandingScreen && (
                <button
                  type="button"
                  aria-label={t('Sign out')}
                  title={t('Sign out')}
                  onClick={() => void signOutLocalMaterialIdentity()}
                  className="home-wood home-header-button"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                  </svg>
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
            <div ref={panelRef} id="app-navigation" className={isLandingScreen ? 'home-menu absolute left-4 top-full z-40 max-h-[70dvh] w-[min(18rem,calc(100%-2rem))] overflow-y-auto' : 'absolute left-4 top-full z-40 max-h-[70dvh] w-[min(18rem,calc(100%-2rem))] overflow-y-auto rounded-xl border border-slate-700 bg-slate-950 shadow-2xl shadow-slate-950/50'}>
              <div className={isLandingScreen ? 'home-menu-heading' : 'border-b border-slate-800 bg-slate-900/80 px-3 py-2 text-xs uppercase tracking-[0.2em] text-slate-400'}>
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
                        if (location.pathname === item.path) menuButtonRef.current?.focus()
                        else navigate(item.path)
                      }}
                      aria-current={isActive ? 'page' : undefined}
                      className={isLandingScreen ? `home-menu-item${isActive ? ' is-active' : ''}` : [
                        'flex w-full items-center justify-between border-y border-transparent px-3 py-3 text-left text-sm transition',
                        isActive ? 'border-y border-sky-500/60 bg-slate-800/80 text-sky-200' : 'text-slate-300 hover:bg-slate-900 hover:text-white',
                      ].join(' ')}
                    >
                      <span>{t(item.key)}</span>
                      {isActive ? <span className={isLandingScreen ? 'home-menu-current' : 'text-sky-300'}>●</span> : null}
                    </button>
                  )
                })}
              </nav>
            </div>
          )}
        </div>
        {isPracticeScreen && <div ref={setPanelSlot} className="absolute inset-x-0 top-full" />}
      </header>

      <main ref={mainRef} id="main-content" tabIndex={-1} className={isLandingScreen ? 'home-main' : 'mx-auto flex min-h-dvh max-w-6xl flex-col px-[var(--page-px)] pb-[max(1rem,env(safe-area-inset-bottom))] pt-[calc(var(--app-header-h)+1rem)]'}>
        <div className={isLandingScreen ? 'home-outlet' : 'flex-1'}><Outlet key={location.pathname} /></div>
        {tour.canReplay && (
          <footer className={isLandingScreen ? 'home-footer' : 'section mt-6 flex justify-center'}>
            <button
              type="button"
              data-tour="help"
              disabled={tour.isOpen}
              title={t('Guided tour')}
              onClick={() => { if (!tour.isOpen) tour.replay() }}
              className={isLandingScreen ? 'home-wood home-help' : 'btn btn-secondary rounded-lg text-xs'}
            >
              {t('Help')}
            </button>
          </footer>
        )}
        {isLandingScreen && <p translate="no" className="home-version">{versionLabel}</p>}
      </main>

      {tour.isOpen && <TourOverlay steps={tour.steps} index={tour.index} mode={tour.mode} onIndex={tour.goTo} onClose={tour.close} onSkip={tour.skip} isHome={isLandingScreen} />}
    </div>
    </HeaderSlotsContext.Provider>
  )
}
