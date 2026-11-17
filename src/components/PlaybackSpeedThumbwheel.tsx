import { useEffect, useId, useRef, useState, type PointerEvent } from 'react'
import { useI18n } from '../lib/i18n'
import { draggedPlaybackSpeed, keyboardPlaybackSpeed, nearestPlaybackSpeedIndex, playbackSpeedSteps } from '../lib/playbackSpeedWheel'

type Props = {
  rate: number
  onRate: (rate: number) => void
  disabled?: boolean
  /** Supplied for YouTube; native media uses all 0.05 detents. */
  rates?: readonly number[]
}

export default function PlaybackSpeedThumbwheel({ rate, onRate, disabled = false, rates }: Props) {
  const { t } = useI18n()
  const labelId = useId()
  const steps = playbackSpeedSteps(rates)
  const inactive = disabled || steps.length < 2
  const [phase, setPhase] = useState(0)
  const [dragging, setDragging] = useState(false)
  const drag = useRef<{ pointerId: number; startX: number; startIndex: number; phase: number; requested: number; steps: number[] } | null>(null)
  const normal = Math.abs(rate - 1) < 0.001

  useEffect(() => {
    if (inactive) { drag.current = null; setDragging(false) }
  }, [inactive])

  function finish(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId !== event.pointerId) return
    drag.current = null
    setDragging(false)
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return <div className="playback-speed-wheel">
    <span id={labelId} className="playback-speed-wheel-label">{t('Playback speed')}</span>
    <div role="slider" tabIndex={inactive ? -1 : 0} aria-labelledby={labelId} aria-orientation="horizontal"
      aria-valuemin={steps[0]} aria-valuemax={steps[steps.length - 1]} aria-valuenow={rate} aria-valuetext={`${rate.toFixed(2)}×`} aria-disabled={inactive}
      className={`playback-speed-wheel-slot${normal ? ' is-normal' : ''}${dragging ? ' is-dragging' : ''}`}
      onDoubleClick={(event) => {
        if (inactive || !steps.includes(1)) return
        event.preventDefault()
        event.stopPropagation()
        drag.current = null
        setDragging(false)
        setPhase(0)
        onRate(1)
      }}
      onPointerDown={(event) => {
        if (inactive || event.isPrimary === false || event.button !== 0 || drag.current) return
        event.preventDefault()
        event.currentTarget.focus({ preventScroll: true })
        event.currentTarget.setPointerCapture?.(event.pointerId)
        drag.current = { pointerId: event.pointerId, startX: event.clientX, startIndex: nearestPlaybackSpeedIndex(steps, rate), phase, requested: rate, steps }
        setDragging(true)
      }}
      onPointerMove={(event) => {
        const gesture = drag.current
        if (inactive || !gesture || gesture.pointerId !== event.pointerId) return
        event.preventDefault()
        const distance = event.clientX - gesture.startX
        setPhase(gesture.phase + distance)
        const next = draggedPlaybackSpeed(gesture.steps, gesture.startIndex, distance)
        if (next !== gesture.requested) { gesture.requested = next; onRate(next) }
      }}
      onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish}
      onKeyDown={(event) => {
        if (inactive || event.altKey || event.ctrlKey || event.metaKey || event.nativeEvent.isComposing) return
        const next = keyboardPlaybackSpeed(steps, rate, event.key)
        if (next === null) return
        event.preventDefault()
        event.stopPropagation()
        if (next !== rate) { setPhase((current) => current + (next > rate ? 12 : -12)); onRate(next) }
      }}>
      <svg aria-hidden="true" focusable="false" className="playback-speed-wheel-roller" viewBox="0 0 160 30" preserveAspectRatio="none">
        <defs><pattern id={`${labelId}-ticks`} width="10" height="30" x={phase % 10} patternUnits="userSpaceOnUse"><path d="M5 9v12" fill="none" stroke="currentColor" strokeWidth="1" /></pattern></defs>
        <rect x="1" y="1" width="158" height="28" rx="14" className="playback-speed-wheel-capsule" />
        <rect x="4" y="2" width="152" height="26" rx="13" fill={`url(#${labelId}-ticks)`} />
        <path className="playback-speed-wheel-index" d="M80 4v22" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    </div>
    <div aria-hidden="true" className="playback-speed-wheel-references"><span>0.25×</span><span className="playback-speed-wheel-current">{rate.toFixed(2)}×</span><span>2.0×</span></div>
  </div>
}
