import { describe, expect, it, vi } from 'vitest'
import { createReleaseNoticeReceipts, releaseNoticeStorageKey } from '../src/lib/releaseNoticeReceipt'
import { releaseAcknowledgementKey } from '../src/lib/releaseNotes'

function memoryStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
  }
}

function parameters(overrides: Partial<Parameters<ReturnType<typeof createReleaseNoticeReceipts>['claimAndShow']>[0]> = {}) {
  return {
    owner: 'account-a', version: '0.9.0', storage: memoryStorage(),
    claim: vi.fn(async () => true), isCurrent: () => true, canShow: () => true, show: vi.fn(),
    ...overrides,
  }
}

describe('account-wide release receipts', () => {
  it('records the receipt before showing, so reload before dismissal cannot repeat it', async () => {
    const cache = memoryStorage()
    const receipts = createReleaseNoticeReceipts()
    const input = parameters({ storage: cache, show: vi.fn(() => {
      expect(cache.getItem(releaseNoticeStorageKey('account-a'))).toBe('0.9.0')
    }) })
    expect(await receipts.claimAndShow(input)).toBe('shown')
    const afterReload = createReleaseNoticeReceipts()
    expect(await afterReload.claimAndShow(input)).toBe('seen')
    expect(input.claim).toHaveBeenCalledTimes(1)
    expect(input.show).toHaveBeenCalledTimes(1)
  })

  it('isolates accounts on the same browser and ignores an ownerless legacy receipt', async () => {
    const cache = memoryStorage()
    cache.setItem(releaseAcknowledgementKey, '9.0.0')
    const receipts = createReleaseNoticeReceipts()
    const first = parameters({ storage: cache })
    expect(await receipts.claimAndShow(first)).toBe('shown')
    const second = parameters({ owner: 'account-b', storage: cache })
    expect(await receipts.claimAndShow(second)).toBe('shown')
    expect(second.claim).toHaveBeenCalledTimes(1)
    expect(first.show).toHaveBeenCalledTimes(1)
    expect(second.show).toHaveBeenCalledTimes(1)
  })

  it('shares one in-flight claim between concurrent mounts and permits only its winner to show', async () => {
    let resolve: (value: boolean) => void = () => {}
    const request = new Promise<boolean>((done) => { resolve = done })
    const receipts = createReleaseNoticeReceipts()
    const input = parameters({ claim: vi.fn(() => request) })
    const pending = receipts.claimAndShow(input)
    expect(await receipts.claimAndShow(input)).toBe('deferred')
    expect(input.claim).toHaveBeenCalledTimes(1)
    resolve(true)
    expect(await pending).toBe('shown')
    expect(input.show).toHaveBeenCalledTimes(1)
  })

  it('uses the atomic server result to prevent two devices from showing the same release', async () => {
    let claimed = false
    const atomicClaim = vi.fn(async () => {
      if (claimed) return false
      claimed = true
      return true
    })
    const phone = parameters({ claim: atomicClaim })
    const desktop = parameters({ claim: atomicClaim })
    const result = await Promise.all([
      createReleaseNoticeReceipts().claimAndShow(phone),
      createReleaseNoticeReceipts().claimAndShow(desktop),
    ])
    expect(result.sort()).toEqual(['seen', 'shown'])
    expect(phone.show.mock.calls.length + desktop.show.mock.calls.length).toBe(1)
  })

  it('does not claim while blocked, offline, unauthenticated or otherwise unable to open', async () => {
    const receipts = createReleaseNoticeReceipts()
    for (const input of [parameters({ canShow: () => false }), parameters({ isCurrent: () => false }), parameters({ owner: '' })]) {
      expect(await receipts.claimAndShow(input)).toBe('deferred')
      expect(input.claim).not.toHaveBeenCalled()
      expect(input.show).not.toHaveBeenCalled()
    }
  })

  it('suppresses late display after account change, unmount or a competing modal', async () => {
    let current = true
    const receipts = createReleaseNoticeReceipts()
    const input = parameters({ isCurrent: () => current, claim: vi.fn(async () => { current = false; return true }) })
    expect(await receipts.claimAndShow(input)).toBe('deferred')
    expect(input.show).not.toHaveBeenCalled()
    // Its server claim is consumed even if navigation prevented the display.
    expect(receipts.hasSeen(input.owner, input.version, input.storage)).toBe(true)

    let clear = true
    const modal = parameters({ owner: 'another-account', canShow: () => clear, claim: vi.fn(async () => { clear = false; return true }) })
    expect(await receipts.claimAndShow(modal)).toBe('deferred')
    expect(modal.show).not.toHaveBeenCalled()
  })

  it('quietly defers missing-RPC, offline and rejected claims without creating false receipts', async () => {
    const receipts = createReleaseNoticeReceipts()
    const input = parameters({ claim: vi.fn(async () => { throw new Error('PGRST202: RPC unavailable') }) })
    expect(await receipts.claimAndShow(input)).toBe('deferred')
    expect(input.show).not.toHaveBeenCalled()
    expect(receipts.hasSeen(input.owner, input.version, input.storage)).toBe(false)
    input.claim = vi.fn(async () => true)
    expect(await receipts.claimAndShow(input)).toBe('shown')
  })

  it('keeps once-only behavior with unavailable browser storage by trusting the server and session receipt', async () => {
    const unavailable = { getItem: () => { throw new Error('Denied') }, setItem: () => { throw new Error('Quota') } }
    const receipts = createReleaseNoticeReceipts()
    const input = parameters({ storage: unavailable })
    expect(await receipts.claimAndShow(input)).toBe('shown')
    expect(await receipts.claimAndShow(input)).toBe('seen')
    expect(input.claim).toHaveBeenCalledTimes(1)
    const newSession = parameters({ storage: unavailable, claim: vi.fn(async () => false) })
    expect(await createReleaseNoticeReceipts().claimAndShow(newSession)).toBe('seen')
    expect(newSession.show).not.toHaveBeenCalled()
  })

  it('preserves newer receipts during rollback, then permits the next release', async () => {
    const cache = memoryStorage()
    cache.setItem(releaseNoticeStorageKey('account-a'), '0.10.0')
    const receipts = createReleaseNoticeReceipts()
    const old = parameters({ storage: cache, version: '0.9.0' })
    expect(await receipts.claimAndShow(old)).toBe('seen')
    receipts.remember(old.owner, old.version, cache)
    expect(cache.getItem(releaseNoticeStorageKey(old.owner))).toBe('0.10.0')
    expect(old.claim).not.toHaveBeenCalled()
    const next = parameters({ storage: cache, version: '0.11.0' })
    expect(await receipts.claimAndShow(next)).toBe('shown')
  })

  it('consumes a winning claim before a display failure, instead of showing the release again', async () => {
    const receipts = createReleaseNoticeReceipts()
    const input = parameters({ show: vi.fn(() => { throw new Error('Window closed') }) })
    expect(await receipts.claimAndShow(input)).toBe('deferred')
    expect(await receipts.claimAndShow(input)).toBe('seen')
    expect(input.claim).toHaveBeenCalledTimes(1)
  })
})
