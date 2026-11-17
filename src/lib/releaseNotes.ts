export const releaseAcknowledgementKey = 'pro100practice:release-acknowledged'
export const changelogUrl = 'https://github.com/pro100seva-stack/guitar-practice-hub/blob/master/docs/CHANGELOG.md'

const releaseSummaries: Readonly<Record<string, readonly string[]>> = {
  '0.8.1': ['release.081.brand', 'release.081.login', 'release.081.practice'],
  '0.9.0': ['release.090.songs', 'release.090.practice', 'release.090.stats'],
  '0.10.0': ['release.0100.calendar', 'release.0100.connection', 'release.0100.notices'],
  '0.11.0': ['release.0110.repertoire', 'release.0110.autosave', 'release.0110.metronome'],
  '0.12.0': ['release.0120.updates', 'release.0120.monitoring', 'release.0120.summary'],
  '0.13.0': ['release.0130.loops', 'release.0130.player', 'release.0130.autosave', 'release.0130.updates'],
}

type ReleaseStorage = Pick<Storage, 'getItem' | 'setItem'>

function versionParts(version: string) {
  // Announcements apply only to complete, stable releases, never development builds.
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(version)
  return match ? match.slice(1).map(Number) : null
}

export function compareReleaseVersions(left: string, right: string) {
  const a = versionParts(left)
  const b = versionParts(right)
  if (!a || !b) return null
  for (let index = 0; index < a.length; index++) {
    if (a[index] !== b[index]) return a[index] > b[index] ? 1 : -1
  }
  return 0
}

export function getReleaseSummary(version: string, acknowledgedVersion: string | null) {
  const summary = releaseSummaries[version]
  if (!summary) return null
  if (acknowledgedVersion && (compareReleaseVersions(acknowledgedVersion, version) ?? -1) >= 0) return null
  return summary
}

export function readReleaseAcknowledgement(storage: ReleaseStorage) {
  try { return storage.getItem(releaseAcknowledgementKey) } catch { return null }
}

export function acknowledgeRelease(version: string, storage: ReleaseStorage) {
  if (!versionParts(version)) return false
  const previous = readReleaseAcknowledgement(storage)
  if (previous && (compareReleaseVersions(previous, version) ?? -1) >= 0) return true
  try {
    storage.setItem(releaseAcknowledgementKey, version)
    return true
  } catch {
    return false
  }
}
