import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { ScriptTarget, transpileModule } from 'typescript'
import { runInNewContext } from 'node:vm'
import { GoogleCalendarError, type GoogleCalendarConnection, type GoogleCalendarPlanResult } from '../src/lib/googleCalendar'
import { createCalendarEventDrafts } from '../src/lib/calendarSchedule'
import * as calendarSchedule from '../src/lib/calendarSchedule'

const source = readFileSync('src/components/CalendarSettings.tsx', 'utf8')
const handlerSource = source.slice(source.indexOf('async function confirmGoogle()'), source.indexOf('function download()'))
const compiled = transpileModule(handlerSource, { compilerOptions: { target: ScriptTarget.ES2022 } }).outputText
const planId = 'c63b137a-50f2-4abd-a785-fddfa2792001'
const schedule = { mode: 'dates' as const, dates: ['2026-11-14', '2026-11-15'], timing: { kind: 'timed' as const, time: '18:00', timeZone: 'Europe/Budapest', durationMinutes: 30 } }
const review = { planId, provider: 'google', calendarId: 'owned-original', title: 'Practice', schedule, events: createCalendarEventDrafts(schedule) }

function providerResetSpies() {
  return { provider: 'google', rememberCalendarProvider: vi.fn(), setProviderChosen: vi.fn(), setSectionOpen: vi.fn(), setAuthorizationBegin: vi.fn(), setReview: vi.fn(), setCompleted: vi.fn(), setPendingDates: vi.fn(), setDownloaded: vi.fn() }
}

function setup(options: { pending?: string[] | null; availableCalendar?: string; result?: () => Promise<GoogleCalendarPlanResult>; connected?: boolean; expired?: boolean } = {}) {
  let current = true
  const insertPlan = vi.fn(options.result ?? (async () => ({ completed: [{ id: 'event', date: '2026-11-15' }], pendingDates: [] })))
  const connection = { insertPlan } as unknown as GoogleCalendarConnection
  const setError = vi.fn()
  const setExpired = vi.fn()
  const setBusy = vi.fn()
  const setCompleted = vi.fn()
  const setPendingDates = vi.fn()
  const context = {
    review, busy: false, currentAccess: () => current, connection: options.connected === false ? null : connection,
    expired: options.expired ?? false, calendars: [{ id: options.availableCalendar ?? 'owned-original' }],
    requestRef: { current: 0 }, controllerRef: { current: null }, AbortController,
    setBusy, setError, setCompleted, setPendingDates, setExpired,
    pendingDates: options.pending ?? null,
    errorKey: (problem: unknown) => problem instanceof GoogleCalendarError ? problem.key : 'calendar.confirmFailed',
  }
  const create = new Function(...Object.keys(context), `${compiled}\nreturn confirmGoogle;`) as (...values: unknown[]) => () => Promise<void>
  return { confirm: create(...Object.values(context)), insertPlan, setError, setExpired, setBusy, setCompleted, setPendingDates, invalidate: () => { current = false }, requestRef: context.requestRef }
}

describe('calendar confirmation and retries', () => {
  it('retries only pending dates using the reviewed plan ID and original destination', async () => {
    const fixture = setup({ pending: ['2026-11-15'] })
    await fixture.confirm()
    expect(fixture.insertPlan).toHaveBeenCalledOnce()
    expect(fixture.insertPlan.mock.calls[0][0]).toBe('owned-original')
    expect(fixture.insertPlan.mock.calls[0][1]).toEqual({ planId, title: 'Practice', drafts: [review.events[1]] })
    expect(fixture.setPendingDates).toHaveBeenCalledWith([])
  })

  it('never silently retargets a pending plan when a reconnected account has a different calendar', async () => {
    const fixture = setup({ availableCalendar: 'other-account-calendar' })
    await fixture.confirm()
    expect(fixture.insertPlan).not.toHaveBeenCalled()
    expect(fixture.setError).toHaveBeenCalledWith('calendar.googlePermission')
  })

  it('requires a valid connection before creating any event', async () => {
    for (const options of [{ connected: false }, { expired: true }]) {
      const fixture = setup(options)
      await fixture.confirm()
      expect(fixture.insertPlan).not.toHaveBeenCalled()
      expect(fixture.setError).toHaveBeenCalledWith('calendar.googleReconnect')
    }
  })

  it('ignores a late response after an app-account change', async () => {
    let complete!: (value: GoogleCalendarPlanResult) => void
    const fixture = setup({ result: () => new Promise((resolve) => { complete = resolve }) })
    const pending = fixture.confirm()
    fixture.invalidate()
    complete({ completed: [{ id: 'event', date: '2026-11-14' }], pendingDates: ['2026-11-15'] })
    await pending
    expect(fixture.setCompleted).not.toHaveBeenCalled()
    expect(fixture.setPendingDates).not.toHaveBeenCalled()
    expect(fixture.setBusy).not.toHaveBeenCalledWith(false)
  })

  it('ignores a response from an invalidated connection request', async () => {
    let complete!: (value: GoogleCalendarPlanResult) => void
    const fixture = setup({ result: () => new Promise((resolve) => { complete = resolve }) })
    const pending = fixture.confirm()
    fixture.requestRef.current++
    complete({ completed: [{ id: 'event', date: '2026-11-14' }], pendingDates: [] })
    await pending
    expect(fixture.setCompleted).not.toHaveBeenCalled()
    expect(fixture.setPendingDates).not.toHaveBeenCalled()
  })

  it('keeps failed and unattempted dates retryable when a token expires partway through creation', async () => {
    const fixture = setup({ result: async () => ({ completed: [{ id: 'event', date: '2026-11-14' }], pendingDates: ['2026-11-15'], errorKey: 'calendar.googleReconnect' }) })
    await fixture.confirm()
    expect(fixture.setPendingDates).toHaveBeenCalledWith(['2026-11-15'])
    expect(fixture.setError).toHaveBeenCalledWith('calendar.googleReconnect')
    expect(fixture.setExpired).toHaveBeenCalledWith(true)
    const update = fixture.setCompleted.mock.calls[0][0] as (previous: { date: string; id: string }[]) => { date: string; id: string }[]
    expect(update([{ date: '2026-11-14', id: 'event' }])).toEqual([{ date: '2026-11-14', id: 'event' }])
  })

  it('offers authorization recovery when calendar permissions are withdrawn', async () => {
    const fixture = setup({ result: async () => ({ completed: [], pendingDates: ['2026-11-14', '2026-11-15'], errorKey: 'calendar.googlePermission' }) })
    await fixture.confirm()
    expect(fixture.setExpired).toHaveBeenCalledWith(true)
    expect(fixture.setPendingDates).toHaveBeenCalledWith(['2026-11-14', '2026-11-15'])
  })
})

describe('calendar connection and import recovery', () => {
  it('does not forget the existing connection when an explicit disconnect fails', async () => {
    const start = source.indexOf('async function disconnect()')
    const code = transpileModule(source.slice(start, source.indexOf('function update(', start)), { compilerOptions: { target: ScriptTarget.ES2022 } }).outputText
    const connection = { disconnect: vi.fn(async () => { throw new Error('network') }) }
    const context = { ...providerResetSpies(), busy: false, currentAccess: () => true, requestRef: { current: 0 }, connectionRef: { current: connection }, setConnection: vi.fn(), setCalendars: vi.fn(), setCalendarId: vi.fn(), setExpired: vi.fn(), setError: vi.fn(), setBusy: vi.fn(), serverMode: 'server', accessRef: { current: {} }, forgetCalendarConnection: vi.fn() }
    const make = new Function(...Object.keys(context), `${code}\nreturn disconnect;`) as (...values: unknown[]) => () => Promise<void>
    await make(...Object.values(context))()
    expect(context.connectionRef.current).toBe(connection)
    expect(context.setConnection).not.toHaveBeenCalled()
    expect(context.forgetCalendarConnection).not.toHaveBeenCalled()
    expect(context.setProviderChosen).not.toHaveBeenCalled()
    expect(context.setError).toHaveBeenCalledWith('calendar.googleUnavailable')
  })

  it('blocks a fresh connection while the previous grant is being disconnected', async () => {
    const start = source.indexOf('async function disconnect()')
    const disconnectSource = source.slice(start, source.indexOf('function update(', start))
    const code = transpileModule(disconnectSource, { compilerOptions: { target: ScriptTarget.ES2022 } }).outputText
    let finish!: () => void
    const connection = { disconnect: vi.fn(() => new Promise<void>((resolve) => { finish = resolve })) }
    const setBusy = vi.fn()
    const context = { ...providerResetSpies(), busy: false, currentAccess: () => true, requestRef: { current: 0 }, connectionRef: { current: connection }, setConnection: vi.fn(), setCalendars: vi.fn(), setCalendarId: vi.fn(), setExpired: vi.fn(), setError: vi.fn(), setBusy, serverMode: 'browser', accessRef: { current: {} }, forgetCalendarConnection: vi.fn() }
    const make = new Function(...Object.keys(context), `${code}\nreturn disconnect;`) as (...values: unknown[]) => () => Promise<void>
    const pending = make(...Object.values(context))()
    expect(setBusy).toHaveBeenLastCalledWith(true)
    expect(context.connectionRef.current).toBe(connection)
    finish()
    await pending
    expect(context.connectionRef.current).toBeNull()
    expect(context.setProviderChosen).toHaveBeenCalledWith(false)
    expect(context.setSectionOpen).toHaveBeenCalledWith(false)
    expect(setBusy).toHaveBeenLastCalledWith(false)
  })

  it('clears an import selection without revoking a Google grant', async () => {
    const start = source.indexOf('async function disconnect()')
    const code = transpileModule(source.slice(start, source.indexOf('function update(', start)), { compilerOptions: { target: ScriptTarget.ES2022 } }).outputText
    const connection = { disconnect: vi.fn() }
    const context = { ...providerResetSpies(), provider: 'apple', busy: false, currentAccess: () => true, requestRef: { current: 0 }, connectionRef: { current: connection }, setError: vi.fn(), setBusy: vi.fn(), serverMode: 'server', accessRef: { current: {} } }
    const make = new Function(...Object.keys(context), `${code}\nreturn disconnect;`) as (...values: unknown[]) => () => Promise<void>
    await make(...Object.values(context))()
    expect(connection.disconnect).not.toHaveBeenCalled()
    expect(context.setProviderChosen).toHaveBeenCalledWith(false)
    expect(context.rememberCalendarProvider).toHaveBeenCalledWith(context.accessRef.current, null)
  })

  it('retries SDK loading without opening Google consent automatically', async () => {
    const retrySource = source.slice(source.indexOf('async function retrySdk()'), source.indexOf('async function connect()'))
    const code = transpileModule(retrySource, { compilerOptions: { target: ScriptTarget.ES2022 } }).outputText
    const prepareGoogleCalendar = vi.fn(async () => {})
    const connectGoogleCalendar = vi.fn()
    const setSdkReady = vi.fn()
    const setError = vi.fn()
    const context = { clientId: 'public-client', serverMode: 'browser', sdkReady: false, busy: false, currentAccess: () => true, requestRef: { current: 0 }, setBusy: vi.fn(), setError, prepareGoogleCalendar, connectGoogleCalendar, setSdkReady }
    const make = new Function(...Object.keys(context), `${code}\nreturn retrySdk;`) as (...values: unknown[]) => () => Promise<void>
    await make(...Object.values(context))()
    expect(prepareGoogleCalendar).toHaveBeenCalledOnce()
    expect(setSdkReady).toHaveBeenCalledWith(true)
    expect(connectGoogleCalendar).not.toHaveBeenCalled()
  })

  it('allows an explicit download retry with the same reviewed plan identity', () => {
    const start = source.indexOf('function download()')
    const downloadSource = source.slice(start, source.indexOf('const locale =', start))
    const code = transpileModule(downloadSource, { compilerOptions: { target: ScriptTarget.ES2022 } }).outputText
    const createCalendarIcs = vi.fn(() => 'BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n')
    const click = vi.fn()
    const setDownloaded = vi.fn()
    const context = {
      review: { ...review, provider: 'apple' }, downloaded: true, currentAccess: () => true, createCalendarIcs,
      URL: { createObjectURL: vi.fn(() => 'blob:calendar'), revokeObjectURL: vi.fn() }, Blob,
      document: { createElement: vi.fn(() => ({ href: '', download: '', click, remove: vi.fn() })), body: { appendChild: vi.fn() } },
      window: { setTimeout: vi.fn() }, downloadUrlsRef: { current: new Set() }, setDownloaded, setError: vi.fn(), errorKey: () => 'calendar.confirmFailed',
    }
    const make = new Function(...Object.keys(context), `${code}\nreturn download;`) as (...values: unknown[]) => () => void
    const download = make(...Object.values(context))
    download()
    download()
    expect(click).toHaveBeenCalledTimes(2)
    expect(createCalendarIcs.mock.calls).toEqual([[schedule, { planId, title: 'Practice' }], [schedule, { planId, title: 'Practice' }]])
    expect(setDownloaded).toHaveBeenCalledWith(true)
  })
})

describe('Calendar progressive disclosure', () => {
  it('starts with one button, reveals three provider choices, and only then shows a scheduling form', () => {
    type Node = { type: unknown; props: Record<string, unknown> }
    const values: unknown[] = []
    let cursor = 0
    let effectCount = 0
    let mountEffect: (() => void) | undefined
    const jsx = (type: unknown, props: Record<string, unknown>) => ({ type, props })
    const react = {
      useId: () => 'calendar-test', useEffect: (effect: () => void) => { if (effectCount++ === 0) mountEffect = effect },
      useRef: (initial: unknown) => { const position = cursor++; if (!(position in values)) values[position] = { current: initial }; return values[position] },
      useState: (initial: unknown) => {
        const position = cursor++
        if (!(position in values)) values[position] = typeof initial === 'function' ? initial() : initial
        return [values[position], (next: unknown) => { values[position] = typeof next === 'function' ? next(values[position]) : next }]
      },
    }
    const imports: Record<string, unknown> = {
      react, 'react/jsx-runtime': { jsx, jsxs: jsx }, '../lib/i18n': { useI18n: () => ({ language: 'en', t: (key: string) => key }) },
      '../lib/dateFormat': { localeForLanguage: () => 'en-GB', toLocalIsoDate: () => '2026-11-14' }, '../lib/calendarSchedule': calendarSchedule,
      '../lib/persistentGoogleCalendar': { createPersistentCalendarApi: () => ({}) },
      '../lib/googleCalendar': {}, '../lib/localMaterialAccess': { captureLocalMaterialAccess: () => ({}), isLocalMaterialAccessCurrent: () => true, onLocalMaterialInvalidation: () => () => {} }, '../lib/calendarConnection': { selectedCalendarProvider: () => null, retainedCalendarConnection: () => null, rememberCalendarProvider: vi.fn() }, '../lib/calendarIcs': {}, './AppSelect': { default: 'select-fixture' },
    }
    const module = { exports: {} as { default: () => Node } }
    const fixtureSource = source.replaceAll('import.meta.env.VITE_GOOGLE_CALENDAR_CLIENT_ID', "''").replaceAll('import.meta.env.VITE_CALENDAR_PERSISTENT_AUTH', "''")
    const code = transpileModule(fixtureSource, { compilerOptions: { jsx: 4, module: 1, target: ScriptTarget.ES2022 } }).outputText
    runInNewContext(code, { exports: module.exports, require: (name: string) => imports[name], Intl, Date })
    const nodes = (value: unknown): Node[] => {
      if (Array.isArray(value)) return value.flatMap(nodes)
      if (!value || typeof value !== 'object' || !('props' in value)) return []
      const node = value as Node
      return [node, ...nodes(node.props.children)]
    }
    const render = () => { cursor = 0; return nodes(module.exports.default()) }
    let tree = render()
    mountEffect?.()
    expect(tree.filter((node) => node.type === 'button').map((node) => node.props.children)).toEqual(['calendar.setUpReminder'])
    expect(tree.some((node) => node.type === 'form' || node.type === 'p')).toBe(false)
    ;(tree.find((node) => node.type === 'button')!.props.onClick as () => void)()
    tree = render()
    expect(tree.filter((node) => node.type === 'button').map((node) => node.props.children)).toEqual(['calendar.setUpReminder', 'calendar.googleChoice', 'calendar.appleChoice', 'calendar.deviceChoice'])
    expect(tree.some((node) => node.type === 'form')).toBe(false)
    ;(tree.find((node) => node.type === 'button' && node.props.children === 'calendar.appleChoice')!.props.onClick as () => void)()
    tree = render()
    expect(tree.some((node) => node.type === 'form')).toBe(true)
    expect(tree.some((node) => node.type === 'button' && node.props.children === 'calendar.googleChoice')).toBe(false)
    expect(tree.some((node) => node.type === 'button' && node.props.children === 'calendar.deviceChoice')).toBe(false)
    expect(tree.find((node) => node.type === 'button' && node.props.children === 'calendar.appleChoice')!.props['aria-pressed']).toBe('true')
    expect(tree.some((node) => node.type === 'button' && node.props.children === 'calendar.disconnect')).toBe(true)
    ;(tree.find((node) => node.type === 'button' && node.props.children === 'calendar.appleChoice')!.props.onClick as () => void)()
    tree = render()
    expect(tree.filter((node) => node.type === 'button').map((node) => node.props.children)).toEqual(['calendar.appleChoice', 'calendar.disconnect'])
  })
})
