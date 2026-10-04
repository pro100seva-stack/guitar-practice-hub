// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { transpileModule } from 'typescript'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fallbackStep, tourSteps } from '../src/components/tour/tourSteps'
import { resolveTargets } from '../src/components/tour/useScreenTour'
import TourOverlay from '../src/components/tour/TourOverlay'

vi.mock('../src/lib/supabase', () => ({ supabase: {} }))
vi.mock('../src/lib/i18n', () => ({
  useI18n: () => ({ t: (key: string, values: Record<string, string | number> = {}) =>
    Object.entries(values).reduce((result, [name, value]) => result.replaceAll(`{${name}}`, String(value)), key) }),
}))

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return path.endsWith('.tsx') ? [path] : []
  })
}

describe('guided tour anchors', () => {
  function anchorResolution(found: string[]) {
    vi.useFakeTimers()
    vi.stubGlobal('window', { setTimeout })
    vi.stubGlobal('document', { querySelector: (target: string) => found.includes(target)
      ? { getBoundingClientRect: () => ({ width: 100, height: 50 }) } : null })
    return resolveTargets('/plan')
  }

  it('resolves all stable anchors promptly', async () => {
    const targets = tourSteps['/plan'].map((step) => step.target)
    const resolved = anchorResolution(targets)
    await vi.advanceTimersByTimeAsync(100)
    expect(await resolved).toEqual(targets)
  })

  it('resolves partial anchors 1.5 seconds after the first appears', async () => {
    const targets: string[] = []
    const resolved = anchorResolution(targets)
    let finished = false
    void resolved.then(() => { finished = true })
    await vi.advanceTimersByTimeAsync(500)
    targets.push(tourSteps['/plan'][0].target)
    await vi.advanceTimersByTimeAsync(1500)
    expect(finished).toBe(false)
    await vi.advanceTimersByTimeAsync(100)
    expect(await resolved).toEqual(targets)
  })

  it('falls back after four seconds without targets', async () => {
    const resolved = anchorResolution([])
    let finished = false
    void resolved.then(() => { finished = true })
    await vi.advanceTimersByTimeAsync(3900)
    expect(finished).toBe(false)
    await vi.advanceTimersByTimeAsync(100)
    expect(await resolved).toEqual([])
  })

  it('cancels obsolete anchor resolution without waiting for a timeout', async () => {
    anchorResolution([])
    expect(await resolveTargets('/plan', () => false)).toEqual([])
  })

  it('renders counters from resolved steps and keeps empty states nonblocking', () => {
    vi.stubGlobal('window', { innerWidth: 375, innerHeight: 812 })
    const props = { steps: tourSteps['/plan'].slice(0, 2), index: 1, mode: 'onboarding' as const, onIndex: vi.fn(), onClose: vi.fn(), onSkip: vi.fn() }
    const partial = renderToStaticMarkup(createElement(TourOverlay, props))
    expect(partial).toContain('2 of 2')
    expect(partial).toContain('Skip tour')
    const fallback = renderToStaticMarkup(createElement(TourOverlay, { ...props, steps: [fallbackStep('/plan')], index: 0, mode: 'replay' }))
    expect(fallback).toContain('1 of 1')
    expect(fallback).toContain('Close')
    expect(fallback).not.toContain('Skip tour')
    expect(renderToStaticMarkup(createElement(TourOverlay, { ...props, steps: [] }))).toBe('')
  })

  it('has every tour key and counter placeholder in all four locale dictionaries', () => {
    const source = readFileSync('src/lib/i18n.tsx', 'utf8')
    const dictionariesSource = source.slice(source.indexOf('const pageTranslations:'), source.indexOf('const I18nContext ='))
    const dictionaries = runInNewContext(transpileModule(`${dictionariesSource}\ntranslations`, {}).outputText) as Record<string, Record<string, string>>
    const steps = [...Object.values(tourSteps).flat(), fallbackStep('/plan'), fallbackStep('/practice')]
    const keys = [...steps.flatMap((step) => [step.title, step.body]), 'Skip tour', 'Close', 'Back', 'Tour next', 'Tour done', '{current} of {total}']
    for (const language of ['en', 'ru', 'it', 'fr']) {
      expect(keys.filter((key) => !dictionaries[language][key]), language).toEqual([])
      expect(dictionaries[language]['{current} of {total}']).toContain('{current}')
      expect(dictionaries[language]['{current} of {total}']).toContain('{total}')
    }
    expect(tourSteps['/practice'][2].body.length).toBeLessThanOrEqual(100)
  })

  it('registers exactly the approved 19 cards in screen order', () => {
    expect(Object.fromEntries(Object.entries(tourSteps).map(([path, steps]) => [path, steps.length])))
      .toEqual({ '/landing': 4, '/plan': 5, '/practice': 4, '/progress': 2, '/stats': 2, '/settings': 2 })
    expect(Object.values(tourSteps).flat()).toHaveLength(19)
    expect(tourSteps['/landing'].map((step) => step.target)).toEqual(
      ['menu', 'current-week', 'practice', 'progress'].map((anchor) => `[data-tour="${anchor}"]`),
    )
    expect(tourSteps['/plan'].map((step) => step.target)).toEqual(
      ['plan-weeks', 'plan-week', 'plan-tasks', 'plan-todos', 'plan-save'].map((anchor) => `[data-tour="${anchor}"]`),
    )
    expect(tourSteps['/practice'].map((step) => step.target)).toEqual(
      ['practice-days', 'practice-block-picker', 'practice-tools', 'practice-save'].map((anchor) => `[data-tour="${anchor}"]`),
    )
    const stats = readFileSync('src/pages/Stats.tsx', 'utf8')
    expect(stats.indexOf('data-tour="stats-filters"')).toBeLessThan(stats.indexOf('data-tour="stats-summary"'))
    expect(tourSteps['/stats'].map((step) => step.target)).toEqual(
      ['stats-filters', 'stats-summary'].map((anchor) => `[data-tour="${anchor}"]`),
    )
    expect(Object.values(tourSteps).flat().some((step) => step.target.includes('help'))).toBe(false)
  })

  it('has a data-tour attribute in the UI for every tourSteps selector', () => {
    const steps = readFileSync('src/components/tour/tourSteps.ts', 'utf8')
    const anchors = [...new Set([...steps.matchAll(/\[data-tour="([^"]+)"\]/g)].map((match) => match[1]))]
    const ui = [...sourceFiles('src/pages'), ...sourceFiles('src/components')].map((file) => readFileSync(file, 'utf8')).join('\n')
    // Anchors are literal (data-tour="x") or string literals inside a data-tour={...} expression.
    const present = new Set<string>()
    for (const match of ui.matchAll(/data-tour=(?:"([^"]+)"|\{([^}]*)\})/g)) {
      if (match[1]) present.add(match[1])
      for (const literal of (match[2] ?? '').matchAll(/'([^']+)'/g)) present.add(literal[1])
    }

    expect(anchors.length).toBeGreaterThan(0)
    const missing = anchors.filter((anchor) => !present.has(anchor))
    expect(missing).toEqual([])
  })
})
