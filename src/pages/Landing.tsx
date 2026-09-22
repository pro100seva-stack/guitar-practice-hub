import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/database.types'
import evhImage from '../assets/EVH_Frankenstrat.jpg'

type PlanWeek = Database['public']['Tables']['plan_weeks']['Row']
type ScheduledPlanWeek = PlanWeek & {
  start_date: string
  end_date: string
  week_number: number
}

function isScheduledWeek(week: PlanWeek): week is ScheduledPlanWeek {
  return week.week_number !== null && week.start_date !== null && week.end_date !== null
}

export default function Landing() {
  const navigate = useNavigate()
  const [currentWeek, setCurrentWeek] = useState<ScheduledPlanWeek | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadCurrentWeek() {
      const { data, error } = await supabase.from('plan_weeks').select('*').order('start_date', { ascending: true })

      if (!isMounted) return

      if (error || !data) {
        setCurrentWeek(null)
        setLoading(false)
        return
      }

      const scheduledWeeks = ((data ?? []) as PlanWeek[]).filter(isScheduledWeek)
      const today = new Date().toISOString().slice(0, 10)
      const activeWeek =
        scheduledWeeks.find((week) => week.start_date <= today && week.end_date >= today) ?? scheduledWeeks[0] ?? null

      setCurrentWeek(activeWeek)
      setLoading(false)
    }

    void loadCurrentWeek()

    return () => {
      isMounted = false
    }
  }, [])

  const currentWeekDescription = loading
    ? 'Loading current week…'
    : currentWeek
      ? `Week ${currentWeek.week_number ?? '?'} · ${currentWeek.focus?.trim() || currentWeek.phase || 'Current week plan'}`
      : 'No current week plan yet'

  const navItems = [
    { label: 'My Progress', path: '/progress', tone: 'sky', variant: 'default' },
    {
      label: 'Current Week',
      path: '/plan',
      tone: 'violet',
      variant: 'snippet',
      description: currentWeekDescription,
    },
    { label: 'Practice!', path: '/practice', tone: 'emerald', variant: 'ellipse' },
  ]

  return (
    <div className="relative flex h-full items-center justify-center overflow-hidden px-4 py-8">
      <div className="relative z-10 flex w-full max-w-5xl items-center justify-center">
        <nav className="flex w-full max-w-md flex-col items-center gap-3 pb-8 pt-4">
          {navItems.map((item) => (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              className={[
                'border p-4 text-center transition hover:-translate-y-0.5 hover:border-slate-500',
                item.variant === 'default' && 'w-full max-w-xs rounded-xl border-sky-700/60 bg-sky-500/10 text-sky-100',
                item.variant === 'snippet' && 'w-full max-w-sm rounded-xl border-violet-700/60 bg-violet-500/10 px-5 py-3 text-violet-100',
                item.variant === 'ellipse' && 'mt-8 w-full max-w-[16rem] rounded-full border-emerald-700/60 bg-emerald-500/10 px-5 py-4 text-emerald-100',
              ].join(' ')}
            >
              <h2 className="text-xl font-semibold">{item.label}</h2>
              {item.variant === 'snippet' && item.description ? (
                <p className="mt-2 text-sm text-current/80">{item.description}</p>
              ) : null}
            </button>
          ))}
        </nav>
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[-8%] top-0 z-0 flex h-[calc(100vh-73px)] items-center justify-end overflow-hidden"
        style={{ width: '40vw', maxWidth: '430px', minWidth: '230px' }}
      >
        <img
          src={evhImage}
          alt="Frankenstrat electric guitar"
          className="h-full w-auto max-h-[calc(100vh-73px)] object-contain"
          style={{
            display: 'block',
            filter: 'brightness(1)',
            transform: 'scale(0.92)',
            transformOrigin: 'right center',
          }}
        />
      </div>

      <footer className="absolute bottom-4 left-1/2 z-20 w-[min(92vw,44rem)] -translate-x-1/2 rounded-xl border border-slate-700/80 bg-slate-950/70 px-4 py-3 text-left backdrop-blur-sm">
        <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Featured guitar</p>
        <p className="mt-2 text-sm text-slate-200">
          <span className="font-semibold text-white">Frankenstrat</span> became famous because Eddie Van Halen used it to
          popularize the two-handed tapping technique, turning a familiar guitar into a new voice for rock.
        </p>
        <p className="mt-1 text-xs leading-relaxed text-slate-300">
          Its significance was part practicality and part rebellion: a homemade body, modified pickups, and a slim, fast neck
          gave it punchy attack, sustain, and a bright, expressive tone that helped define 80s hard rock.
        </p>
      </footer>
    </div>
  )
}
