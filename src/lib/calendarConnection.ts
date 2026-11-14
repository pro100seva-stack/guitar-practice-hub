import { isLocalMaterialAccessCurrent, localMaterialOwner, onLocalMaterialInvalidation, type LocalMaterialAccess } from './localMaterialAccess'
import type { GoogleCalendarConnection } from './googleCalendar'

type Entry = { access: LocalMaterialAccess; connection: GoogleCalendarConnection }
export type CalendarProviderChoice = 'google' | 'apple' | 'device'
const retained = new Map<string, Entry>()
const selectedProviders = new Map<string, CalendarProviderChoice | null>()
const persistentOwners = new Set<string>()
const persistentKey = (owner: string) => `pro100practice:calendar-server-known:${encodeURIComponent(owner)}`
const providerKey = (owner: string) => `pro100practice:calendar-provider:${encodeURIComponent(owner)}`

/** Provider preference only, scoped to the current app account; never credentials. */
export function selectedCalendarProvider(access: LocalMaterialAccess): CalendarProviderChoice | null {
  if (!isLocalMaterialAccessCurrent(access)) return null
  const owner = localMaterialOwner(access)
  if (selectedProviders.has(owner)) return selectedProviders.get(owner) ?? null
  try {
    const value = globalThis.localStorage?.getItem(providerKey(owner))
    return value === 'google' || value === 'apple' || value === 'device' ? value : null
  } catch { return null }
}

export function rememberCalendarProvider(access: LocalMaterialAccess, provider: CalendarProviderChoice | null) {
  if (!isLocalMaterialAccessCurrent(access)) return
  const owner = localMaterialOwner(access)
  selectedProviders.set(owner, provider)
  try {
    if (provider) globalThis.localStorage?.setItem(providerKey(owner), provider)
    else globalThis.localStorage?.removeItem(providerKey(owner))
  } catch { /* Retain the selection for this session when storage is unavailable. */ }
}

/** Capability metadata only; Google credentials never enter browser storage. */
export function hasPersistentCalendarSupport(access: LocalMaterialAccess) {
  if (!isLocalMaterialAccessCurrent(access)) return false
  const owner = localMaterialOwner(access)
  if (persistentOwners.has(owner)) return true
  try { return globalThis.localStorage?.getItem(persistentKey(owner)) === '1' } catch { return false }
}

export function rememberPersistentCalendarSupport(access: LocalMaterialAccess) {
  if (!isLocalMaterialAccessCurrent(access)) return
  const owner = localMaterialOwner(access)
  persistentOwners.add(owner)
  try { globalThis.localStorage?.setItem(persistentKey(owner), '1') } catch { /* Memory still protects this session. */ }
}

/** Memory only: routing away from Settings is not a request to unlink a calendar. */
export function retainedCalendarConnection(access: LocalMaterialAccess) {
  for (const [owner, entry] of retained) {
    if (!isLocalMaterialAccessCurrent(entry.access)) { entry.connection.dispose(); retained.delete(owner) }
  }
  if (!isLocalMaterialAccessCurrent(access)) return null
  return retained.get(localMaterialOwner(access))?.connection ?? null
}

export function retainCalendarConnection(access: LocalMaterialAccess, connection: GoogleCalendarConnection) {
  if (!isLocalMaterialAccessCurrent(access)) { connection.dispose(); return }
  const owner = localMaterialOwner(access)
  const previous = retained.get(owner)?.connection
  if (previous && previous !== connection) previous.dispose()
  retained.set(owner, { access, connection })
}

export function forgetCalendarConnection(access: LocalMaterialAccess) {
  if (!isLocalMaterialAccessCurrent(access)) return
  const owner = localMaterialOwner(access)
  retained.get(owner)?.connection.dispose()
  retained.delete(owner)
}

function clearCalendarConnections() {
  for (const entry of retained.values()) entry.connection.dispose()
  retained.clear()
}

// This subscription outlives the Settings component, so signing out elsewhere clears browser tokens too.
onLocalMaterialInvalidation(clearCalendarConnections)
