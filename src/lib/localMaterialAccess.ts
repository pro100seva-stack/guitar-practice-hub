import { supabase } from './supabase'

declare const accessBrand: unique symbol
export type LocalMaterialAccess = { readonly [accessBrand]: true }
type Identity = { uid: string; epoch: number }
const tokens = new WeakMap<LocalMaterialAccess, Identity>()
const listeners = new Set<() => void>()
const verificationListeners = new Set<(ready: boolean) => void>()
let identity: Identity | null = null
let verifying = false
let epoch = 0
let revision = 0

function acceptIdentity(uid: string | null) {
  if (uid === '.' || uid === '..') uid = null
  revision++
  if (identity?.uid === uid || (!identity && !uid)) return
  identity = uid ? { uid, epoch: ++epoch } : null
  for (const listener of listeners) listener()
}

export function captureLocalMaterialAccess(): LocalMaterialAccess {
  if (!identity) throw new Error('LOCAL_MATERIAL_ACCESS_DENIED')
  const token = Object.freeze({}) as LocalMaterialAccess
  tokens.set(token, identity)
  return token
}

export function localMaterialOwner(access: LocalMaterialAccess): string {
  const captured = tokens.get(access)
  if (!captured || captured !== identity) throw new Error('LOCAL_MATERIAL_ACCESS_DENIED')
  return captured.uid
}

export function isLocalMaterialAccessCurrent(access: LocalMaterialAccess) {
  return !!identity && tokens.get(access) === identity
}

export function onLocalMaterialInvalidation(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function isLocalMaterialIdentityReady() {
  return !verifying && !!identity
}

function setVerifying(value: boolean) {
  verifying = value
  for (const listener of verificationListeners) listener(!value)
}

export function onLocalMaterialVerification(listener: (ready: boolean) => void) {
  verificationListeners.add(listener)
  return () => { verificationListeners.delete(listener) }
}

export async function signOutLocalMaterialIdentity() {
  acceptIdentity(null)
  return supabase.auth.signOut()
}

export function watchLocalMaterialIdentity(onIdentity: (uid: string | null, epoch: number, ready: boolean) => void) {
  let active = true
  const notify = () => { if (active) onIdentity(identity?.uid ?? null, identity?.epoch ?? epoch, !verifying) }
  const unsubscribe = onLocalMaterialInvalidation(notify)
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    if (!active) return
    setVerifying(false)
    acceptIdentity(session?.access_token ? session.user.id : null)
    notify()
  })
  const reconcile = () => {
    const started = ++revision
    setVerifying(true)
    notify()
    void supabase.auth.getSession().then(({ data: result, error }) => {
      if (!active || started !== revision) return
      setVerifying(false)
      acceptIdentity(!error && result.session?.access_token ? result.session.user.id : null)
      notify()
    }).catch(() => {
      if (active && started === revision) { setVerifying(false); acceptIdentity(null); notify() }
    })
  }
  const resume = () => {
    reconcile()
  }
  const visibility = () => { if (document.visibilityState === 'visible') resume() }
  window.addEventListener('focus', resume)
  window.addEventListener('pageshow', resume)
  window.addEventListener('storage', resume)
  document.addEventListener('visibilitychange', visibility)
  reconcile()
  return () => {
    active = false
    unsubscribe()
    data.subscription.unsubscribe()
    window.removeEventListener('focus', resume)
    window.removeEventListener('pageshow', resume)
    window.removeEventListener('storage', resume)
    document.removeEventListener('visibilitychange', visibility)
    acceptIdentity(null)
    setVerifying(false)
  }
}