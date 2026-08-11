import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { RouterProvider } from 'react-router/dom'
import { supabase } from '../lib/supabase'
import { router } from '../router'
import Login from '../pages/Login'

export default function AuthGate() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  if (loading) return <div className="min-h-screen bg-slate-900" />
  if (!session) return <Login />
  return <RouterProvider router={router} />
}