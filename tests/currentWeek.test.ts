import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { transpileModule } from 'typescript'
import { toLocalIsoDate } from '../src/lib/dateFormat'

type Week = { id: string; start_date: string; end_date: string }
type Helper = (weeks: readonly Week[], now?: Date) => Week | null

const pages = ['src/pages/Plan.tsx', 'src/pages/Landing.tsx'] as const

function pageSource(path: string) {
  return readFileSync(path, 'utf8').replaceAll('\r\n', '\n')
}

function loadHelper(path: string): Helper {
  const source = pageSource(path)
  const start = source.indexOf('function weekContainingLocalDate')
  const end = source.indexOf('\n}\n', start) + 2
  expect(start).toBeGreaterThan(-1)
  const output = transpileModule(`${source.slice(start, end)}\nweekContainingLocalDate`, {}).outputText
  return runInNewContext(output, { toLocalIsoDate }) as Helper
}

const weeks: Week[] = [
  { id: 'w1', start_date: '2026-10-26', end_date: '2026-11-01' },
  { id: 'w2', start_date: '2026-11-02', end_date: '2026-11-08' },
]

describe('backlog 1101: current week uses the local date like Practice', () => {
  const originalTz = process.env.TZ

  beforeAll(() => {
    process.env.TZ = 'Asia/Tokyo'
  })

  afterAll(() => {
    if (originalTz === undefined) delete process.env.TZ
    else process.env.TZ = originalTz
  })

  // Monday 2026-11-02 00:30 in Tokyo (UTC+9) is still Sunday 2026-11-01 15:30 UTC.
  const justAfterLocalMidnight = () => new Date('2026-11-01T15:30:00.000Z')

  it('runs in a non-UTC offset where UTC and local dates differ', () => {
    const now = justAfterLocalMidnight()
    expect(now.getTimezoneOffset()).toBe(-540)
    expect(now.toISOString().slice(0, 10)).toBe('2026-11-01')
    expect(toLocalIsoDate(now)).toBe('2026-11-02')
  })

  it.each(pages)('%s picks the week containing local today', (path) => {
    const helper = loadHelper(path)
    expect(helper(weeks, justAfterLocalMidnight())?.id).toBe('w2')
    expect(helper(weeks, new Date('2026-11-01T14:59:00.000Z'))?.id).toBe('w1')
    expect(helper(weeks, new Date('2026-11-08T15:00:00.000Z'))).toBeNull()
  })

  it.each(pages)('%s no longer derives today from UTC', (path) => {
    const source = pageSource(path)
    expect(source).not.toContain('toISOString().slice(0, 10)')
    expect(source).toContain('weekContainingLocalDate(')
  })

  it('Plan uses the local helper for initial selection, badges and the Current week button', () => {
    const source = pageSource('src/pages/Plan.tsx')
    expect(source).toContain('?? weekContainingLocalDate(nextWeeks)\n')
    expect(source).toContain('  const today = toLocalIsoDate(now)\n  const currentWeek = weekContainingLocalDate(weeks, now)')
  })
})
