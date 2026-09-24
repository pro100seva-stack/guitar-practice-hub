import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Preferences = {
  habit_reminders: boolean
  show_completed_weeks: boolean
  collapse_plan_notes: boolean
  compact_practice_cards: boolean
  show_target_practice_time: boolean
}

const defaultPreferences: Preferences = {
  habit_reminders: true,
  show_completed_weeks: true,
  collapse_plan_notes: false,
  compact_practice_cards: false,
  show_target_practice_time: true,
}

const preferenceGroups: Array<{ label: string; items: Array<{ key: keyof Preferences; label: string }> }> = [
  {
    label: 'Practice',
    items: [
      { key: 'habit_reminders', label: 'Enable habit reminders' },
      { key: 'compact_practice_cards', label: 'Use compact practice cards' },
      { key: 'show_target_practice_time', label: 'Show target practice time' },
    ],
  },
  {
    label: 'Progress',
    items: [{ key: 'show_completed_weeks', label: 'Show completed weeks in progress overview' }],
  },
  {
    label: 'Plan',
    items: [{ key: 'collapse_plan_notes', label: 'Keep plan notes collapsed by default' }],
  },
]

export default function Settings() {
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences)
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<keyof Preferences | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadPreferences() {
      const { data, error: loadError } = await supabase.from('app_settings').select('*').maybeSingle()
      if (loadError) setError(loadError.message)
      if (data) {
        setPreferences({
          habit_reminders: data.habit_reminders,
          show_completed_weeks: data.show_completed_weeks,
          collapse_plan_notes: data.collapse_plan_notes,
          compact_practice_cards: data.compact_practice_cards,
          show_target_practice_time: data.show_target_practice_time,
        })
      }
      setLoading(false)
    }

    void loadPreferences()
  }, [])

  async function togglePreference(key: keyof Preferences) {
    const nextValue = !preferences[key]
    setPreferences((current) => ({ ...current, [key]: nextValue }))
    setSavingKey(key)
    setError(null)

    const { error: saveError } = await supabase.from('app_settings').upsert({
      ...preferences,
      [key]: nextValue,
    })

    if (saveError) {
      setPreferences((current) => ({ ...current, [key]: !nextValue }))
      setError(saveError.message)
    }
    setSavingKey(null)
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
        <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400">Settings</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-100">Preferences</h1>
        <p className="mt-2 text-sm text-slate-300">Preferences are saved to your account.</p>
      </section>

      {loading && <p className="text-sm text-slate-400">Loading preferences…</p>}
      {preferenceGroups.map((group) => (
        <section key={group.label} className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/70 p-5">
          <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400">{group.label}</p>
          {group.items.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between gap-4 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-3 text-sm text-slate-200">
              <span>{label}</span>
              <button
                type="button"
                role="switch"
                aria-checked={preferences[key]}
                aria-label={label}
                disabled={loading || savingKey === key}
                onClick={() => void togglePreference(key)}
                className={[
                  'relative h-6 w-11 shrink-0 rounded-full border transition',
                  preferences[key] ? 'border-sky-400 bg-sky-500/70' : 'border-slate-600 bg-slate-800',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                ].join(' ')}
              >
                <span
                  aria-hidden="true"
                  className={[
                    'absolute left-0.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow transition-transform',
                    preferences[key] ? 'translate-x-5' : 'translate-x-0',
                  ].join(' ')}
                />
              </button>
            </div>
          ))}
        </section>
      ))}
      {error && <p className="text-sm text-red-300">{error}</p>}
    </div>
  )
}
