import { compareReleaseVersions } from './releaseNotes'

export type ReleaseReceiptStorage = Pick<Storage, 'getItem' | 'setItem'> & Partial<Pick<Storage, 'removeItem'>>
export type ReleaseReceiptSyncResult = 'synced' | 'empty' | 'deferred'

export const releaseNoticeStorageKey = (owner: string) => `pro100practice:release-shown:${encodeURIComponent(owner)}`
export const releaseNoticePendingKey = (owner: string) => `${releaseNoticeStorageKey(owner)}:pending`

function newestVersion(left: string | null, right: string) {
  return left && (compareReleaseVersions(left, right) ?? -1) >= 0 ? left : right
}

function storedVersion(storage: ReleaseReceiptStorage | null | undefined, key: string) {
  try {
    const value = storage?.getItem(key) ?? null
    return value && compareReleaseVersions(value, value) === 0 ? value : null
  } catch {
    return null
  }
}

function forget(storage: ReleaseReceiptStorage | null | undefined, key: string) {
  try {
    if (storage?.removeItem) storage.removeItem(key)
    else storage?.setItem(key, '')
  } catch { /* The in-memory queue remains available for this session. */ }
}

/** Owner-scoped local receipts and a retryable queue for explicit dismissals. */
export function createReleaseNoticeReceipts() {
  const seen = new Map<string, string>()
  const pending = new Map<string, string>()
  const inFlight = new Set<string>()

  function previous(owner: string, storage?: ReleaseReceiptStorage | null) {
    const inMemory = seen.get(owner) ?? null
    const stored = storedVersion(storage, releaseNoticeStorageKey(owner))
    if (inMemory && stored) return newestVersion(inMemory, stored)
    return inMemory ?? stored
  }

  function hasSeen(owner: string, version: string, storage?: ReleaseReceiptStorage | null) {
    if (!owner || compareReleaseVersions(version, version) !== 0) return false
    const stored = previous(owner, storage)
    return Boolean(stored && (compareReleaseVersions(stored, version) ?? -1) >= 0)
  }

  function remember(owner: string, version: string, storage?: ReleaseReceiptStorage | null) {
    if (!owner || compareReleaseVersions(version, version) !== 0) return
    const old = previous(owner, storage)
    const latest = old ? newestVersion(old, version) : version
    seen.set(owner, latest)
    try {
      const key = releaseNoticeStorageKey(owner)
      if (storage?.getItem(key) !== latest) storage?.setItem(key, latest)
    } catch { /* The server and in-memory receipt still prevent a repeat this session. */ }
  }

  function reconcileServerVersion(owner: string, version: string | null, storage?: ReleaseReceiptStorage | null) {
    if (version && compareReleaseVersions(version, version) === 0) remember(owner, version, storage)
  }

  function pendingVersion(owner: string, storage?: ReleaseReceiptStorage | null) {
    const fromMemory = pending.get(owner) ?? null
    const fromStorage = storedVersion(storage, releaseNoticePendingKey(owner))
    if (fromMemory && fromStorage) return newestVersion(fromMemory, fromStorage)
    return fromMemory ?? fromStorage
  }

  function dismiss(owner: string, version: string, storage?: ReleaseReceiptStorage | null) {
    if (!owner || compareReleaseVersions(version, version) !== 0) return
    const queued = pendingVersion(owner, storage)
    const latest = queued ? newestVersion(queued, version) : version
    pending.set(owner, latest)
    try { storage?.setItem(releaseNoticePendingKey(owner), latest) } catch {
      // Retain the queue in memory if persistence is unavailable or denied.
    }
    remember(owner, version, storage)
  }

  async function syncPending({ owner, storage, claim, isCurrent }: {
    owner: string
    storage?: ReleaseReceiptStorage | null
    claim: (version: string) => Promise<boolean>
    isCurrent: () => boolean
  }): Promise<ReleaseReceiptSyncResult> {
    if (!owner || !isCurrent()) return 'deferred'
    const version = pendingVersion(owner, storage)
    if (!version) return 'empty'
    if (inFlight.has(owner)) return 'deferred'
    inFlight.add(owner)
    try {
      await claim(version)
      // A stale response must not consume the queue for a different current account.
      if (!isCurrent()) return 'deferred'
      remember(owner, version, storage)
      const queued = pendingVersion(owner, storage)
      if (queued && (compareReleaseVersions(queued, version) ?? 1) <= 0) {
        pending.delete(owner)
        forget(storage, releaseNoticePendingKey(owner))
      }
      return 'synced'
    } catch {
      // Offline or unavailable RPC: keep the durable pending receipt for a later retry.
      return 'deferred'
    } finally {
      inFlight.delete(owner)
    }
  }

  return { hasSeen, remember, reconcileServerVersion, dismiss, pendingVersion, syncPending }
}

export const releaseNoticeReceipts = createReleaseNoticeReceipts()
