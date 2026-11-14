import { describe, expect, it, vi } from 'vitest'
import { createReleaseNoticeReceipts, releaseNoticePendingKey, releaseNoticeStorageKey, type ReleaseReceiptStorage } from '../src/lib/releaseNoticeReceipt'

function memoryStorage(): ReleaseReceiptStorage {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value) },
    removeItem: (key) => { values.delete(key) },
  }
}

function syncParameters(overrides: Partial<Parameters<ReturnType<typeof createReleaseNoticeReceipts>['syncPending']>[0]> = {}) {
  return {
    owner: 'account-a',
    storage: memoryStorage(),
    claim: vi.fn(async () => true),
    isCurrent: () => true,
    ...overrides,
  }
}

describe('release notice dismissal receipts', () => {
  it('does not create or synchronize a receipt merely because the notice is opened', async () => {
    const storage = memoryStorage()
    const receipts = createReleaseNoticeReceipts()
    const input = syncParameters({ storage, claim: vi.fn(async () => false) })

    expect(await receipts.syncPending(input)).toBe('empty')
    expect(receipts.hasSeen(input.owner, '0.9.0', storage)).toBe(false)
    expect(input.claim).not.toHaveBeenCalled()
    expect(storage.getItem(releaseNoticeStorageKey(input.owner))).toBeNull()
  })

  it('persists only an explicit dismissal and retries its queue after a fresh manager is created', async () => {
    const storage = memoryStorage()
    const firstSession = createReleaseNoticeReceipts()
    firstSession.dismiss('account-a', '0.9.0', storage)
    expect(storage.getItem(releaseNoticeStorageKey('account-a'))).toBe('0.9.0')
    expect(storage.getItem(releaseNoticePendingKey('account-a'))).toBe('0.9.0')

    const afterRestart = createReleaseNoticeReceipts()
    const input = syncParameters({ storage, claim: vi.fn(async () => true) })
    expect(await afterRestart.syncPending(input)).toBe('synced')
    expect(input.claim).toHaveBeenCalledWith('0.9.0')
    expect(storage.getItem(releaseNoticePendingKey('account-a'))).toBeNull()
    expect(afterRestart.hasSeen('account-a', '0.9.0', storage)).toBe(true)
  })

  it('treats a false monotonic claim result as successful synchronization', async () => {
    const storage = memoryStorage()
    const receipts = createReleaseNoticeReceipts()
    receipts.dismiss('account-a', '0.9.0', storage)
    const input = syncParameters({ storage, claim: vi.fn(async () => false) })

    expect(await receipts.syncPending(input)).toBe('synced')
    expect(storage.getItem(releaseNoticePendingKey('account-a'))).toBeNull()
    expect(receipts.hasSeen('account-a', '0.9.0', storage)).toBe(true)
  })

  it('reconciles an authenticated server version locally without queueing a claim', () => {
    const storage = memoryStorage()
    const receipts = createReleaseNoticeReceipts()
    receipts.reconcileServerVersion('account-a', '0.10.0', storage)

    expect(receipts.hasSeen('account-a', '0.9.0', storage)).toBe(true)
    expect(storage.getItem(releaseNoticeStorageKey('account-a'))).toBe('0.10.0')
    expect(storage.getItem(releaseNoticePendingKey('account-a'))).toBeNull()
    receipts.reconcileServerVersion('account-a', 'invalid', storage)
    expect(storage.getItem(releaseNoticeStorageKey('account-a'))).toBe('0.10.0')
  })

  it('never rolls a newer local receipt back to an older server version', () => {
    const storage = memoryStorage()
    const receipts = createReleaseNoticeReceipts()
    receipts.remember('account-a', '0.10.0', storage)
    receipts.reconcileServerVersion('account-a', '0.9.0', storage)

    expect(storage.getItem(releaseNoticeStorageKey('account-a'))).toBe('0.10.0')
  })

  it('retains the durable pending receipt after an actual network failure and retries later', async () => {
    const storage = memoryStorage()
    const receipts = createReleaseNoticeReceipts()
    receipts.dismiss('account-a', '0.9.0', storage)
    const input = syncParameters({ storage, claim: vi.fn(async (): Promise<boolean> => { throw new Error('offline') }) })

    expect(await receipts.syncPending(input)).toBe('deferred')
    expect(storage.getItem(releaseNoticePendingKey('account-a'))).toBe('0.9.0')
    input.claim = vi.fn(async () => true)
    expect(await receipts.syncPending(input)).toBe('synced')
    expect(storage.getItem(releaseNoticePendingKey('account-a'))).toBeNull()
  })

  it('does not clear a pending receipt when the UID changes while a claim is in flight', async () => {
    const storage = memoryStorage()
    const receipts = createReleaseNoticeReceipts()
    receipts.dismiss('account-a', '0.9.0', storage)
    let current = true
    let resolve: (value: boolean) => void = () => {}
    const request = new Promise<boolean>((done) => { resolve = done })
    const pending = receipts.syncPending(syncParameters({ storage, isCurrent: () => current, claim: () => request }))

    current = false
    resolve(true)
    expect(await pending).toBe('deferred')
    expect(storage.getItem(releaseNoticePendingKey('account-a'))).toBe('0.9.0')
  })

  it('scopes receipts and queues independently by UID', async () => {
    const storage = memoryStorage()
    const receipts = createReleaseNoticeReceipts()
    receipts.dismiss('account-a', '0.9.0', storage)
    expect(receipts.hasSeen('account-b', '0.9.0', storage)).toBe(false)
    expect(await receipts.syncPending(syncParameters({ owner: 'account-b', storage }))).toBe('empty')
    expect(storage.getItem(releaseNoticePendingKey('account-a'))).toBe('0.9.0')
  })

  it('shares an in-flight claim for the same owner without losing the queued receipt', async () => {
    const storage = memoryStorage()
    const receipts = createReleaseNoticeReceipts()
    receipts.dismiss('account-a', '0.9.0', storage)
    let resolve: (value: boolean) => void = () => {}
    const request = new Promise<boolean>((done) => { resolve = done })
    const input = syncParameters({ storage, claim: vi.fn(() => request) })
    const first = receipts.syncPending(input)

    expect(await receipts.syncPending(input)).toBe('deferred')
    expect(input.claim).toHaveBeenCalledTimes(1)
    resolve(true)
    expect(await first).toBe('synced')
    expect(storage.getItem(releaseNoticePendingKey('account-a'))).toBeNull()
  })

  it('preserves a newer pending receipt when an older release finishes synchronizing', async () => {
    const storage = memoryStorage()
    const receipts = createReleaseNoticeReceipts()
    receipts.dismiss('account-a', '0.9.0', storage)
    let resolve: (value: boolean) => void = () => {}
    const request = new Promise<boolean>((done) => { resolve = done })
    const first = receipts.syncPending(syncParameters({ storage, claim: () => request }))
    receipts.dismiss('account-a', '0.10.0', storage)
    resolve(true)

    expect(await first).toBe('synced')
    expect(storage.getItem(releaseNoticePendingKey('account-a'))).toBe('0.10.0')
  })

  it('retains session-only receipts when browser storage is unavailable', async () => {
    const unavailable: ReleaseReceiptStorage = {
      getItem: () => { throw new Error('denied') },
      setItem: () => { throw new Error('quota') },
    }
    const receipts = createReleaseNoticeReceipts()
    receipts.dismiss('account-a', '0.9.0', unavailable)
    const input = syncParameters({ storage: unavailable, claim: vi.fn(async () => false) })

    expect(receipts.hasSeen('account-a', '0.9.0', unavailable)).toBe(true)
    expect(await receipts.syncPending(input)).toBe('synced')
    expect(input.claim).toHaveBeenCalledTimes(1)
  })
})
