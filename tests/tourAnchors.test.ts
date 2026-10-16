// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { JsxEmit, transpileModule } from 'typescript'
import { Children, createElement, Fragment, isValidElement, type ReactElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fallbackStep, tourSteps } from '../src/components/tour/tourSteps'
import { resolveTargets } from '../src/components/tour/useScreenTour'
import TourOverlay from '../src/components/tour/TourOverlay'
import BlockGallery from '../src/components/BlockGallery'
import type { CatalogBlock } from '../src/lib/catalogApi'

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
  it.each([false, true])('keeps Help rendered during an active tour without replay recursion: %s', (isOpen) => {
    const source = readFileSync('src/components/Layout.tsx', 'utf8')
    const footer = source.slice(source.indexOf('        {tour.canReplay && ('), source.indexOf('        {isLandingScreen && <p'))
    const replay = vi.fn()
    const node = runInNewContext(transpileModule(`const node = <>${footer}</>; node`, { fileName: 'fixture.tsx', compilerOptions: { jsx: JsxEmit.React } }).outputText, {
      React: { createElement, Fragment }, tour: { canReplay: true, isOpen, replay }, t: (key: string) => key,
    }) as ReactElement<{ children: ReactNode }>
    const html = renderToStaticMarkup(node)
    expect(html).toContain('data-tour="help"')
    expect(html).not.toContain('hidden=')
    expect(html.includes('disabled=')).toBe(isOpen)
    const footerElement = Children.toArray(node.props.children).find(isValidElement) as ReactElement<{ children: ReactNode }>
    const button = Children.toArray(footerElement.props.children).find(isValidElement) as ReactElement<{ onClick: () => void }>
    button.props.onClick()
    expect(replay).toHaveBeenCalledTimes(isOpen ? 0 : 1)
  })

  it('anchors Details on its existing disclosure and keeps information available without blocks', () => {
    const source = readFileSync('src/pages/Sessions.tsx', 'utf8')
    expect(source).toMatch(/id=\{`block-header-\$\{template.id\}`\}\s+data-tour="practice-details"\s+aria-expanded=\{isExpanded\}/)
    expect(source.indexOf('<MaterialsInfo />')).toBeLessThan(source.indexOf('{selectedBlocks.length === 0 && ('))
    expect(source.indexOf('data-tour="practice-details"')).toBeLessThan(source.indexOf('{isExpanded && ('))
    const plan = readFileSync('src/pages/Plan.tsx', 'utf8')
    expect(plan).toContain("data-tour={week ? 'plan-repertoire' : undefined}")
    expect(plan).toContain('data-tour="plan-practice"')
  })

  it('renders vertical full-width popup results without changing the non-popup gallery', () => {
    const blocks: CatalogBlock[] = ['chromatic', 'legato'].map(key => ({ id: key, key, label: key, target_minutes: null, category_key: 'technique_warmups', is_selectable: true, archived_at: null }))
    for (const layout of ['dialog', 'gallery'] as const) {
      const markup = renderToStaticMarkup(createElement(BlockGallery, { blocks, layout, selectedKeys: ['chromatic'], selectionBehavior: 'add', onSelect: vi.fn() }))
      const classes = markup.match(/aria-label="Blocks in category" class="([^"]+)"/)?.[1] ?? ''
      if (layout === 'dialog') {
        expect(classes).toContain('flex-col')
        expect(classes).not.toContain('overflow-x-auto')
        expect(markup).toContain('w-full min-w-0 break-words py-3')
        expect(markup).not.toContain('w-48')
      } else {
        expect(classes).toBe('flex gap-2 overflow-x-auto p-1')
        expect(markup).toContain('max-w-[80vw]')
      }
      expect(markup).toContain('aria-pressed="true" disabled=""')
      expect(markup).toContain('role="tabpanel"')
    }
    const error = renderToStaticMarkup(createElement(BlockGallery, { blocks, layout: 'dialog', error: 'offline', onRetry: vi.fn(), onSelect: vi.fn() }))
    expect(error).toContain('role="alert"')
    expect(error).toContain('Retry')
    expect(error).not.toContain('aria-label="Blocks in category"')
  })

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
    expect(tourSteps['/practice'].find(step => step.target.includes('practice-details'))?.body.length).toBeLessThanOrEqual(100)
  })

  it('registers the approved cards in screen order on all six screens', () => {
    expect(Object.fromEntries(Object.entries(tourSteps).map(([path, steps]) => [path, steps.length])))
      .toEqual({ '/landing': 6, '/plan': 7, '/practice': 6, '/progress': 2, '/stats': 2, '/settings': 2 })
    expect(tourSteps['/landing'].map((step) => step.target)).toEqual(
      ['menu', 'progress', 'current-week', 'practice', 'featured-guitar', 'help'].map((anchor) => `[data-tour="${anchor}"]`),
    )
    expect(tourSteps['/plan'].map((step) => step.target)).toEqual(
      ['plan-weeks', 'plan-week', 'plan-tasks', 'plan-todos', 'plan-repertoire', 'plan-save', 'plan-practice'].map((anchor) => `[data-tour="${anchor}"]`),
    )
    expect(tourSteps['/practice'].map((step) => step.target)).toEqual(
      ['practice-days', 'practice-block-picker', 'practice-details', 'materials-info', 'practice-tools', 'practice-save'].map((anchor) => `[data-tour="${anchor}"]`),
    )
    const stats = readFileSync('src/pages/Stats.tsx', 'utf8')
    expect(stats.indexOf('data-tour="stats-filters"')).toBeLessThan(stats.indexOf('data-tour="stats-summary"'))
    expect(tourSteps['/stats'].map((step) => step.target)).toEqual(
      ['stats-filters', 'stats-summary'].map((anchor) => `[data-tour="${anchor}"]`),
    )
    const layout = readFileSync('src/components/Layout.tsx', 'utf8')
    expect(layout).toContain('data-tour="help"')
    expect(layout).toContain('disabled={tour.isOpen}')
    expect(layout).not.toContain('hidden={tour.isOpen}')
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
