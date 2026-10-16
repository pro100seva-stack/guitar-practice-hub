import { useEffect, useState } from 'react'
import { RouterProvider } from 'react-router/dom'
import { supabase } from '../lib/supabase'
import { ensureDefaultProgramContinuation } from '../lib/defaultProgram'
import { router } from '../router'
import Login from '../pages/Login'
import { captureLocalMaterialAccess, isLocalMaterialAccessCurrent, localMaterialOwner, watchLocalMaterialIdentity } from '../lib/localMaterialAccess'

export default function AuthGate() {
  const [identity, setIdentity] = useState<{ uid: string; epoch: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    return watchLocalMaterialIdentity((uid, epoch, verified) => {
      setIdentity((current) => current?.uid === uid && current.epoch === epoch ? current : uid ? { uid, epoch } : null)
      setReady(verified)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!identity) return
    let access
    try { access = captureLocalMaterialAccess() } catch { return }
    if (localMaterialOwner(access) !== identity.uid) return
    void ensureDefaultProgramContinuation().then(() => {
      if (isLocalMaterialAccessCurrent(access)) return supabase.rpc('sync_program_status')
    }).catch(() => {})
  }, [identity])

  if (loading) return <div className="min-h-screen bg-slate-900" />
  return <>
    {!ready && <div className="min-h-screen bg-slate-900" />}
    <div hidden={!ready} inert={!ready}>
      {!identity ? <Login /> : <RouterProvider key={`${identity.uid}:${identity.epoch}`} router={router} />}
    </div>
  </>
}