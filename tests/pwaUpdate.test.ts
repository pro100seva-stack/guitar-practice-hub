import { describe, expect, it, vi } from 'vitest'
import { createPwaUpdateWorkflow, shouldReloadForPwaControllerChange, type PwaUpdateReadiness } from '../src/lib/pwaUpdate'

function fixture(options: { online?: boolean; safe?: boolean; readiness?: PwaUpdateReadiness; activate?: () => Promise<void> } = {}) {
  let online = options.online ?? true
  let safe = options.safe ?? true
  let locked = false
  const prepare = vi.fn(async () => options.readiness ?? { ready: true } as PwaUpdateReadiness)
  const activateWorker = vi.fn(options.activate ?? (async () => {}))
  const workflow = createPwaUpdateWorkflow({
    isOnline: () => online, isLocalSafe: () => safe, prepare, activateWorker,
    setLocked: (next) => { locked = next },
  })
  return {
    workflow, prepare, activateWorker, isLocked: () => locked,
    setOnline: (next: boolean) => { online = next; workflow.setOnline(next) },
    setSafe: (next: boolean) => { safe = next; workflow.onSafetyChange() },
  }
}

describe('next-visit PWA update offers', () => {
  it('offers a waiting startup version but never activates without an explicit click', async () => {
    const app = fixture()
    app.workflow.markWaiting()
    app.workflow.onSafetyChange()
    app.workflow.onRetryOpportunity()
    app.setOnline(true)
    await Promise.resolve()
    expect(app.workflow.getSnapshot()).toMatchObject({ waiting: true, visible: true, applying: false })
    expect(app.prepare).not.toHaveBeenCalled()
    await app.workflow.updateNow()
    expect(app.activateWorker).toHaveBeenCalledOnce()
  })

  it('keeps mid-visit discoveries hidden through focus, resume, reconnect and further checks', async () => {
    const app = fixture()
    app.workflow.finishStartup()
    app.workflow.markWaiting()
    app.workflow.onRetryOpportunity()
    app.setOnline(false)
    app.setOnline(true)
    app.workflow.markWaiting()
    await app.workflow.updateNow()
    expect(app.workflow.getSnapshot()).toMatchObject({ waiting: true, visible: false })
    expect(app.activateWorker).not.toHaveBeenCalled()
  })

  it('treats ordinary interaction before discovery as an active visit', async () => {
    const app = fixture()
    app.workflow.startVisit()
    app.workflow.markWaiting()
    await app.workflow.updateNow()
    expect(app.workflow.getSnapshot().visible).toBe(false)
    expect(app.prepare).not.toHaveBeenCalled()
  })

  it('dismisses an existing offer when the user starts working elsewhere', async () => {
    const app = fixture()
    app.workflow.markWaiting()
    app.workflow.startVisit()
    app.setSafe(true)
    await app.workflow.updateNow()
    expect(app.workflow.getSnapshot().visible).toBe(false)
    expect(app.activateWorker).not.toHaveBeenCalled()
  })

  it('Later suppresses the whole visit, but a fresh workflow can offer the same waiting worker', async () => {
    const app = fixture()
    app.workflow.markWaiting()
    app.workflow.later()
    app.workflow.onRetryOpportunity()
    app.workflow.markWaiting()
    expect(app.workflow.getSnapshot().visible).toBe(false)
    const reopened = fixture()
    reopened.workflow.markWaiting()
    expect(reopened.workflow.getSnapshot().visible).toBe(true)
    expect(reopened.activateWorker).not.toHaveBeenCalled()
  })

  it('keeps a startup offer after initial registration settles', () => {
    const app = fixture()
    app.workflow.markWaiting()
    app.workflow.finishStartup()
    expect(app.workflow.getSnapshot().visible).toBe(true)
  })

  it('does not activate offline or with unsaved state, and never auto-retries when they clear', async () => {
    const app = fixture({ online: false, safe: false })
    app.workflow.markWaiting()
    await app.workflow.updateNow()
    expect(app.workflow.getSnapshot().reason).toBe('offline')
    app.setOnline(true)
    await app.workflow.updateNow()
    expect(app.workflow.getSnapshot().reason).toBe('unsafe')
    app.setSafe(true)
    expect(app.activateWorker).not.toHaveBeenCalled()
    await app.workflow.updateNow()
    expect(app.activateWorker).toHaveBeenCalledOnce()
  })

  it('blocks other actual app windows and unavailable coordination without activating', async () => {
    for (const reason of ['otherWindows', 'coordinationUnavailable'] as const) {
      const app = fixture({ readiness: { ready: false, reason } })
      app.workflow.markWaiting()
      await app.workflow.updateNow()
      expect(app.workflow.getSnapshot()).toMatchObject({ visible: true, checking: false, reason })
      expect(app.isLocked()).toBe(false)
      expect(app.activateWorker).not.toHaveBeenCalled()
    }
  })

  it('rechecks local safety after asynchronous worker inspection', async () => {
    let resolve!: (result: PwaUpdateReadiness) => void
    let safe = true
    const activateWorker = vi.fn(async () => {})
    const app = createPwaUpdateWorkflow({
      isOnline: () => true, isLocalSafe: () => safe,
      prepare: () => new Promise((done) => { resolve = done }),
      activateWorker, setLocked: vi.fn(),
    })
    app.markWaiting()
    const pending = app.updateNow()
    safe = false
    resolve({ ready: true })
    await pending
    expect(activateWorker).not.toHaveBeenCalled()
    expect(app.getSnapshot().reason).toBe('unsafe')
  })

  it('serializes repeated Update clicks and supports an explicit retry after failure', async () => {
    let reject!: (reason: Error) => void
    const app = fixture({ activate: () => new Promise((_, fail) => { reject = fail }) })
    app.workflow.markWaiting()
    const first = app.workflow.updateNow()
    const second = app.workflow.updateNow()
    await Promise.resolve()
    expect(app.activateWorker).toHaveBeenCalledOnce()
    reject(new Error('timeout'))
    await Promise.all([first, second])
    expect(app.workflow.getSnapshot()).toMatchObject({ applying: false, visible: true, reason: 'workerFailed' })
    expect(app.isLocked()).toBe(false)
    app.workflow.onRetryOpportunity()
    expect(app.activateWorker).toHaveBeenCalledOnce()
  })

  it('reloads only after consent and at most once per boot', () => {
    expect(shouldReloadForPwaControllerChange(false, false)).toBe(false)
    expect(shouldReloadForPwaControllerChange(true, false)).toBe(true)
    expect(shouldReloadForPwaControllerChange(true, true)).toBe(false)
  })
})
