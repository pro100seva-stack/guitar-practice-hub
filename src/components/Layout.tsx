import { Link, Outlet } from 'react-router'
import { supabase } from '../lib/supabase'

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <nav aria-label="Primary navigation" className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900 px-4 py-3">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium">
          <Link to="/" className="text-slate-200 transition hover:text-white">Sessions</Link>
          <Link to="/plan" className="text-slate-400 transition hover:text-white">Plan</Link>
          <Link to="/stats" className="text-slate-400 transition hover:text-white">Stats</Link>
        </div>
        <button onClick={() => supabase.auth.signOut()} className="text-sm text-slate-400 transition hover:text-slate-200">
          Sign out
        </button>
      </nav>
      <main className="p-4"><Outlet /></main>
    </div>
  )
}