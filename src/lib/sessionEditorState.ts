import { normalizeBlockLabel } from './blockLabels'

export type SelectedBlock = {
  id: string
  key: string
  label: string
  done: boolean
  actualMinutes: string
  targetMinutes: number | null
}

export type BlockTimerState = {
  isRunning: boolean
  elapsedSeconds: number
  anchor?: { startedAtMs: number; elapsedSeconds: number }
}

type EditorTemplate = {
  id: string
  key: string
  label: string
  target_minutes: number | null
}

type EditorSession = {
  session_date: string
  comment: string | null
  session_blocks: Array<{ block_key: string; actual_minutes: number | null; done: boolean }>
}

export type SessionEditorState = {
  comment: string
  timers: Record<string, BlockTimerState>
  selectedBlocks: SelectedBlock[]
}

export function hasSavedSession(date: string, sessions: Array<{ session_date: string }>) {
  return sessions.some((session) => session.session_date === date)
}

export function shouldDeleteClearedSession(existing: boolean, selectedBlockCount: number, comment: string) {
  return existing && selectedBlockCount === 0 && comment.trim() === ''
}

export function getSessionEditorState(date: string, templates: EditorTemplate[], sessions: EditorSession[], configuredKeys: readonly string[] = []): SessionEditorState {
  const savedSession = sessions.find((session) => session.session_date === date)
  if (!savedSession) {
    const byKey = new Map(templates.map((template) => [template.key, template]))
    return {
      comment: '',
      timers: {},
      selectedBlocks: [...new Set(configuredKeys)].flatMap((key) => {
        const template = byKey.get(key)
        return template ? [{
          id: template.id,
          key: template.key,
          label: normalizeBlockLabel(template.label),
          done: false,
          actualMinutes: '',
          targetMinutes: template.target_minutes,
        }] : []
      }),
    }
  }

  const savedBlocks = new Map(savedSession.session_blocks.map((block) => [block.block_key, block]))
  const sessionTemplates = templates.filter((template) => savedBlocks.has(template.key))
  const timers: Record<string, BlockTimerState> = {}

  for (const template of sessionTemplates) {
    const actualMinutes = savedBlocks.get(template.key)?.actual_minutes
    if (actualMinutes != null) timers[template.id] = { isRunning: false, elapsedSeconds: actualMinutes * 60 }
  }

  return {
    comment: savedSession.comment ?? '',
    timers,
    selectedBlocks: sessionTemplates.map((template) => {
      const savedBlock = savedBlocks.get(template.key)
      return {
        id: template.id,
        key: template.key,
        label: normalizeBlockLabel(template.label),
        done: savedBlock?.done ?? false,
        actualMinutes: savedBlock?.actual_minutes != null ? String(savedBlock.actual_minutes) : '',
        targetMinutes: template.target_minutes,
      }
    }),
  }
}

export function isSessionEditorDirty(baseline: SessionEditorState, current: SessionEditorState) {
  if (baseline.comment !== current.comment) return true
  if (baseline.selectedBlocks.length !== current.selectedBlocks.length) return true

  const baselineById = new Map(baseline.selectedBlocks.map((block) => [block.id, block]))
  return current.selectedBlocks.some((block) => {
    const saved = baselineById.get(block.id)
    if (!saved) return true
    const timer = current.timers[block.id]
    return timer?.isRunning === true
      || saved.done !== block.done
      || saved.actualMinutes !== block.actualMinutes
      || (baseline.timers[block.id]?.elapsedSeconds ?? 0) !== (timer?.elapsedSeconds ?? 0)
  })
}

export function canInitializeSessionDefaults(requestedWeekId: string, currentWeekId: string | null, saved: boolean, baseline: SessionEditorState, current: SessionEditorState) {
  return requestedWeekId === currentWeekId && !saved && !isSessionEditorDirty(baseline, current)
}
