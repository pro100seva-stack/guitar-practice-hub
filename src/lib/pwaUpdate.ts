export type PwaUpdateBlockReason = 'offline' | 'unsafe' | 'coordinationUnavailable' | 'otherWindows' | 'workerFailed'
export type PwaUpdateSnapshot = {
  waiting: boolean
  visible: boolean
  checking: boolean
  applying: boolean
  online: boolean
  reason: PwaUpdateBlockReason | null
}
export type PwaUpdateReadiness = { ready: true } | { ready: false; reason: PwaUpdateBlockReason }

export function shouldReloadForPwaControllerChange(applying: boolean, alreadyReloaded: boolean) {
  return applying && !alreadyReloaded
}

export type PwaUpdateWorkflowOptions = {
  isOnline: () => boolean
  isLocalSafe: () => boolean
  prepare: () => Promise<PwaUpdateReadiness>
  activateWorker: () => Promise<void>
  setLocked: (locked: boolean) => void
}

/** An offer belongs to the next fresh document, never a resumed or already active visit. */
export function createPwaUpdateWorkflow(options: PwaUpdateWorkflowOptions) {
  let phase: 'startup' | 'offered' | 'active' = 'startup'
  let snapshot: PwaUpdateSnapshot = { waiting: false, visible: false, checking: false, applying: false, online: options.isOnline(), reason: null }
  let operation: Promise<void> | null = null
  const listeners = new Set<() => void>()
  function publish(patch: Partial<PwaUpdateSnapshot>) {
    snapshot = { ...snapshot, ...patch }
    listeners.forEach((listener) => listener())
  }
  function refreshReason() {
    if (!snapshot.visible || snapshot.applying || snapshot.checking) return
    const online = options.isOnline()
    publish({ online, reason: !online ? 'offline' : !options.isLocalSafe() ? 'unsafe' : null })
  }
  function startVisit() {
    if (snapshot.applying || snapshot.checking) return
    phase = 'active'
    publish({ visible: false })
  }
  async function apply() {
    if (operation || snapshot.applying) return operation ?? Promise.resolve()
    if (phase !== 'offered' || !snapshot.waiting || !snapshot.visible) return
    refreshReason()
    if (!options.isOnline() || !options.isLocalSafe()) return
    options.setLocked(true)
    publish({ checking: true, reason: null })
    operation = (async () => {
      const readiness = await options.prepare()
      if (!readiness.ready) {
        publish({ checking: false, reason: readiness.reason })
        options.setLocked(false)
        return
      }
      // Async registration checks cannot authorize activation after safety changed.
      if (!options.isOnline() || !options.isLocalSafe()) {
        publish({ checking: false, online: options.isOnline(), reason: options.isOnline() ? 'unsafe' : 'offline' })
        options.setLocked(false)
        return
      }
      publish({ checking: false, applying: true, reason: null })
      await options.activateWorker()
    })().catch(() => {
      options.setLocked(false)
      publish({ checking: false, applying: false, reason: 'workerFailed' })
    }).finally(() => { operation = null })
    return operation
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
    markWaiting() {
      const offer = phase === 'startup' || phase === 'offered'
      if (offer) phase = 'offered'
      publish({ waiting: true, visible: offer })
      refreshReason()
    },
    finishStartup() { if (phase === 'startup') startVisit() },
    startVisit,
    onSafetyChange: refreshReason,
    onRetryOpportunity: refreshReason,
    setOnline(online: boolean) { publish({ online }); refreshReason() },
    markWorkerFailed() {
      options.setLocked(false)
      publish({ checking: false, applying: false, reason: 'workerFailed' })
    },
    later: startVisit,
    updateNow: apply,
  }
}
