import { describe, expect, it, vi } from 'vitest'
import {
  createPwaUpdateWorkflow,
  evaluatePwaUpdateReadiness,
  shouldReloadForPwaControllerChange,
  type PwaUpdateReadiness,
} from '../src/lib/pwaUpdate'

function fixture(options: {
  online?: boolean
  safe?: boolean
  autoApply?: boolean
  broadcastAvailable?: boolean
  readiness?: PwaUpdateReadiness
  activate?: () => Promise<void>
} = {}) {
  let online = options.online ?? true
  let safe = options.safe ?? true
  let locked = false
  const cancelTabs = vi.fn()
  const applyToTabs = vi.fn()
  const activateWorker = options.activate ?? vi.fn(async () => {})
  const workflow = createPwaUpdateWorkflow({
    isOnline: () => online,
    isLocalSafe: () => safe,
    canAutoApply: options.autoApply === undefined ? undefined : () => options.autoApply ?? false,
    prepareTabs: async () => options.readiness ?? { ready: true },
    cancelTabs,
    applyToTabs: () => { applyToTabs(); return options.broadcastAvailable ?? true },
    activateWorker,
    setLocked: (next) => { locked = next },
  })
  return {
    workflow,
    cancelTabs,
    applyToTabs,
    activateWorker,
    isLocked: () => locked,
    setOnline: (next: boolean) => { online = next; workflow.setOnline(next) },
    setSafe: (next: boolean) => { safe = next; workflow.onSafetyChange() },
  }
}

describe('PWA update readiness', () => {
  it('fails closed for offline, active/dirty, unavailable coordination, nonresponsive and unsafe tabs', () => {
    const peers = ['tab-a', 'tab-b']
    const base = { online: true, localSafe: true, coordinationAvailable: true, peerIds: peers, replies: { 'tab-a': true, 'tab-b': true } }
    expect(evaluatePwaUpdateReadiness({ ...base, online: false })).toEqual({ ready: false, reason: 'offline' })
    expect(evaluatePwaUpdateReadiness({ ...base, localSafe: false })).toEqual({ ready: false, reason: 'unsafe' })
    expect(evaluatePwaUpdateReadiness({ ...base, coordinationAvailable: false })).toEqual({ ready: false, reason: 'coordinationUnavailable' })
    expect(evaluatePwaUpdateReadiness({ ...base, replies: { 'tab-a': true } })).toEqual({ ready: false, reason: 'tabNotResponding' })
    expect(evaluatePwaUpdateReadiness({ ...base, replies: { 'tab-a': true, 'tab-b': false } })).toEqual({ ready: false, reason: 'unsafe' })
    expect(evaluatePwaUpdateReadiness(base)).toEqual({ ready: true })
  })

  it('does not apply offline or while a local safety guard reports work in progress', async () => {
    const offline = fixture({ online: false })
    offline.workflow.markWaiting()
    await offline.workflow.updateNow()
    expect(offline.activateWorker).not.toHaveBeenCalled()
    expect(offline.workflow.getSnapshot().reason).toBe('offline')
    expect(offline.isLocked()).toBe(false)

    const dirty = fixture({ safe: false })
    dirty.workflow.markWaiting()
    expect(dirty.workflow.getSnapshot().reason).toBe('unsafe')
    expect(dirty.activateWorker).not.toHaveBeenCalled()
    dirty.setSafe(true)
    await vi.waitFor(() => expect(dirty.applyToTabs).toHaveBeenCalledOnce())
    expect(dirty.isLocked()).toBe(true)
  })

  it('retries an offline pending update after the app comes back online', async () => {
    const app = fixture({ online: false })
    app.workflow.markWaiting()
    expect(app.workflow.getSnapshot().reason).toBe('offline')
    app.setOnline(true)
    await vi.waitFor(() => expect(app.activateWorker).toHaveBeenCalledOnce())
  })

  it('keeps an update pending after a timed-out/nonresponsive tab and releases prepared tabs', async () => {
    const pending = fixture({ readiness: { ready: false, reason: 'tabNotResponding' } })
    pending.workflow.markWaiting()
    await vi.waitFor(() => expect(pending.cancelTabs).toHaveBeenCalledOnce())
    expect(pending.workflow.getSnapshot()).toMatchObject({ waiting: true, applying: false, reason: 'tabNotResponding' })
    expect(pending.activateWorker).not.toHaveBeenCalled()
    expect(pending.isLocked()).toBe(false)
  })

  it('does not activate if the apply broadcast fails after preparation', async () => {
    const app = fixture({ broadcastAvailable: false })
    app.workflow.markWaiting()
    await vi.waitFor(() => expect(app.cancelTabs).toHaveBeenCalledOnce())
    expect(app.workflow.getSnapshot()).toMatchObject({ waiting: true, applying: false, reason: 'coordinationUnavailable' })
    expect(app.activateWorker).not.toHaveBeenCalled()
    expect(app.isLocked()).toBe(false)
  })

  it('applies once every tab confirms, and provides a retry after the user chose Later', async () => {
    const ready = fixture()
    ready.workflow.markWaiting()
    await vi.waitFor(() => expect(ready.activateWorker).toHaveBeenCalledOnce())
    expect(ready.applyToTabs).toHaveBeenCalledOnce()

    const deferred = fixture({ safe: false })
    deferred.workflow.markWaiting()
    deferred.workflow.later()
    deferred.setSafe(true)
    expect(deferred.activateWorker).not.toHaveBeenCalled()
    expect(deferred.workflow.getSnapshot().visible).toBe(true)
    await deferred.workflow.updateNow()
    expect(deferred.activateWorker).toHaveBeenCalledOnce()
  })

  it('keeps Later deferred through an unsafe lifecycle retry and applies at the next safe lifecycle retry', async () => {
    const deferred = fixture({ safe: false })
    deferred.workflow.markWaiting()
    deferred.workflow.later()

    expect(deferred.activateWorker).not.toHaveBeenCalled()
    expect(deferred.workflow.getSnapshot().visible).toBe(false)

    deferred.workflow.onRetryOpportunity()
    expect(deferred.activateWorker).not.toHaveBeenCalled()
    expect(deferred.workflow.getSnapshot()).toMatchObject({ waiting: true, visible: true, reason: 'unsafe' })

    deferred.setSafe(true)
    expect(deferred.activateWorker).not.toHaveBeenCalled()

    deferred.workflow.onRetryOpportunity()
    await vi.waitFor(() => expect(deferred.activateWorker).toHaveBeenCalledOnce())
  })

  it('lets only the elected tab auto-apply while preserving an explicit user retry', async () => {
    const nonLeader = fixture({ autoApply: false })
    nonLeader.workflow.markWaiting()
    expect(nonLeader.activateWorker).not.toHaveBeenCalled()
    await nonLeader.workflow.updateNow()
    expect(nonLeader.activateWorker).toHaveBeenCalledOnce()
  })

  it('retains the pending notice on worker failure and prevents an unsolicited second attempt', async () => {
    const failed = fixture({ activate: vi.fn(async () => { throw new Error('worker failure') }) })
    failed.workflow.markWaiting()
    await vi.waitFor(() => expect(failed.workflow.getSnapshot().reason).toBe('workerFailed'))
    expect(failed.workflow.getSnapshot()).toMatchObject({ waiting: true, visible: true, applying: false })
    expect(failed.isLocked()).toBe(false)
    expect(failed.activateWorker).toHaveBeenCalledOnce()
  })

  it('lets the user retry a failed worker application', async () => {
    let attempts = 0
    const activate = vi.fn(async () => {
      attempts += 1
      if (attempts === 1) throw new Error('temporary worker failure')
    })
    const app = fixture({ activate })
    app.workflow.markWaiting()
    await vi.waitFor(() => expect(app.workflow.getSnapshot().reason).toBe('workerFailed'))
    await app.workflow.updateNow()
    expect(activate).toHaveBeenCalledTimes(2)
    expect(app.workflow.getSnapshot().applying).toBe(true)
  })

  it('reloads only for an intentional activation and at most once in one boot', () => {
    expect(shouldReloadForPwaControllerChange(false, false)).toBe(false)
    expect(shouldReloadForPwaControllerChange(true, false)).toBe(true)
    expect(shouldReloadForPwaControllerChange(true, true)).toBe(false)
  })
})
