import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildLabel, formatBuildLabel, versionLabel } from '../src/lib/buildInfo'

describe('build label', () => {
  it('formats version, commit and UTC build date', () => {
    expect(formatBuildLabel('0.1.0', '07d31f5', '2026-10-06 14:05')).toBe('v0.1.0 · 07d31f5 · 2026-10-06 14:05 UTC')
  })

  it('falls back safely when build constants are not injected', () => {
    expect(formatBuildLabel('0.1.0', 'dev', null)).toBe('v0.1.0 · dev')
    expect(buildLabel).toBe('v0.0.0 · dev')
  })
})

describe('version label', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('falls back safely when the version is not injected', () => {
    expect(versionLabel).toBe('v0.0.0')
  })

  it.each(['0.4.7', '1.0.0-beta.1'])('shows only the injected version %s while retaining internal metadata', async (version) => {
    vi.stubGlobal('__APP_VERSION__', version)
    vi.stubGlobal('__APP_COMMIT__', '07d31f5')
    vi.stubGlobal('__APP_BUILD_DATE__', '2026-10-06 14:05')
    vi.resetModules()

    const injected = await import('../src/lib/buildInfo')

    expect(injected.versionLabel).toBe(`v${version}`)
    expect(injected.buildLabel).toBe(`v${version} · 07d31f5 · 2026-10-06 14:05 UTC`)
  })
})
