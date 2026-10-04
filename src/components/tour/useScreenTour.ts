import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { fallbackStep, tourSteps, type TourStep } from './tourSteps'

export type TourMode = 'onboarding' | 'replay'
type ActiveTour = { path: string; mode: TourMode; targets: string[]; index: number }

const ANCHOR_TIMEOUT_MS = 4000
const PARTIAL_ANCHOR_TIMEOUT_MS = 1500
const doneKey = (userId: string) => `tour-flag-cleared:${userId}`

async function clearPendingFlag(userId: string) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { error } = await supabase.from('app_settings').update({ onboarding_tour_pending: false }).eq('user_id', userId)
      if (!error) return
    } catch {
      // Retry once, then fall back to the session flag.
    }
  }
  try {
    sessionStorage.setItem(doneKey(userId), '1')
  } catch {
    // Storage unavailable: the tour may rerun on reload.
  }
}

function clearedThisSession(userId: string) {
  try {
    return sessionStorage.getItem(doneKey(userId)) === '1'
  } catch {
    return false
  }
}

export function resolveTargets(path: string, isCurrent = () => true) {
  const targets = (tourSteps[path] ?? []).map((step) => step.target)
  return new Promise<string[]>((resolve) => {
    const deadline = Date.now() + ANCHOR_TIMEOUT_MS
    let firstFoundAt: number | null = null
    let allFound = false
    const check = () => {
      if (!isCurrent()) { resolve([]); return }
      const found = targets.filter((target) => {
        const rect = document.querySelector(target)?.getBoundingClientRect()
        return rect && rect.width > 0 && rect.height > 0
      })
      if (found.length > 0 && firstFoundAt === null) firstFoundAt = Date.now()
      const complete = found.length === targets.length
      if ((complete && allFound) || Date.now() >= deadline || (firstFoundAt !== null && Date.now() - firstFoundAt >= PARTIAL_ANCHOR_TIMEOUT_MS)) resolve(found)
      else window.setTimeout(check, 100)
      allFound = complete
    }
    check()
  })
}

export function useScreenTour(pathname: string) {
  const [active, setActive] = useState<ActiveTour | null>(null)
  const [onboarding, setOnboarding] = useState(false)
  const flagChecked = useRef(false)
  const visited = useRef(new Set<string>())
  const runId = useRef(0)

  useEffect(() => {
    if (flagChecked.current) return
    flagChecked.current = true
    void (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session || clearedThisSession(session.user.id)) return
        const { data, error } = await supabase.from('app_settings').select('onboarding_tour_pending').maybeSingle()
        if (error || !data?.onboarding_tour_pending) return
        setOnboarding(true)
        await clearPendingFlag(session.user.id)
      } catch {
        // Fail safe: no tour.
      }
    })()
  }, [])

  const openTour = useCallback((path: string, mode: TourMode) => {
    const id = ++runId.current
    if (path === '/practice') window.dispatchEvent(new Event('practice-tour-start'))
    void resolveTargets(path, () => runId.current === id).then((targets) => {
      if (runId.current !== id) return
      if (path === '/practice') window.dispatchEvent(new Event('practice-tour-start'))
      if (mode === 'onboarding') visited.current.add(path)
      setActive({ path, mode, targets, index: 0 })
    })
  }, [])

  useEffect(() => {
    if (onboarding && tourSteps[pathname] && !visited.current.has(pathname)) openTour(pathname, 'onboarding')
    const run = runId
    return () => {
      run.current++
      setActive(null)
    }
  }, [pathname, onboarding, openTour])

  const current = active?.path === pathname ? active : null
  const steps: TourStep[] = !current
    ? []
    : current.targets.length === 0
      ? [fallbackStep(pathname)]
      : (tourSteps[pathname] ?? []).filter((step) => current.targets.includes(step.target))

  return {
    steps,
    index: current?.index ?? 0,
    mode: current?.mode ?? 'replay',
    isOpen: steps.length > 0,
    canReplay: Boolean(tourSteps[pathname]),
    replay: () => openTour(pathname, 'replay'),
    goTo: (index: number) => setActive((tour) => (tour ? { ...tour, index } : tour)),
    close: () => {
      runId.current++
      setActive(null)
    },
    skip: () => {
      runId.current++
      setActive(null)
      setOnboarding(false)
    },
  }
}
