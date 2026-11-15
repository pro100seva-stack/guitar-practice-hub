export type PwaUpdateBlockReason =
  | 'offline'
  | 'unsafe'
  | 'coordinationUnavailable'
  | 'tabNotResponding'
  | 'workerFailed'

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

export function evaluatePwaUpdateReadiness(input: {
  online: boolean
  localSafe: boolean
  coordinationAvailable: boolean
  peerIds: readonly string[]
  replies: Readonly<Record<string, boolean | undefined>>
}): PwaUpdateReadiness {
  if (!input.online) return { ready: false, reason: 'offline' }
  if (!input.localSafe) return { ready: false, reason: 'unsafe' }
  if (!input.coordinationAvailable) return { ready: false, reason: 'coordinationUnavailable' }
  for (const peerId of input.peerIds) {
    const reply = input.replies[peerId]
    if (reply === undefined) return { ready: false, reason: 'tabNotResponding' }
    if (!reply) return { ready: false, reason: 'unsafe' }
  }
  return { ready: true }
}

export type PwaUpdateWorkflowOptions = {
  isOnline: () => boolean
  isLocalSafe: () => boolean
  isLocked?: () => boolean
  prepareTabs: () => Promise<PwaUpdateReadiness>
  canAutoApply?: () => boolean
  cancelTabs: () => void
  applyToTabs: () => boolean
  activateWorker: () => Promise<void>
  setLocked: (locked: boolean) => void
}

const initialSnapshot: PwaUpdateSnapshot = {
  waiting: false,
  visible: false,
  checking: false,
  applying: false,
  online: true,
  reason: null,
}

export function createPwaUpdateWorkflow(options: PwaUpdateWorkflowOptions) {
  let snapshot = initialSnapshot
  let deferred = false
  let operation: Promise<void> | null = null
  const listeners = new Set<() => void>()

  function publish(patch: Partial<PwaUpdateSnapshot>) {
    snapshot = { ...snapshot, ...patch }
    listeners.forEach((listener) => listener())
  }

  async function apply() {
    if (operation || !snapshot.waiting || snapshot.applying) return operation ?? Promise.resolve()
    if (options.isLocked?.()) return
    const online = options.isOnline()
    publish({ online, visible: true, reason: online ? null : 'offline' })
    if (!online) return
    if (!options.isLocalSafe()) {
      publish({ reason: 'unsafe' })
      return
    }

    options.setLocked(true)
    publish({ checking: true, reason: null })
    operation = (async () => {
      const readiness = await options.prepareTabs()
      if (!readiness.ready) {
        options.cancelTabs()
        options.setLocked(false)
        publish({ checking: false, applying: false, reason: readiness.reason })
        return
      }

      if (!options.applyToTabs()) {
        options.cancelTabs()
        options.setLocked(false)
        publish({ checking: false, applying: false, reason: 'coordinationUnavailable' })
        return
      }
      publish({ checking: false, applying: true, reason: null })
      await options.activateWorker()
    })().catch(() => {
      options.cancelTabs()
      options.setLocked(false)
      publish({ checking: false, applying: false, visible: true, reason: 'workerFailed' })
    }).finally(() => {
      operation = null
    })
    return operation
  }

  function onSafetyChange() {
    if (!snapshot.waiting || snapshot.applying || snapshot.checking) return
    if (!options.isLocalSafe()) {
      if (deferred) return
      publish({ visible: true, reason: 'unsafe' })
      return
    }
    if (deferred) {
      publish({ visible: true, reason: null })
      return
    }
    if (options.canAutoApply && !options.canAutoApply()) {
      publish({ visible: true, reason: null })
      return
    }
    void apply()
  }

  function onRetryOpportunity() {
    if (!snapshot.waiting || snapshot.applying || snapshot.checking) return
    const online = options.isOnline()
    const safe = options.isLocalSafe()
    const canAutoApply = options.canAutoApply?.() ?? true
    publish({
      online,
      visible: true,
      reason: !online ? 'offline' : !safe ? 'unsafe' : null,
    })
    if (deferred && (!online || !safe || !canAutoApply)) return
    deferred = false
    if (!canAutoApply) return
    void apply()
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    markWaiting() {
      deferred = false
      publish({ waiting: true, visible: true, reason: null })
      onSafetyChange()
    },
    markWorkerFailed() {
      options.setLocked(false)
      publish({ visible: true, checking: false, applying: false, reason: 'workerFailed' })
    },
    setOnline(online: boolean) {
      publish({ online })
      if (online) onRetryOpportunity()
      else if (snapshot.waiting) publish({ visible: true, reason: 'offline' })
    },
    onSafetyChange,
    onRetryOpportunity,
    later() {
      deferred = true
      publish({ visible: false })
    },
    updateNow() {
      deferred = false
      return apply()
    },
    applyFromPeer() {
      if (snapshot.applying) return Promise.resolve()
      options.setLocked(true)
      publish({ waiting: true, visible: true, checking: false, applying: true, reason: null })
      return options.activateWorker().catch(() => {
        options.setLocked(false)
        publish({ applying: false, visible: true, reason: 'workerFailed' })
      })
    },
  }
}
