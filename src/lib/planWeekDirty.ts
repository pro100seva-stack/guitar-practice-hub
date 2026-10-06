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
