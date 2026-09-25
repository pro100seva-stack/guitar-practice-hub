import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useI18n } from '../lib/i18n'

type TourStep = { target: string; title: string; body: string }

export default function FirstEntryTour({ userId, children }: { userId: string; children: ReactNode }) {
  const { t } = useI18n()
  const [stepIndex, setStepIndex] = useState(0)
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const steps = useMemo<TourStep[]>(() => [
    { target: '[data-tour="menu"]', title: t('Your navigation menu'), body: t('Open this menu to move between Home, Progress, Plan, Practice, Stats, and Settings.') },
    { target: '[data-tour="progress"]', title: t('Track your progress'), body: t('Review completed practice, upcoming weeks, and your progress timeline here.') },
    { target: '[data-tour="current-week"]', title: t('Plan your week'), body: t('Open the current week to edit focus, tasks, ToDos, and songs.') },
    { target: '[data-tour="practice"]', title: t('Practice and log work'), body: t('Use Practice for timers, blocks, ToDos, the metronome, tuner, and learning materials.') },
  ], [t])

  useEffect(() => {
    if (localStorage.getItem(`guitar-hub-tour-complete:${userId}`)) return
    const timer = window.setTimeout(() => setOpen(true), 350)
    return () => window.clearTimeout(timer)
  }, [userId])

  useEffect(() => {
    if (!open) return
    function updatePosition() {
      const nextRect = document.querySelector(steps[stepIndex]?.target)?.getBoundingClientRect() ?? null
      setRect((previous) => {
        if (!nextRect || !previous) return nextRect
        if (previous.x === nextRect.x && previous.y === nextRect.y && previous.width === nextRect.width && previous.height === nextRect.height) return previous
        return nextRect
      })
    }
    updatePosition()
    const targetPoll = window.setInterval(updatePosition, 100)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.clearInterval(targetPoll)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, stepIndex, steps])

  const complete = () => {
    localStorage.setItem(`guitar-hub-tour-complete:${userId}`, 'true')
    setOpen(false)
  }

  if (!open || !rect) return <>{children}</>
  const step = steps[stepIndex]
  const isLastStep = stepIndex === steps.length - 1
  const cardWidth = Math.min(352, window.innerWidth - 32)

  return (
    <>
      {children}
      <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={step.title}>
        <div className="pointer-events-none absolute rounded-lg ring-2 ring-sky-400 ring-offset-2 ring-offset-slate-950" style={{ left: rect.left - 4, top: rect.top - 4, width: rect.width + 8, height: rect.height + 8, boxShadow: '0 0 0 9999px rgba(2, 6, 23, 0.72)' }} />
        <div className="absolute rounded-lg border border-sky-500/60 bg-slate-950 p-4 text-slate-100 shadow-2xl" style={{ width: cardWidth, left: Math.max(16, Math.min(window.innerWidth - cardWidth - 16, rect.left)), top: Math.min(window.innerHeight - 210, rect.bottom + 18) }}>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">{step.title}</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">{step.body}</p>
          <div className="mt-4 flex items-center justify-between gap-2">
            <button type="button" onClick={complete} className="text-xs text-slate-500 hover:text-slate-200">{t('Skip')}</button>
            <div className="flex items-center gap-2">
              {stepIndex > 0 && <button type="button" onClick={() => setStepIndex((current) => current - 1)} className="rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-300">{t('Back')}</button>}
              <button type="button" onClick={() => isLastStep ? complete() : setStepIndex((current) => current + 1)} className="rounded bg-sky-400 px-3 py-1.5 text-xs font-medium text-slate-950">{t(isLastStep ? 'Done' : 'Next')}</button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}