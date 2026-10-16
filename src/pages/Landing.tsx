import { useEffect, useId, useState } from 'react'
import { useNavigate } from 'react-router'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/database.types'
import evhImage from '../assets/EVH_Frankenstrat.jpg'
import { useI18n } from '../lib/i18n'

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
  const [guitarExpanded, setGuitarExpanded] = useState(false)
  const guitarRegionId = useId()
  const { t } = useI18n()

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
    ? t('Loading current week…')
    : currentWeek
      ? `${t('Week {week}', { week: currentWeek.week_number ?? '?' })} · ${currentWeek.focus?.trim() || t('Current week plan')}`
      : t('No current week plan yet')

  const navItems = [
    { label: t('My Progress'), path: '/progress', tone: 'sky', variant: 'default' },
    {
      label: t('Current Week'),
      path: '/plan',
      tone: 'violet',
      variant: 'snippet',
      description: currentWeekDescription,
    },
    { label: t('Practice!'), path: '/practice', tone: 'emerald', variant: 'ellipse' },
  ]

  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden py-4 lg:py-8">
      <h1 className="sr-only">{t('Guitar Practice Hub')}</h1>
      <div className="relative z-10 flex w-full max-w-5xl items-center justify-center">
        <nav className="flex w-full max-w-md flex-col items-center gap-3 pb-14 pt-4 lg:pb-8">
          {navItems.map((item) => (
            <button
              key={item.path}
              type="button"
              data-tour={item.path === '/progress' ? 'progress' : item.path === '/plan' ? 'current-week' : 'practice'}
              onClick={() => navigate(item.path)}
              className={[
                'relative z-10 w-full max-w-md rounded-xl border p-4 text-center backdrop-blur-[2px] transition lg:backdrop-blur-none hover:-translate-y-0.5 hover:border-slate-500',
                item.variant === 'default' && 'border-sky-700/60 bg-sky-950/85 text-sky-100 lg:bg-sky-500/10',
                item.variant === 'snippet' && 'border-violet-700/60 bg-violet-950/85 py-3 text-violet-100 lg:bg-violet-500/10',
                item.variant === 'ellipse' && 'mt-4 border-emerald-700/60 bg-emerald-950/85 py-5 text-emerald-100 lg:mt-8 lg:bg-emerald-500/10 [@media(min-height:700px)]:mt-8',
              ].join(' ')}
            >
              <span className={`block font-semibold ${item.variant === 'ellipse' ? 'text-2xl' : 'text-xl'}`}>{item.label}</span>
              {item.variant === 'snippet' && item.description ? (
                <p className="mt-2 line-clamp-2 text-sm text-current/80">{item.description}</p>
              ) : null}
            </button>
          ))}
        </nav>
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-16 right-[-14%] top-0 z-0 flex w-[52vw] min-w-[200px] max-w-[260px] items-center justify-end overflow-hidden opacity-40 [-webkit-mask-image:linear-gradient(to_right,transparent_0%,#000_55%)] [mask-image:linear-gradient(to_right,transparent_0%,#000_55%)] sm:right-[-8%] sm:w-[40vw] sm:min-w-[230px] sm:max-w-[430px] lg:opacity-100 lg:[-webkit-mask-image:none] lg:[mask-image:none]"
      >
        <img
          src={evhImage}
          alt={t('Frankenstrat')}
          className="h-full w-auto max-h-full object-contain"
          style={{
            display: 'block',
            filter: 'brightness(1)',
            transform: 'scale(0.92)',
            transformOrigin: 'right center',
          }}
        />
      </div>

      <aside
        className={`absolute bottom-4 right-4 z-20 max-h-[60dvh] max-w-[min(92vw,20rem)] overflow-y-auto rounded-xl border border-slate-700/80 bg-slate-950 text-left lg:right-8 ${guitarExpanded ? 'w-[min(92vw,20rem)]' : 'w-auto'}`}
      >
        <div id={guitarRegionId} hidden={!guitarExpanded} className="px-4 pt-3">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{t('Featured guitar')}</p>
          <p className="mt-2 text-sm text-slate-200">
            <span className="font-semibold text-white">{t('Frankenstrat')}</span> {t('Frankenstrat became famous because Eddie Van Halen used it to popularize the two-handed tapping technique, turning a familiar guitar into a new voice for rock.')}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-300">
            {t('Its significance was part practicality and part rebellion: a homemade body, modified pickups, and a slim, fast neck gave it punchy attack, sustain, and a bright, expressive tone that helped define 80s hard rock.')}
          </p>
        </div>
        <button
          type="button"
          aria-expanded={guitarExpanded}
          aria-controls={guitarRegionId}
          data-tour="featured-guitar"
          onClick={() => setGuitarExpanded((expanded) => !expanded)}
          className="sticky bottom-0 flex min-h-11 w-full items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-left text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-sky-400"
        >
          <span>*{t('Frankenstrat')}</span>
          <span aria-hidden="true" className={`text-xs text-slate-400 transition-transform ${guitarExpanded ? 'rotate-180' : ''}`}>
            ▾
          </span>
        </button>
      </aside>
    </div>
  )
}
