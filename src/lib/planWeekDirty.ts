export type PlanWeekDraft = {
  focus: string
  programId: string
  startDate: string
  endDate: string
  tasks: string
  todos: Array<{ id: string | null; name: string; done: boolean }>
  songText: string
}

export function isPlanWeekDirty(loaded: PlanWeekDraft | null, current: PlanWeekDraft) {
  if (!loaded) return false
  return loaded.focus !== current.focus
    || loaded.programId !== current.programId
    || loaded.startDate !== current.startDate
    || loaded.endDate !== current.endDate
    || loaded.tasks !== current.tasks
    || loaded.songText !== current.songText
    || loaded.todos.length !== current.todos.length
    || loaded.todos.some((todo, index) => {
      const next = current.todos[index]
      return todo.id !== next.id || todo.name !== next.name || todo.done !== next.done
    })
}

export type PendingWeekChange<A> = { action: A; baseline: PlanWeekDraft | null }

export type WeekChangeRequest<A> = { kind: 'run'; action: A } | { kind: 'prompt'; pending: PendingWeekChange<A> }

export function requestWeekChange<A>(dirty: boolean, action: A, baseline: PlanWeekDraft | null): WeekChangeRequest<A> {
  return dirty ? { kind: 'prompt', pending: { action, baseline } } : { kind: 'run', action }
}

export type WeekChangeResolution<A> = { kind: 'run'; action: A } | { kind: 'close' } | { kind: 'blocked' }

// A prompt raised against an older baseline must never run its action against the newer week data.
export function resolveWeekChange<A>(
  pending: PendingWeekChange<A> | null,
  choice: 'discard' | 'keep',
  current: { saving: boolean; baseline: PlanWeekDraft | null },
): WeekChangeResolution<A> {
  if (current.saving) return { kind: 'blocked' }
  if (!pending || choice === 'keep' || pending.baseline !== current.baseline) return { kind: 'close' }
  return { kind: 'run', action: pending.action }
}

export type PendingWeekChangeEvent = { kind: 'save-start' } | { kind: 'baseline'; baseline: PlanWeekDraft | null }

export function settlePendingWeekChange<A>(pending: PendingWeekChange<A> | null, event: PendingWeekChangeEvent): PendingWeekChange<A> | null {
  if (!pending || event.kind === 'save-start') return null
  return pending.baseline === event.baseline ? pending : null
}

export type WeekLoadResult<W> = { ok: true; week: W; draft: PlanWeekDraft } | { ok: false; error: string }

export type WeekLoadOutcome<W> =
  | { kind: 'replace'; week: W; draft: PlanWeekDraft; baseline: PlanWeekDraft }
  | { kind: 'keep'; error: string }

// A failed load must leave the current week, its edits and its baseline untouched.
export function settleWeekLoad<W>(result: WeekLoadResult<W>): WeekLoadOutcome<W> {
  if (!result.ok) return { kind: 'keep', error: result.error }
  return { kind: 'replace', week: result.week, draft: result.draft, baseline: result.draft }
}
