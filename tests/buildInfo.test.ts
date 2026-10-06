import { describe, expect, it } from 'vitest'
import { buildLabel, formatBuildLabel } from '../src/lib/buildInfo'

describe('build label', () => {
  it('formats version, commit and UTC build date', () => {
    expect(formatBuildLabel('0.1.0', '07d31f5', '2026-10-06 14:05')).toBe('v0.1.0 · 07d31f5 · 2026-10-06 14:05 UTC')
  })

  it('falls back safely when build constants are not injected', () => {
    expect(formatBuildLabel('0.1.0', 'dev', null)).toBe('v0.1.0 · dev')
    expect(buildLabel).toBe('v0.0.0 · dev')
  })
})
