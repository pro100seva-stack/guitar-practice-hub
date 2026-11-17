import { registerSW } from 'virtual:pwa-register'
import { createPwaUpdateWorkflow, shouldReloadForPwaControllerChange, type PwaUpdateBlockReason, type PwaUpdateReadiness, type PwaUpdateSnapshot } from './pwaUpdate'

const protocol = 'PRO100PRACTICE_UPDATE_V2'
const requestTimeoutMs = 3_000
const activationTimeoutMs = 15_000
const startupTimeoutMs = 15_000
const updateCheckIntervalMs = 5 * 60_000
const guardStates = new Map<string, boolean>()
const guardListeners = new Set<() => void>()
let locked = false
let registration: ServiceWorkerRegistration | null = null
let workflow: ReturnType<typeof createPwaUpdateWorkflow> | null = null
let initialized = false
let applyingReload = false
let reloadedThisBoot = false
let activationFinished: (() => void) | null = null
let approval: { worker: ServiceWorker; token: string; requestId: string } | null = null
let updateCheckTimer: number | null = null
const uninitializedSnapshot: PwaUpdateSnapshot = { waiting: false, visible: false, checking: false, applying: false, online: true, reason: null }

function notify() { guardListeners.forEach((listener) => listener()) }
function isSafe() { return guardStates.size > 0 && Array.from(guardStates.values()).every(Boolean) }
function setLocked(next: boolean) { locked = next; notify() }

function askWorker(worker: ServiceWorker, action: 'inspect' | 'activate', id: string, token?: string): Promise<{ ready: boolean; reason?: PwaUpdateBlockReason; token?: string }> {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel()
    const finish = (result?: { ready: boolean; reason?: PwaUpdateBlockReason; token?: string }) => {
      window.clearTimeout(timeout)
      channel.port1.close()
      channel.port2.close()
      if (result) resolve(result)
      else reject(new Error('Update coordination unavailable'))
    }
    const timeout = window.setTimeout(() => finish(), requestTimeoutMs)
    channel.port1.onmessage = (event: MessageEvent<unknown>) => {
      const value = event.data
      if (!value || typeof value !== 'object' || !('protocol' in value) || value.protocol !== protocol || !('requestId' in value) || value.requestId !== id || !('ready' in value) || typeof value.ready !== 'boolean') return
      const reason = 'reason' in value && value.reason === 'otherWindows' ? 'otherWindows' : 'coordinationUnavailable'
      const nextToken = 'token' in value && typeof value.token === 'string' ? value.token : undefined
      finish({ ready: value.ready, reason: value.ready ? undefined : reason, token: nextToken })
    }
    try { worker.postMessage({ protocol, action, requestId: id, token }, [channel.port2]) } catch { finish() }
  })
}

async function prepareUpdate(): Promise<PwaUpdateReadiness> {
  approval = null
  const worker = registration?.waiting
  if (!worker || typeof MessageChannel === 'undefined' || typeof crypto.randomUUID !== 'function') return { ready: false, reason: 'coordinationUnavailable' }
  try {
    const id = crypto.randomUUID()
    const result = await askWorker(worker, 'inspect', id)
    if (!result.ready || !result.token) return { ready: false, reason: result.reason ?? 'coordinationUnavailable' }
    if (registration?.waiting !== worker) return { ready: false, reason: 'workerFailed' }
    approval = { worker, requestId: id, token: result.token }
    return { ready: true }
  } catch { return { ready: false, reason: 'coordinationUnavailable' } }
}

async function activateWorker() {
  const current = approval
  approval = null
  if (!current || registration?.waiting !== current.worker || !isSafe() || !navigator.onLine) throw new Error('Update approval expired')
  applyingReload = true
  reloadedThisBoot = false
  await new Promise<void>((resolve, reject) => {
    const fail = () => {
      window.clearTimeout(timeout)
      applyingReload = false
      activationFinished = null
      reject(new Error('Service worker activation unavailable'))
    }
    const timeout = window.setTimeout(fail, activationTimeoutMs)
    activationFinished = () => { window.clearTimeout(timeout); activationFinished = null; resolve() }
    void askWorker(current.worker, 'activate', current.requestId, current.token).then((result) => { if (!result.ready) fail() }).catch(fail)
  })
}

function reloadAfterControllerChange() {
  if (!shouldReloadForPwaControllerChange(applyingReload, reloadedThisBoot)) return
  if (!isSafe() || !navigator.onLine) return
  reloadedThisBoot = true
  applyingReload = false
  activationFinished?.()
  window.location.reload()
}

/** Lifecycle checks never offer a newly discovered update during an active visit. */
function checkForUpdate() {
  if (!navigator.onLine || document.visibilityState !== 'visible' || !registration) return
  void registration.update().catch(() => { if (workflow?.getSnapshot().waiting) workflow.markWorkerFailed() })
}

export function initializePwaUpdates() {
  if (initialized || typeof window === 'undefined' || !('serviceWorker' in navigator)) return
  initialized = true
  workflow = createPwaUpdateWorkflow({ isOnline: () => navigator.onLine, isLocalSafe: isSafe, prepare: prepareUpdate, activateWorker, setLocked })
  workflow.subscribe(notify)
  const startupDeadline = window.setTimeout(() => workflow?.finishStartup(), startupTimeoutMs)
  const finishStartup = () => { window.clearTimeout(startupDeadline); workflow?.finishStartup() }
  const observeInstallation = (worker: ServiceWorker) => {
    const onState = () => {
      if (worker.state !== 'installed' && worker.state !== 'redundant') return
      worker.removeEventListener('statechange', onState)
      if (registration?.waiting) workflow?.markWaiting()
      finishStartup()
    }
    worker.addEventListener('statechange', onState)
    onState()
  }
  const onInteraction = (event: Event) => {
    if (event.target instanceof Element && event.target.closest('[data-pwa-update-control]')) return
    if (event instanceof KeyboardEvent && ['Tab', 'Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) return
    workflow?.startVisit()
  }
  ;['pointerdown', 'click', 'keydown', 'beforeinput', 'input', 'change', 'submit'].forEach((type) => document.addEventListener(type, onInteraction, true))
  window.addEventListener('popstate', () => workflow?.startVisit())
  window.addEventListener('hashchange', () => workflow?.startVisit())
  navigator.serviceWorker.addEventListener('controllerchange', reloadAfterControllerChange)
  try {
    registerSW({
      immediate: true,
      // The plugin otherwise installs an unconditional reload handler of its own.
      onNeedReload: reloadAfterControllerChange,
      onNeedRefresh() { workflow?.markWaiting() },
      onRegisterError() { finishStartup() },
      onRegisteredSW(_scriptUrl, currentRegistration) {
        registration = currentRegistration ?? null
        if (!registration) { finishStartup(); return }
        registration.addEventListener('updatefound', () => { if (registration?.installing) observeInstallation(registration.installing) })
        if (registration.waiting) workflow?.markWaiting()
        if (registration.installing) observeInstallation(registration.installing)
        void registration.update().then(() => {
          if (registration?.waiting) workflow?.markWaiting()
          if (registration?.installing) observeInstallation(registration.installing)
          else finishStartup()
        }).catch(finishStartup)
      },
    })
  } catch { finishStartup() }
  const startChecks = () => { if (updateCheckTimer === null) updateCheckTimer = window.setInterval(checkForUpdate, updateCheckIntervalMs) }
  const stopChecks = () => { if (updateCheckTimer !== null) window.clearInterval(updateCheckTimer); updateCheckTimer = null }
  const resume = () => { startChecks(); workflow?.onRetryOpportunity(); checkForUpdate() }
  window.addEventListener('focus', resume)
  // BFCache restoration/resume never resets this document's startup phase.
  window.addEventListener('pageshow', resume)
  window.addEventListener('pagehide', stopChecks)
  window.addEventListener('online', () => { workflow?.setOnline(true); checkForUpdate() })
  window.addEventListener('offline', () => workflow?.setOnline(false))
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') resume(); else stopChecks() })
  if (document.visibilityState === 'visible') startChecks()
}

export function registerPwaUpdateGuard(key: string, safe: boolean) {
  guardStates.set(key, safe)
  notify()
  workflow?.onSafetyChange()
  return () => { guardStates.delete(key); notify(); workflow?.onSafetyChange() }
}
export function setPwaUpdateGuard(key: string, safe: boolean) {
  if (guardStates.get(key) === safe) return
  guardStates.set(key, safe)
  notify()
  workflow?.onSafetyChange()
}
export function subscribePwaUpdate(listener: () => void) { guardListeners.add(listener); return () => { guardListeners.delete(listener) } }
export function getPwaUpdateSnapshot(): PwaUpdateSnapshot { return workflow?.getSnapshot() ?? uninitializedSnapshot }
export function isPwaUpdateLocked() { return locked }
export function updatePwaSafetyChanged() { workflow?.onSafetyChange() }
export function pwaReasonKey(reason: PwaUpdateBlockReason | null) {
  switch (reason) {
    case 'offline': return 'pwa.offline'
    case 'unsafe': return 'pwa.safetyBlocked'
    case 'coordinationUnavailable': return 'pwa.coordinationUnavailable'
    case 'otherWindows': return 'pwa.otherWindows'
    case 'workerFailed': return 'pwa.workerFailed'
    default: return null
  }
}
export function pwaUpdateNow() { return workflow?.updateNow() ?? Promise.resolve() }
export function pwaUpdateLater() { workflow?.later() }
