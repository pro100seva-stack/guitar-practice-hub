import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { useI18n } from '../../lib/i18n'
import type { TourStep } from './tourSteps'
import type { TourMode } from './useScreenTour'

type Props = { steps: TourStep[]; index: number; mode: TourMode; onIndex: (index: number) => void; onClose: () => void; onSkip: () => void; isHome?: boolean }

const CARD_HEIGHT_ESTIMATE = 220

// Home keeps its composition fixed: put the card around the target instead of
// scrolling the page to make room for it. The card can scroll internally.
function homeCardPlacement(rect: DOMRect | null, width: number, height: number, cardHeight: number): CSSProperties {
  const margin = 12
  const gap = 12
  const cardWidth = Math.min(352, width - margin * 2)
  const maxHeight = Math.max(44, height - margin * 2)
  if (!rect) return { width: cardWidth, maxHeight, left: (width - cardWidth) / 2, top: Math.max(margin, (height - cardHeight) / 2) }
  const target = { left: Math.max(0, rect.left), right: Math.min(width, rect.right), top: Math.max(0, rect.top), bottom: Math.min(height, rect.bottom) }
  const alignedLeft = Math.max(margin, Math.min(width - cardWidth - margin, target.left))
  const centeredTop = Math.max(margin, Math.min(height - Math.min(cardHeight, maxHeight) - margin, (target.top + target.bottom - cardHeight) / 2))
  const above = Math.max(0, target.top - gap - margin)
  const candidates = [
    { width: cardWidth, maxHeight: Math.max(0, height - margin - target.bottom - gap), left: alignedLeft, top: target.bottom + gap },
    { width: cardWidth, maxHeight: above, left: alignedLeft, top: Math.max(margin, target.top - gap - Math.min(cardHeight, above)) },
    { width: Math.min(cardWidth, Math.max(0, width - margin - target.right - gap)), maxHeight, left: target.right + gap, top: centeredTop },
    { width: Math.min(cardWidth, Math.max(0, target.left - gap - margin)), maxHeight, left: margin, top: centeredTop },
  ].filter((candidate) => candidate.width >= Math.min(160, cardWidth) && candidate.maxHeight >= 88)
  const fitting = candidates.find((candidate) => candidate.maxHeight >= Math.min(cardHeight, maxHeight))
  const best = fitting ?? candidates.sort((a, b) => b.width * b.maxHeight - a.width * a.maxHeight)[0]
  return best ?? { width: cardWidth, maxHeight, left: (width - cardWidth) / 2, top: margin }
}

export default function TourOverlay({ steps, index, mode, onIndex, onClose, onSkip, isHome = false }: Props) {
  const { t } = useI18n()
  const step = steps[index]
  const hasStep = Boolean(step)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const primaryRef = useRef<HTMLButtonElement | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const [cardHeight, setCardHeight] = useState(CARD_HEIGHT_ESTIMATE)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight })

  useEffect(() => {
    if (!hasStep) return
    const previous = document.activeElement as HTMLElement | null
    primaryRef.current?.focus({ preventScroll: true })
    return () => { window.requestAnimationFrame(() => previous?.focus({ preventScroll: true })) }
  }, [hasStep])

  useEffect(() => {
    if (!hasStep) return
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [hasStep, onClose])

  useLayoutEffect(() => {
    if (!step || !cardRef.current) return
    const card = cardRef.current
    function measure() { setCardHeight(card.offsetHeight) }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(card)
    return () => observer.disconnect()
  }, [step])

  useEffect(() => {
    if (isHome || !step?.target || viewport.width >= 640) return
    const previous = document.body.style.paddingBottom
    const padding = Number.parseFloat(window.getComputedStyle(document.body).paddingBottom) || 0
    document.body.style.paddingBottom = `${padding + cardHeight + 48}px`
    return () => { document.body.style.paddingBottom = previous }
  }, [step, viewport.width, cardHeight, isHome])

  useEffect(() => {
    if (!step) return
    const anchor = step.target ? document.querySelector(step.target) : null
    if (!isHome) anchor?.scrollIntoView({ block: 'center', behavior: 'instant' })
    if (!isHome && anchor && viewport.width < 640 && !anchor.closest('header')) {
      const target = anchor.getBoundingClientRect()
      const top = (document.querySelector('header')?.getBoundingClientRect().bottom ?? 0) + 12
      const bottom = viewport.height - cardHeight - 32
      const desiredTop = top + Math.max(0, (bottom - top - target.height) / 2)
      window.scrollBy({ top: target.top - desiredTop, behavior: 'instant' })
    }
    function update() {
      setRect(step.target ? document.querySelector(step.target)?.getBoundingClientRect() ?? null : null)
      setViewport({ width: isHome ? window.visualViewport?.width ?? window.innerWidth : window.innerWidth, height: isHome ? window.visualViewport?.height ?? window.innerHeight : window.innerHeight })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    if (isHome) window.visualViewport?.addEventListener('resize', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
      if (isHome) window.visualViewport?.removeEventListener('resize', update)
    }
  }, [step, viewport.width, viewport.height, cardHeight, isHome])

  if (!step) return null
  const isLast = index === steps.length - 1
  const isSheet = viewport.width < 640
  const cardWidth = Math.min(352, viewport.width - 32)
  const cardStyle = isHome ? homeCardPlacement(rect, viewport.width, viewport.height, cardHeight) : isSheet
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
    <div ref={dialogRef} onKeyDown={handleTab} className={`fixed inset-0 z-[60] ${isHome ? 'home-tour overflow-hidden' : ''} ${rect ? '' : 'bg-slate-950/70'}`} role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-body">
      {rect && <div className={isHome ? 'home-tour-highlight pointer-events-none absolute' : 'pointer-events-none absolute rounded-lg ring-2 ring-sky-400 ring-offset-2 ring-offset-slate-950'} style={{ left: rect.left - 4, top: rect.top - 4, width: rect.width + 8, height: rect.height + 8, boxShadow: `0 0 0 9999px ${isHome ? 'rgba(14, 32, 21, 0.66)' : 'rgba(2, 6, 23, 0.72)'}` }} />}
      <div ref={cardRef} className={isHome ? 'home-tour-card absolute overflow-y-auto p-4' : 'absolute overflow-y-auto rounded-lg border border-sky-500/60 bg-slate-950 p-4 text-slate-100 shadow-2xl'} style={cardStyle}>
        <p id="tour-title" className={isHome ? 'home-tour-title' : 'text-xs font-semibold uppercase tracking-[0.18em] text-sky-300'}>{t(step.title)}</p>
        <p aria-live="polite" className={isHome ? 'home-tour-counter' : 'mt-1 text-xs tabular-nums text-slate-400'}>{t('{current} of {total}', { current: index + 1, total: steps.length })}</p>
        <p id="tour-body" className={isHome ? 'home-tour-body' : 'mt-2 text-sm leading-relaxed text-slate-300'}>{t(step.body)}</p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <button type="button" onClick={mode === 'onboarding' ? onSkip : onClose} className={isHome ? 'home-tour-action home-tour-dismiss' : 'min-h-11 rounded px-2 text-xs text-slate-400 hover:text-slate-200'}>{t(mode === 'onboarding' ? 'Skip tour' : 'Close')}</button>
          <div className="flex items-center gap-2">
            {index > 0 && <button type="button" onClick={() => onIndex(index - 1)} className={isHome ? 'home-tour-action' : 'min-h-11 rounded border border-slate-700 px-3 text-xs text-slate-300'}>{t('Back')}</button>}
            <button ref={primaryRef} type="button" onClick={() => isLast ? onClose() : onIndex(index + 1)} className={isHome ? 'home-tour-action home-tour-next' : 'min-h-11 rounded bg-sky-400 px-3 text-xs font-medium text-slate-950'}>{t(isLast ? 'Tour done' : 'Tour next')}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
