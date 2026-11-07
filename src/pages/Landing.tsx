import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/database.types'
import evhImage from '../assets/EVH_Frankenstrat.jpg'
import { frankenstratHitArea } from '../assets/frankenstratHitArea'
import { useI18n } from '../lib/i18n'
import { toLocalIsoDate } from '../lib/dateFormat'

type PlanWeek = Database['public']['Tables']['plan_weeks']['Row']
type ScheduledPlanWeek = PlanWeek & {
  start_date: string
  end_date: string
  week_number: number
}

function isScheduledWeek(week: PlanWeek): week is ScheduledPlanWeek {
  return week.week_number !== null && week.start_date !== null && week.end_date !== null
}

// Must match Practice's local-date week selection, not UTC.
function weekContainingLocalDate<T extends { start_date: string; end_date: string }>(weeks: readonly T[], now: Date = new Date()) {
  const today = toLocalIsoDate(now)
  return weeks.find((item) => item.start_date <= today && item.end_date >= today) ?? null
}

export default function Landing() {
  const navigate = useNavigate()
  const [currentWeek, setCurrentWeek] = useState<ScheduledPlanWeek | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [retry, setRetry] = useState(0)
  const [guitarExpanded, setGuitarExpanded] = useState(false)
  const guitarRegionId = useId()
  const guitarClipId = useId()
  const guitarButtonRef = useRef<HTMLButtonElement | null>(null)
  const { t } = useI18n()

  useEffect(() => {
    let isMounted = true

    async function loadCurrentWeek() {
      setLoading(true)
      setLoadFailed(false)
      const { data, error } = await supabase.from('plan_weeks').select('*').order('start_date', { ascending: true })

      if (!isMounted) return

      if (error || !data) {
        setLoadFailed(true)
        setCurrentWeek(null)
        setLoading(false)
        return
      }

      const scheduledWeeks = ((data ?? []) as PlanWeek[]).filter(isScheduledWeek)
      const activeWeek = weekContainingLocalDate(scheduledWeeks) ?? scheduledWeeks[0] ?? null

      setCurrentWeek(activeWeek)
      setLoading(false)
    }

    void loadCurrentWeek()

    return () => {
      isMounted = false
    }
  }, [retry])

  const currentWeekDescription = loading
    ? t('Loading current week…')
    : currentWeek
      ? `${t('Week {week}', { week: currentWeek.week_number ?? '?' })} · ${currentWeek.focus?.trim() || t('Current week plan')}`
      : t(loadFailed ? 'ux.planLoadFailed' : 'ux.noCurrentWeek')
  const isTodayWeek = currentWeek !== null && weekContainingLocalDate([currentWeek]) !== null

  const navItems = [
    { label: t('My Progress'), path: '/progress', tone: 'sky', variant: 'default' },
    {
      label: t(currentWeek && !isTodayWeek ? 'Selected week' : 'Current Week'),
      path: currentWeek ? `/plan?week=${encodeURIComponent(currentWeek.id)}` : '/plan',
      tone: 'violet',
      variant: 'snippet',
      description: currentWeekDescription,
    },
    { label: t('Practice'), path: '/practice', tone: 'emerald', variant: 'ellipse' },
  ]

  return (
    <div className="home-scene">
      <h1 className="sr-only">{t('Guitar Practice Hub')}</h1>
        <nav className="home-navigation">
          {navItems.map((item) => (
            <button
              key={item.path}
              type="button"
              data-tour={item.path === '/progress' ? 'progress' : item.variant === 'snippet' ? 'current-week' : 'practice'}
              onClick={() => navigate(item.path)}
              className={'home-wood home-card home-card-' + item.variant}
            >
              <span className="home-card-label">{item.label}</span>
              {item.variant === 'snippet' && item.description ? (
                <p className="home-week-description">{item.description}</p>
              ) : null}
            </button>
          ))}
          {loadFailed && <button type="button" onClick={() => setRetry((value) => value + 1)} className="home-wood home-retry">{t('Retry')}</button>}
        </nav>

      <svg width="0" height="0" aria-hidden="true" focusable="false" className="absolute">
        <defs>
          <clipPath id={guitarClipId} clipPathUnits="objectBoundingBox">
            <path d={frankenstratHitArea} />
          </clipPath>
        </defs>
      </svg>
      <div className="home-guitar-frame">
      <button
        ref={guitarButtonRef}
        type="button"
        aria-expanded={guitarExpanded}
        aria-controls={guitarRegionId}
        aria-label={t('Frankenstrat')}
        data-tour="featured-guitar"
        onClick={() => setGuitarExpanded((expanded) => !expanded)}
        className="home-guitar"
        style={{ clipPath: `url(#${guitarClipId})` }}
      >
        <img src={evhImage} alt="" />
      </button>
      </div>

      <aside
        id={guitarRegionId}
        hidden={!guitarExpanded}
        aria-label={t('Featured guitar')}
        className="home-guitar-note"
      >
        <div className="home-guitar-note-heading">
          <p className="home-note-title">{t('Featured guitar')}</p>
          <button
            type="button"
            aria-label={t('Close')}
            onClick={() => { setGuitarExpanded(false); guitarButtonRef.current?.focus() }}
            className="home-note-close"
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="m5 5 10 10M15 5 5 15" /></svg>
          </button>
        </div>
        <div className="px-3 pb-3">
          <p className="home-note-copy">
            <span className="font-semibold">{t('Frankenstrat')}</span> {t('Frankenstrat became famous because Eddie Van Halen used it to popularize the two-handed tapping technique, turning a familiar guitar into a new voice for rock.')}
          </p>
          <p className="home-note-copy">
            {t('Its significance was part practicality and part rebellion: a homemade body, modified pickups, and a slim, fast neck gave it punchy attack, sustain, and a bright, expressive tone that helped define 80s hard rock.')}
          </p>
        </div>
      </aside>
    </div>
  )
}
