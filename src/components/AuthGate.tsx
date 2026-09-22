import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { RouterProvider } from 'react-router/dom'
import { supabase } from '../lib/supabase'
import { ensureDefaultProgramContinuation } from '../lib/defaultProgram'
import { router } from '../router'
import Login from '../pages/Login'

export default function AuthGate() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      if (data.session) await ensureDefaultProgramContinuation()
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession) void ensureDefaultProgramContinuation()
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  if (loading) return <div className="min-h-screen bg-slate-900" />
  if (!session) return <Login />
  return <RouterProvider router={router} />
}