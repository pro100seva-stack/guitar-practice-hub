export const chunkRecoveryStorageKey = 'gph:lazy-chunk-reload'
export const chunkRecoveryCooldownMs = 5 * 60 * 1000

export const lazyPageReadyHandle = 'gph:resolved-lazy-page'

export function isRenderedLazyPageReady(handle: unknown, navigationState: string): boolean {
  return handle === lazyPageReadyHandle && navigationState === 'idle'
}

export function isLazyChunkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : ''
  return /failed to fetch dynamically imported module|importing a module script failed|loading chunk\s+\S+\s+failed/i.test(message)
}

type RecoveryEnvironment = {
  isOnline: () => boolean
  storage: () => Pick<Storage, 'getItem' | 'setItem'>
  reload: () => void
  now: () => number
}

export function createLazyChunkRecovery(environment: RecoveryEnvironment) {
  let attempted = false
  let initialLoad = true

  return {
    markRouteReady() {
      initialLoad = false
    },
    retryManually() {
      attempted = true
      try {
        environment.storage().setItem(chunkRecoveryStorageKey, String(environment.now()))
      } catch {
        return environment.reload()
      }
      environment.reload()
    },
    recover(error: unknown): boolean {
      if (!isLazyChunkError(error) || !initialLoad || attempted || !environment.isOnline()) return false
      try {
        const storage = environment.storage()
        const previous = storage.getItem(chunkRecoveryStorageKey)
        const now = environment.now()
        if (previous !== null) {
          const timestamp = Number(previous)
          if (!Number.isFinite(timestamp) || now - timestamp < chunkRecoveryCooldownMs) return false
        }
        storage.setItem(chunkRecoveryStorageKey, String(now))
      } catch {
        return false
      }
      attempted = true
      environment.reload()
      return true
    },
  }
}

export const lazyChunkRecovery = createLazyChunkRecovery({
  isOnline: () => navigator.onLine,
  storage: () => window.sessionStorage,
  reload: () => window.location.reload(),
  now: () => Date.now(),
})

export function attachPreloadRecovery(target: Window) {
  const onPreloadError = (event: Event) => {
    if ('payload' in event) lazyChunkRecovery.recover(event.payload)
  }
  target.addEventListener('vite:preloadError', onPreloadError)
  return () => target.removeEventListener('vite:preloadError', onPreloadError)
}