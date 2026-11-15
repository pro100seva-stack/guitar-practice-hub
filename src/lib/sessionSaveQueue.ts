/** One ordered lane for manual and automatic absolute snapshots; a failure cannot poison later retries. */
export function createSessionSaveQueue() {
  let tail: Promise<unknown> = Promise.resolve()
  return {
    enqueue<T>(save: () => Promise<T>): Promise<T> {
      const result = tail.then(save)
      tail = result.catch(() => undefined)
      return result
    },
  }
}
