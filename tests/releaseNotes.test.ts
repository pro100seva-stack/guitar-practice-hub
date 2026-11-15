import { describe, expect, it } from 'vitest'
import { acknowledgeRelease, changelogUrl, compareReleaseVersions, getReleaseSummary, readReleaseAcknowledgement, releaseAcknowledgementKey } from '../src/lib/releaseNotes'

function storage(initial: string | null = null) {
  const values = new Map<string, string>()
  if (initial !== null) values.set(releaseAcknowledgementKey, initial)
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
  }
}

describe('release announcements', () => {
  it('shows the actual known version once when the acknowledgement is introduced', () => {
    const local = storage()
    const version = '0.8.1'
    expect(getReleaseSummary(version, readReleaseAcknowledgement(local))).toEqual(['release.081.brand', 'release.081.login', 'release.081.practice'])
    expect(readReleaseAcknowledgement(local)).toBeNull()
    expect(acknowledgeRelease(version, local)).toBe(true)
    expect(getReleaseSummary(version, readReleaseAcknowledgement(local))).toBeNull()
  })

  it('shows new notes after an upgrade and suppresses them after dismissal', () => {
    const local = storage('0.8.1')
    expect(getReleaseSummary('0.9.0', readReleaseAcknowledgement(local))).toEqual(['release.090.songs', 'release.090.practice', 'release.090.stats'])
    expect(acknowledgeRelease('0.9.0', local)).toBe(true)
    expect(getReleaseSummary('0.9.0', readReleaseAcknowledgement(local))).toBeNull()
  })

  it('does not announce future changes for the current release', () => {
    expect(getReleaseSummary('0.8.1', null)?.some((key) => key.startsWith('release.090'))).toBe(false)
    expect(getReleaseSummary('0.0.0', null)).toBeNull()
    expect(getReleaseSummary('0.8.2', null)).toBeNull()
    expect(getReleaseSummary('0.9.0-beta.1', null)).toBeNull()
  })

  it('never replaces a newer acknowledgement after a rollback or stale tab dismissal', () => {
    const local = storage('0.9.0')
    expect(getReleaseSummary('0.8.1', readReleaseAcknowledgement(local))).toBeNull()
    expect(acknowledgeRelease('0.8.1', local)).toBe(true)
    expect(readReleaseAcknowledgement(local)).toBe('0.9.0')
  })

  it('announces Calendar in 0.10.0 after 0.9.0 and suppresses the summary once acknowledged', () => {
    expect(getReleaseSummary('0.10.0', '0.9.0')).toEqual(['release.0100.calendar', 'release.0100.connection', 'release.0100.notices'])
    expect(getReleaseSummary('0.9.0', null)?.some((key) => key.startsWith('release.0100'))).toBe(false)
    expect(getReleaseSummary('0.10.0', '0.10.0')).toBeNull()
    expect(getReleaseSummary('0.10.0', '0.11.0')).toBeNull()
  })

  it('announces Practice improvements only for 0.11.0 and suppresses an acknowledged or older release', () => {
    expect(getReleaseSummary('0.11.0', '0.10.0')).toEqual(['release.0110.repertoire', 'release.0110.autosave', 'release.0110.metronome'])
    expect(getReleaseSummary('0.10.0', null)?.some((key) => key.startsWith('release.0110'))).toBe(false)
    expect(getReleaseSummary('0.11.0', '0.11.0')).toBeNull()
    expect(getReleaseSummary('0.11.0', '0.12.0')).toBeNull()
  })

  it('announces safe updates and privacy-filtered monitoring in 0.12.0', () => {
    expect(getReleaseSummary('0.12.0', '0.11.0')).toEqual(['release.0120.updates', 'release.0120.monitoring', 'release.0120.summary'])
    expect(getReleaseSummary('0.11.0', null)?.some((key) => key.startsWith('release.0120'))).toBe(false)
    expect(getReleaseSummary('0.12.0', '0.12.0')).toBeNull()
  })

  it('compares numeric version components, including two-digit minor versions', () => {
    expect(compareReleaseVersions('0.10.0', '0.9.0')).toBe(1)
    expect(compareReleaseVersions('1.0.0', '0.99.0')).toBe(1)
    expect(compareReleaseVersions('0.8.1', '0.8.2')).toBe(-1)
    expect(compareReleaseVersions('0.8.1', '0.8.1')).toBe(0)
    expect(compareReleaseVersions('garbage', '0.8.1')).toBeNull()
  })

  it('treats malformed previous storage as missing and rejects invalid acknowledgements', () => {
    const local = storage('old-bad-value')
    expect(getReleaseSummary('0.8.1', readReleaseAcknowledgement(local))).not.toBeNull()
    expect(acknowledgeRelease('0.8.1', local)).toBe(true)
    expect(readReleaseAcknowledgement(local)).toBe('0.8.1')
    expect(acknowledgeRelease('dev', local)).toBe(false)
    expect(readReleaseAcknowledgement(local)).toBe('0.8.1')
  })

  it('does not crash when storage reads or writes are unavailable', () => {
    const unavailable = {
      getItem: () => { throw new Error('Storage denied') },
      setItem: () => { throw new Error('Quota exceeded') },
    }
    expect(readReleaseAcknowledgement(unavailable)).toBeNull()
    expect(acknowledgeRelease('0.8.1', unavailable)).toBe(false)
  })

  it('links directly to the project changelog', () => {
    expect(changelogUrl).toBe('https://github.com/pro100seva-stack/guitar-practice-hub/blob/master/docs/CHANGELOG.md')
  })
})
