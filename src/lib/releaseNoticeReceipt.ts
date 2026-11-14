import { compareReleaseVersions } from './releaseNotes'

export type ReleaseReceiptStorage = Pick<Storage, 'getItem' | 'setItem'>
type ClaimResult = 'shown' | 'seen' | 'deferred'

export const releaseNoticeStorageKey = (owner: string) => `pro100practice:release-shown:${encodeURIComponent(owner)}`

function newestVersion(left: string | null, right: string) {
  return left && (compareReleaseVersions(left, right) ?? -1) >= 0 ? left : right
}

/** One coordinator per browser session; account identity never comes from a legacy global receipt. */
export function createReleaseNoticeReceipts() {
  const seen = new Map<string, string>()
  const pending = new Set<string>()

  function previous(owner: string, storage?: ReleaseReceiptStorage | null) {
    let version = seen.get(owner) ?? null
    try {
      const stored = storage?.getItem(releaseNoticeStorageKey(owner))
      if (stored && compareReleaseVersions(stored, stored) === 0) version = newestVersion(version, stored)
    } catch { /* A denied browser cache must not prevent the server claim. */ }
    return version
  }

  function hasSeen(owner: string, version: string, storage?: ReleaseReceiptStorage | null) {
    const stored = previous(owner, storage)
    return Boolean(stored && (compareReleaseVersions(stored, version) ?? -1) >= 0)
  }

  function remember(owner: string, version: string, storage?: ReleaseReceiptStorage | null) {
    if (!owner || compareReleaseVersions(version, version) !== 0) return
    const latest = newestVersion(previous(owner, storage), version)
    seen.set(owner, latest)
    try {
      const key = releaseNoticeStorageKey(owner)
      if (storage?.getItem(key) !== latest) storage?.setItem(key, latest)
    } catch { /* Server and session receipts still prevent a repeat. */ }
  }

  async function claimAndShow({ owner, version, storage, claim, isCurrent, canShow, show }: {
    owner: string
    version: string
    storage?: ReleaseReceiptStorage | null
    claim: () => Promise<boolean>
    isCurrent: () => boolean
    canShow: () => boolean
    show: () => void
  }): Promise<ClaimResult> {
    if (!owner || compareReleaseVersions(version, version) !== 0 || !isCurrent() || !canShow()) return 'deferred'
    if (hasSeen(owner, version, storage)) return 'seen'
    const key = releaseNoticeStorageKey(owner) + ':' + version
    if (pending.has(key)) return 'deferred'
    pending.add(key)
    try {
      const won = await claim()
      // A successful server response consumes this user/release even if the page closes now.
      // The atomic server claim is authoritative across tabs, browsers and devices.
      remember(owner, version, storage)
      if (!won) return 'seen'
      if (!isCurrent() || !canShow()) return 'deferred'
      show()
      return 'shown'
    } catch {
      // Offline, missing migration or an unavailable RPC: defer; never guess account-wide state.
      return 'deferred'
    } finally {
      pending.delete(key)
    }
  }

  return { hasSeen, remember, claimAndShow }
}

export const releaseNoticeReceipts = createReleaseNoticeReceipts()
