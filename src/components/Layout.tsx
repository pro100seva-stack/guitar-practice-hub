import { Link, Outlet } from 'react-router'
import { supabase } from '../lib/supabase'

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <nav className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="flex gap-4">
          <Link to="/">Sessions</Link>
          <Link to="/plan">Plan</Link>
          <Link to="/stats">Stats</Link>
        </div>
        <button onClick={() => supabase.auth.signOut()} className="text-sm text-slate-400 hover:text-slate-200">
          Sign out
        </button>
      </nav>
      <main className="p-4"><Outlet /></main>
    </div>
  )
}