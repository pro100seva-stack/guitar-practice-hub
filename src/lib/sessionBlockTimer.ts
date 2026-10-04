import type { BlockTimerState } from './sessionEditorState'

type BlockTimers = Record<string, BlockTimerState>

export function activateBlockTimer(timers: BlockTimers, id: string, nowMs: number, intent: 'initial' | 'explicit', blocked: boolean): BlockTimers {
  if (timers[id]?.isRunning || (blocked && intent !== 'explicit')) return timers
  return toggleBlockTimer(timers, id, nowMs)
}

export function timerElapsedSeconds(timer: BlockTimerState | undefined, nowMs: number): number {
  if (!timer) return 0
  if (!timer.isRunning || !timer.anchor) return timer.elapsedSeconds
  return Math.max(
    timer.elapsedSeconds,
    timer.anchor.elapsedSeconds + Math.max(0, nowMs - timer.anchor.startedAtMs) / 1000,
  )
}

export function pauseBlockTimer(timer: BlockTimerState, nowMs: number): BlockTimerState {
  return { isRunning: false, elapsedSeconds: timerElapsedSeconds(timer, nowMs) }
}

export function snapshotBlockTimers(timers: BlockTimers, nowMs: number, pause = false): BlockTimers {
  return Object.fromEntries(Object.entries(timers).map(([id, timer]) => [
    id,
    pause ? pauseBlockTimer(timer, nowMs) : { ...timer, elapsedSeconds: timerElapsedSeconds(timer, nowMs) },
  ]))
}

export function toggleBlockTimer(timers: BlockTimers, id: string, nowMs: number): BlockTimers {
  const timer = timers[id] ?? { isRunning: false, elapsedSeconds: 0 }
  const pausedTimers = snapshotBlockTimers(timers, nowMs, true)
  const elapsedSeconds = timerElapsedSeconds(timer, nowMs)
  return {
    ...pausedTimers,
    [id]: timer.isRunning
      ? pauseBlockTimer(timer, nowMs)
      : { isRunning: true, elapsedSeconds, anchor: { startedAtMs: nowMs, elapsedSeconds } },
  }
}

export function completeBlockTimer(timers: BlockTimers, id: string, done: boolean, nowMs: number): BlockTimers {
  const timer = timers[id]
  if (!done || !timer?.isRunning) return timers
  return { ...timers, [id]: pauseBlockTimer(timer, nowMs) }
}

export function resetBlockTimer(): BlockTimerState {
  return { isRunning: false, elapsedSeconds: 0 }
}

export function editBlockTimer(
  timer: BlockTimerState | undefined,
  part: 'minutes' | 'seconds',
  value: string,
  nowMs: number,
): BlockTimerState | undefined {
  const parsedValue = Number(value)
  if (!Number.isFinite(parsedValue) || parsedValue < 0) return timer
  const normalizedValue = part === 'seconds' ? Math.min(59, Math.floor(parsedValue)) : Math.floor(parsedValue)
  const currentSeconds = Math.floor(timerElapsedSeconds(timer, nowMs))
  const elapsedSeconds = part === 'minutes'
    ? normalizedValue * 60 + currentSeconds % 60
    : Math.floor(currentSeconds / 60) * 60 + normalizedValue
  return timer?.isRunning
    ? { isRunning: true, elapsedSeconds, anchor: { startedAtMs: nowMs, elapsedSeconds } }
    : { isRunning: false, elapsedSeconds }
}