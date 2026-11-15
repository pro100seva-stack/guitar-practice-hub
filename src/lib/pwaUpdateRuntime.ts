import { registerSW } from 'virtual:pwa-register'
import {
  createPwaUpdateWorkflow,
  evaluatePwaUpdateReadiness,
  shouldReloadForPwaControllerChange,
  type PwaUpdateBlockReason,
  type PwaUpdateSnapshot,
} from './pwaUpdate'

const tabKeyPrefix = 'pro100practice:pwa-update-tab:'
const tabLifetimeMs = 45_000
const peerTimeoutMs = 1_800
const activationTimeoutMs = 15_000
const preparedLockTimeoutMs = peerTimeoutMs + 5_000
const updateCheckIntervalMs = 5 * 60_000
const guardStates = new Map<string, boolean>()
const guardListeners = new Set<() => void>()
let locked = false
let tabId: string | null = null
let channel: BroadcastChannel | null = null
let updateWorker: ((reloadPage?: boolean) => Promise<void>) | null = null
let registration: ServiceWorkerRegistration | null = null
let heartbeatTimer: number | null = null
let updateCheckTimer: number | null = null
let workflow: ReturnType<typeof createPwaUpdateWorkflow> | null = null
let initialized = false
let applyingReload = false
let reloadedThisBoot = false
let activationTimer: number | null = null
let activationFinished: (() => void) | null = null
let currentPrepareRequestId: string | null = null
const preparedRequests = new Set<string>()
const preparedTimers = new Map<string, number>()
const uninitializedSnapshot: PwaUpdateSnapshot = {
  waiting: false,
  visible: false,
  checking: false,
  applying: false,
  online: true,
  reason: null,
}

type UpdateMessage =
  | { kind: 'prepare'; from: string; to: string; requestId: string }
  | { kind: 'prepared'; from: string; to: string; requestId: string; safe: boolean }
  | { kind: 'apply'; from: string }
  | { kind: 'cancel'; from: string; requestId: string }

type TabStorage = Pick<Storage, 'length' | 'key' | 'getItem' | 'setItem' | 'removeItem'>

function getStorage(): TabStorage | null {
  try { return window.localStorage } catch { return null }
}

function id() {
  try { return crypto.randomUUID() } catch { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}` }
}

function notify() {
  guardListeners.forEach((listener) => listener())
}

function isSafe() {
  return guardStates.size > 0 && Array.from(guardStates.values()).every(Boolean)
}

function setLocked(next: boolean) {
  locked = next
  notify()
}

function getPeerIds(): string[] | null {
  const storage = getStorage()
  if (!storage || !tabId) return null
  try {
    const peers: string[] = []
    const keys: string[] = []
    const now = Date.now()
    const ownLease = Number(storage.getItem(`${tabKeyPrefix}${tabId}`))
    if (!Number.isFinite(ownLease) || now - ownLease > tabLifetimeMs || ownLease > now + 5_000) return null
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index)
      if (key?.startsWith(tabKeyPrefix)) keys.push(key)
    }
    for (const key of keys) {
      const peerId = key.slice(tabKeyPrefix.length)
      const seenAt = Number(storage.getItem(key))
      if (!Number.isFinite(seenAt) || now - seenAt > tabLifetimeMs || seenAt > now + 5_000) {
        storage.removeItem(key)
      } else if (peerId !== tabId) {
        peers.push(peerId)
      }
    }
    return peers
  } catch {
    return null
  }
}

function beat() {
  if (!tabId) return false
  const storage = getStorage()
  if (!storage) return false
  try {
    storage.setItem(`${tabKeyPrefix}${tabId}`, String(Date.now()))
    return true
  } catch {
    return false
  }
}

function cancelPreparedTabs(requestId: string) {
  if (!channel || !tabId) return
  try { channel.postMessage({ kind: 'cancel', from: tabId, requestId } satisfies UpdateMessage) } catch { /* fail closed at the caller */ }
}

function collectTabReadiness(): Promise<ReturnType<typeof evaluatePwaUpdateReadiness>> {
  const peers = getPeerIds()
  const currentChannel = channel
  const currentTabId = tabId
  if (!currentChannel || !currentTabId || peers === null) {
    return Promise.resolve(evaluatePwaUpdateReadiness({
      online: navigator.onLine,
      localSafe: isSafe(),
      coordinationAvailable: false,
      peerIds: [],
      replies: {},
    }))
  }

  const requestId = id()
  currentPrepareRequestId = requestId
  const replies: Record<string, boolean | undefined> = {}
  const expected = new Set(peers)
  let resolved = false

  return new Promise((resolve) => {
    const finish = () => {
      if (resolved) return
      resolved = true
      window.clearTimeout(timeout)
      currentChannel.removeEventListener('message', onMessage)
      resolve(evaluatePwaUpdateReadiness({
        online: navigator.onLine,
        localSafe: isSafe(),
        coordinationAvailable: true,
        peerIds: peers,
        replies,
      }))
    }
    const onMessage = (event: MessageEvent<UpdateMessage>) => {
      const message = event.data
      if (!message || typeof message !== 'object') return
      if (message.kind !== 'prepared' || message.to !== currentTabId || message.requestId !== requestId || !expected.has(message.from)) return
      replies[message.from] = message.safe
      expected.delete(message.from)
      if (!expected.size) finish()
    }
    const timeout = window.setTimeout(finish, peerTimeoutMs)
    currentChannel.addEventListener('message', onMessage)
    if (peers.length === 0) {
      finish()
      return
    }
    for (const peerId of peers) {
      try {
        currentChannel.postMessage({ kind: 'prepare', from: currentTabId, to: peerId, requestId } satisfies UpdateMessage)
      } catch {
        finish()
        return
      }
    }
  })
}

function activateWorker() {
  const worker = updateWorker
  if (!worker) return Promise.reject(new Error('Service worker update is unavailable'))
  applyingReload = true
  reloadedThisBoot = false
  return new Promise<void>((resolve, reject) => {
    activationFinished = () => {
      if (activationTimer !== null) window.clearTimeout(activationTimer)
      activationTimer = null
      activationFinished = null
      resolve()
    }
    activationTimer = window.setTimeout(() => {
      activationTimer = null
      applyingReload = false
      activationFinished = null
      reject(new Error('Service worker activation timed out'))
    }, activationTimeoutMs)
    const fail = (error: unknown) => {
      if (activationTimer !== null) window.clearTimeout(activationTimer)
      activationTimer = null
      activationFinished = null
      applyingReload = false
      reject(error)
    }
    try { void worker(false).catch(fail) } catch (error: unknown) { fail(error) }
  })
}

function applyToTabs() {
  if (!channel || !tabId) return false
  try {
    channel.postMessage({ kind: 'apply', from: tabId } satisfies UpdateMessage)
    return true
  } catch {
    return false
  }
}

function startWorkflow() {
  workflow = createPwaUpdateWorkflow({
    isOnline: () => navigator.onLine,
    isLocalSafe: isSafe,
    isLocked: () => locked,
    prepareTabs: collectTabReadiness,
    canAutoApply: () => {
      const peers = getPeerIds()
      return Boolean(channel && tabId && peers !== null && peers.every((peerId) => tabId!.localeCompare(peerId) < 0))
    },
    cancelTabs: () => {
      if (currentPrepareRequestId) cancelPreparedTabs(currentPrepareRequestId)
      currentPrepareRequestId = null
    },
    applyToTabs,
    activateWorker,
    setLocked,
  })
  workflow.subscribe(notify)
}

function handleMessage(event: MessageEvent<UpdateMessage>) {
  const message = event.data
  if (!message || typeof message !== 'object' || !('kind' in message) || !tabId || message.from === tabId) return
  if (message.kind === 'prepare' && message.to === tabId) {
    const safe = navigator.onLine && isSafe() && !locked && updateWorker !== null && Boolean(registration?.waiting)
    if (safe) {
      preparedRequests.add(message.requestId)
      const timer = window.setTimeout(() => {
        preparedRequests.delete(message.requestId)
        preparedTimers.delete(message.requestId)
        if (!preparedRequests.size && !workflow?.getSnapshot().checking && !workflow?.getSnapshot().applying) {
          setLocked(false)
          workflow?.onSafetyChange()
        }
      }, preparedLockTimeoutMs)
      preparedTimers.set(message.requestId, timer)
      setLocked(true)
    }
    try {
      channel?.postMessage({ kind: 'prepared', from: tabId, to: message.from, requestId: message.requestId, safe } satisfies UpdateMessage)
    } catch {
      if (safe) {
        preparedRequests.delete(message.requestId)
        const timer = preparedTimers.get(message.requestId)
        if (timer !== undefined) window.clearTimeout(timer)
        preparedTimers.delete(message.requestId)
        if (!preparedRequests.size) setLocked(false)
      }
    }
  } else if (message.kind === 'apply') {
    if (!preparedRequests.size) return
    preparedRequests.clear()
    preparedTimers.forEach((timer) => window.clearTimeout(timer))
    preparedTimers.clear()
    void workflow?.applyFromPeer()
  } else if (message.kind === 'cancel') {
    preparedRequests.delete(message.requestId)
    const timer = preparedTimers.get(message.requestId)
    if (timer !== undefined) window.clearTimeout(timer)
    preparedTimers.delete(message.requestId)
    if (!preparedRequests.size && !workflow?.getSnapshot().checking && !workflow?.getSnapshot().applying) {
      setLocked(false)
      workflow?.onSafetyChange()
    }
  }
}

function checkForUpdate() {
  if (!navigator.onLine || document.visibilityState !== 'visible' || !registration) return
  try {
    void registration.update().catch(() => {
      if (!locked && workflow?.getSnapshot().waiting) workflow.markWorkerFailed()
    })
  } catch {
    if (!locked && workflow?.getSnapshot().waiting) workflow.markWorkerFailed()
  }
}

function reloadAfterControllerChange() {
  if (!shouldReloadForPwaControllerChange(applyingReload, reloadedThisBoot)) return
  reloadedThisBoot = true
  applyingReload = false
  activationFinished?.()
  window.location.reload()
}

export function initializePwaUpdates() {
  if (initialized || typeof window === 'undefined' || !('serviceWorker' in navigator)) return
  initialized = true
  startWorkflow()
  tabId = id()
  beat()
  try {
    if ('BroadcastChannel' in window) {
      channel = new BroadcastChannel('pro100practice:pwa-update:v1')
      channel.addEventListener('message', handleMessage)
    }
  } catch {
    channel = null
  }
  const startHeartbeat = () => {
    beat()
    if (heartbeatTimer === null) heartbeatTimer = window.setInterval(beat, 10_000)
  }
  const stopHeartbeat = () => {
    if (heartbeatTimer !== null) window.clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
  const startUpdateChecks = () => {
    if (updateCheckTimer === null) updateCheckTimer = window.setInterval(checkForUpdate, updateCheckIntervalMs)
  }
  const stopUpdateChecks = () => {
    if (updateCheckTimer !== null) window.clearInterval(updateCheckTimer)
    updateCheckTimer = null
  }
  startHeartbeat()
  window.addEventListener('pagehide', (event: PageTransitionEvent) => {
    stopHeartbeat()
    stopUpdateChecks()
    if (event.persisted) return
    const storage = getStorage()
    try { if (storage && tabId) storage.removeItem(`${tabKeyPrefix}${tabId}`) } catch { /* next tab heartbeat expires it */ }
  })
  navigator.serviceWorker.addEventListener('controllerchange', reloadAfterControllerChange)
  let updateSW: (reloadPage?: boolean) => Promise<void>
  try {
    updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        workflow?.markWaiting()
      },
      onRegisteredSW(_scriptUrl, currentRegistration) {
        registration = currentRegistration ?? null
        registration?.addEventListener('updatefound', () => {
          const installing = registration?.installing
          installing?.addEventListener('statechange', () => {
            if (!locked && installing.state === 'redundant' && registration?.waiting) workflow?.markWorkerFailed()
          })
        })
        if (document.visibilityState === 'visible') startUpdateChecks()
        checkForUpdate()
      },
    })
  } catch {
    return
  }
  updateWorker = (reloadPage) => updateSW(reloadPage)
  const retryOpportunity = () => workflow?.onRetryOpportunity()
  const onResume = () => {
    startHeartbeat()
    startUpdateChecks()
    retryOpportunity()
    checkForUpdate()
  }
  const onOnline = () => {
    workflow?.setOnline(true)
    checkForUpdate()
  }
  const onOffline = () => workflow?.setOnline(false)
  const onVisibility = () => {
    if (document.visibilityState === 'visible') {
      startHeartbeat()
      startUpdateChecks()
      workflow?.onRetryOpportunity()
      checkForUpdate()
    } else {
      stopUpdateChecks()
    }
  }
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  window.addEventListener('focus', onResume)
  window.addEventListener('pageshow', onResume)
  document.addEventListener('visibilitychange', onVisibility)
  window.setTimeout(checkForUpdate, 0)
}

export function registerPwaUpdateGuard(key: string, safe: boolean) {
  guardStates.set(key, safe)
  notify()
  workflow?.onSafetyChange()
  return () => {
    guardStates.delete(key)
    notify()
    workflow?.onSafetyChange()
  }
}

export function setPwaUpdateGuard(key: string, safe: boolean) {
  if (guardStates.get(key) === safe) return
  guardStates.set(key, safe)
  notify()
  workflow?.onSafetyChange()
}

export function subscribePwaUpdate(listener: () => void) {
  guardListeners.add(listener)
  return () => {
    guardListeners.delete(listener)
  }
}

export function getPwaUpdateSnapshot(): PwaUpdateSnapshot {
  return workflow?.getSnapshot() ?? uninitializedSnapshot
}

export function isPwaUpdateLocked() {
  return locked
}

export function updatePwaSafetyChanged() {
  workflow?.onSafetyChange()
}

export function pwaReasonKey(reason: PwaUpdateBlockReason | null) {
  switch (reason) {
    case 'offline': return 'pwa.offline'
    case 'unsafe': return 'pwa.safetyBlocked'
    case 'coordinationUnavailable': return 'pwa.coordinationUnavailable'
    case 'tabNotResponding': return 'pwa.tabNotResponding'
    case 'workerFailed': return 'pwa.workerFailed'
    default: return null
  }
}

export function pwaUpdateNow() {
  return workflow?.updateNow() ?? Promise.resolve()
}

export function pwaUpdateLater() {
  workflow?.later()
}
