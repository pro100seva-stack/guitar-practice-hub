import { useEffect, useRef, type Ref } from 'react'
import { formatLoopTimestamp, parseLoopTimestamp } from '../lib/loopRegions'

type Props = {
  value: string
  onChange: (value: string) => void
  min?: number
  max?: number
  disabled?: boolean
  inputRef?: Ref<HTMLInputElement>
  'aria-label'?: string
  placeholder?: string
  title?: string
}

/** A normal text field on tap, or a relative time scrubber after holding briefly. */
export default function TimecodeInput({ value, onChange, min = 0, max = Number.MAX_SAFE_INTEGER / 100, disabled, inputRef, ...attributes }: Props) {
  const gesture = useRef<{ pointer: number; y: number; time: number; active: boolean; target: HTMLInputElement; timer?: ReturnType<typeof setTimeout> } | null>(null)
  const suppressClick = useRef(false)
  const latest = useRef({ onChange, min, max, disabled })
  latest.current = { onChange, min, max, disabled }
  const adjust = (seconds: number) => {
    const current = latest.current
    if (!current.disabled) current.onChange(formatLoopTimestamp(Math.max(current.min, Math.min(current.max, seconds))))
  }
  function finish(pointer: number, cancel = false) {
    const current = gesture.current
    if (!current || current.pointer !== pointer) return
    if (current.timer) clearTimeout(current.timer)
    gesture.current = null
    suppressClick.current = current.active
    if (current.target.hasPointerCapture?.(pointer)) current.target.releasePointerCapture(pointer)
    if (cancel && current.active) adjust(current.time)
  }
  useEffect(() => () => {
    if (gesture.current?.timer) clearTimeout(gesture.current.timer)
    gesture.current = null
  }, [])
  return <input {...attributes} ref={inputRef} type="text" inputMode="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} value={value} disabled={disabled}
    style={{ touchAction: 'none', WebkitTouchCallout: 'none' }}
    onChange={(event) => onChange(event.target.value)}
    onPointerDown={(event) => {
      if (disabled || event.button !== 0 || event.isPrimary === false || gesture.current) return
      const time = parseLoopTimestamp(value)
      if (time === null) return
      suppressClick.current = false
      const current = { pointer: event.pointerId, y: event.clientY, time, active: false, target: event.currentTarget, timer: undefined as ReturnType<typeof setTimeout> | undefined }
      gesture.current = current
      current.timer = setTimeout(() => {
        if (gesture.current !== current || latest.current.disabled) return
        current.active = true
        current.target.setPointerCapture?.(current.pointer)
      }, 350)
    }}
    onPointerMove={(event) => {
      const current = gesture.current
      if (!current || current.pointer !== event.pointerId) return
      const distance = current.y - event.clientY
      if (!current.active) {
        if (Math.abs(distance) > 8) finish(event.pointerId)
        return
      }
      event.preventDefault()
      event.stopPropagation()
      adjust(current.time + Math.round(distance / 6) * (event.shiftKey ? 0.01 : 0.1))
    }}
    onPointerUp={(event) => { if (gesture.current?.active) { event.preventDefault(); event.stopPropagation() }; finish(event.pointerId) }}
    onPointerCancel={(event) => finish(event.pointerId, true)}
    onLostPointerCapture={(event) => finish(event.pointerId, true)}
    onClick={(event) => { if (suppressClick.current) { suppressClick.current = false; event.preventDefault(); event.stopPropagation() } }}
    onContextMenu={(event) => event.preventDefault()}
    onKeyDown={(event) => {
      if (disabled || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return
      const seconds = parseLoopTimestamp(value)
      if (seconds === null) return
      event.preventDefault()
      event.stopPropagation()
      adjust(seconds + (event.key === 'ArrowUp' ? 1 : -1) * (event.shiftKey ? 0.01 : 0.1))
    }} />
}
