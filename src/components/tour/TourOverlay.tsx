import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useI18n } from '../../lib/i18n'
import type { TourStep } from './tourSteps'
import type { TourMode } from './useScreenTour'

type Props = { steps: TourStep[]; index: number; mode: TourMode; onIndex: (index: number) => void; onClose: () => void; onSkip: () => void }

const CARD_HEIGHT_ESTIMATE = 220

export default function TourOverlay({ steps, index, mode, onIndex, onClose, onSkip }: Props) {
  const { t } = useI18n()
  const step = steps[index]
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const primaryRef = useRef<HTMLButtonElement | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const [cardHeight, setCardHeight] = useState(CARD_HEIGHT_ESTIMATE)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight })

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    primaryRef.current?.focus()
    return () => { window.requestAnimationFrame(() => previous?.focus()) }
  }, [])

  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    if (!step) return
    const anchor = step.target ? document.querySelector(step.target) : null
    anchor?.scrollIntoView({ block: 'center' })
    function update() {
      setRect(step.target ? document.querySelector(step.target)?.getBoundingClientRect() ?? null : null)
      setViewport({ width: window.innerWidth, height: window.innerHeight })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [step])

  useEffect(() => {
    const height = cardRef.current?.offsetHeight
    if (height && height !== cardHeight) setCardHeight(height)
  }, [step, viewport, cardHeight])

  if (!step) return null
  const isLast = index === steps.length - 1
  const isSheet = viewport.width < 640
  const cardWidth = Math.min(352, viewport.width - 32)
  const cardStyle = isSheet
    ? { left: 16, right: 16, bottom: 16, maxHeight: '60vh' }
    : !rect
      ? { width: cardWidth, left: (viewport.width - cardWidth) / 2, top: Math.max(16, (viewport.height - cardHeight) / 2), maxHeight: viewport.height - 32 }
      : {
        width: cardWidth,
        maxHeight: viewport.height - 32,
        left: Math.max(16, Math.min(viewport.width - cardWidth - 16, rect.left)),
        ...(rect.bottom + 18 + cardHeight <= viewport.height
          ? { top: rect.bottom + 18 }
          : rect.top - 18 - cardHeight >= 0
            ? { bottom: viewport.height - rect.top + 18 }
            : { bottom: 16 }),
      }

  function handleTab(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Tab') return
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button')
    if (!focusable?.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }

  return (
    <div ref={dialogRef} onKeyDown={handleTab} className={`fixed inset-0 z-[60] ${rect ? '' : 'bg-slate-950/70'}`} role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-body">
      {rect && <div className="pointer-events-none absolute rounded-lg ring-2 ring-sky-400 ring-offset-2 ring-offset-slate-950" style={{ left: rect.left - 4, top: rect.top - 4, width: rect.width + 8, height: rect.height + 8, boxShadow: '0 0 0 9999px rgba(2, 6, 23, 0.72)' }} />}
      <div ref={cardRef} className="absolute overflow-y-auto rounded-lg border border-sky-500/60 bg-slate-950 p-4 text-slate-100 shadow-2xl" style={cardStyle}>
        <p id="tour-title" className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">{t(step.title)}</p>
        <p id="tour-body" className="mt-2 text-sm leading-relaxed text-slate-300">{t(step.body)}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <button type="button" onClick={mode === 'onboarding' ? onSkip : onClose} className="min-h-10 rounded px-2 text-xs text-slate-400 hover:text-slate-200">{t(mode === 'onboarding' ? 'Skip' : 'Close')}</button>
          <div className="flex items-center gap-2">
            {index > 0 && <button type="button" onClick={() => onIndex(index - 1)} className="min-h-10 rounded border border-slate-700 px-4 text-xs text-slate-300">{t('Back')}</button>}
            <button ref={primaryRef} type="button" onClick={() => isLast ? onClose() : onIndex(index + 1)} className="min-h-10 rounded bg-sky-400 px-4 text-xs font-medium text-slate-950">{t(isLast ? 'Tour done' : 'Tour next')}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
