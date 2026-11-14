import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LocalMaterialAccess } from '../src/lib/localMaterialAccess'
import type { GoogleCalendarConnection } from '../src/lib/googleCalendar'

const authority = vi.hoisted(() => ({ current: null as object | null, owners: new WeakMap<object, string>(), listeners: [] as Array<() => void> }))
vi.mock('../src/lib/localMaterialAccess', () => ({
  isLocalMaterialAccessCurrent: (access: object) => authority.current === access,
  localMaterialOwner: (access: object) => { if (authority.current !== access) throw new Error('denied'); return authority.owners.get(access)! },
  onLocalMaterialInvalidation: (callback: () => void) => { authority.listeners.push(callback); return () => {} },
}))
import { forgetCalendarConnection, hasPersistentCalendarSupport, rememberCalendarProvider, rememberPersistentCalendarSupport, retainCalendarConnection, retainedCalendarConnection, selectedCalendarProvider } from '../src/lib/calendarConnection'

function login(owner: string) {
  authority.current = {}
  authority.owners.set(authority.current, owner)
  return authority.current as LocalMaterialAccess
}
function connection() {
  return { expiresAt: Date.now() + 3_600_000, dispose: vi.fn(), disconnect: vi.fn() } as unknown as GoogleCalendarConnection
}
beforeEach(() => {
  authority.current = null
  authority.listeners.forEach((callback) => callback())
  const values = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) }, removeItem: (key: string) => { values.delete(key) } })
})
afterEach(() => vi.unstubAllGlobals())

describe('calendar connection ownership and route lifetime', () => {
  it('retains a provider choice for its account and clears only that choice on reset', () => {
    const access = login('choice-owner')
    rememberCalendarProvider(access, 'apple')
    expect(selectedCalendarProvider(access)).toBe('apple')
    const client = connection()
    retainCalendarConnection(access, client)
    rememberCalendarProvider(access, null)
    expect(selectedCalendarProvider(access)).toBeNull()
    expect(retainedCalendarConnection(access)).toBe(client)
    expect(client.disconnect).not.toHaveBeenCalled()
    rememberCalendarProvider(access, 'device')
    const other = login('different-choice-owner')
    expect(selectedCalendarProvider(other)).toBeNull()
    rememberCalendarProvider(access, 'google')
    expect(selectedCalendarProvider(login('choice-owner'))).toBe('device')
  })

  it('retains the same connection after leaving and reopening Settings without revoking Google access', () => {
    const access = login('route-owner')
    const client = connection()
    retainCalendarConnection(access, client)
    expect(retainedCalendarConnection(access)).toBe(client)
    expect(retainedCalendarConnection(access)).toBe(client)
    expect(client.dispose).not.toHaveBeenCalled()
    expect(client.disconnect).not.toHaveBeenCalled()
  })

  it('clears browser authority on account changes without unlinking the old server account', () => {
    const old = login('owner-a')
    const client = connection()
    retainCalendarConnection(old, client)
    const next = login('owner-b')
    authority.listeners.forEach((callback) => callback())
    expect(retainedCalendarConnection(next)).toBeNull()
    expect(retainedCalendarConnection(old)).toBeNull()
    expect(client.dispose).toHaveBeenCalledOnce()
    expect(client.disconnect).not.toHaveBeenCalled()
  })

  it('disposes a replaced or explicitly forgotten local proxy and refuses stale owner writes', () => {
    const access = login('replace-owner')
    const first = connection()
    const second = connection()
    retainCalendarConnection(access, first)
    retainCalendarConnection(access, second)
    expect(first.dispose).toHaveBeenCalledOnce()
    forgetCalendarConnection(access)
    expect(second.dispose).toHaveBeenCalledOnce()
    const other = login('other-owner')
    retainCalendarConnection(access, first)
    expect(retainedCalendarConnection(other)).toBeNull()
  })

  it('records only account-scoped server capability metadata and isolates other accounts', () => {
    const access = login('server-owner')
    expect(hasPersistentCalendarSupport(access)).toBe(false)
    rememberPersistentCalendarSupport(access)
    expect(hasPersistentCalendarSupport(access)).toBe(true)
    expect(globalThis.localStorage.getItem('pro100practice:calendar-server-known:server-owner')).toBe('1')
    const other = login('never-linked')
    expect(hasPersistentCalendarSupport(other)).toBe(false)
  })
})
