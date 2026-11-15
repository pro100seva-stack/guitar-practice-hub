import { useEffect, useLayoutEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { defaultLanguage, isLanguage, supportedLanguages, type Language } from '../lib/language'
import { useI18n } from '../lib/i18n'
import AppSelect from '../components/AppSelect'
import CalendarSettings from '../components/CalendarSettings'
import { registerPwaUpdateGuard, setPwaUpdateGuard } from '../lib/pwaUpdateRuntime'

type Preferences = {
  language: Language
  include_default_exercises: boolean
  show_completed_weeks: boolean
  show_target_practice_time: boolean
}

type BooleanPreferenceKey = Exclude<keyof Preferences, 'language'>

const defaultPreferences: Preferences = {
  language: defaultLanguage,
  include_default_exercises: true,
  show_completed_weeks: true,
  show_target_practice_time: true,
}

const preferenceGroups: Array<{ label: string; items: Array<{ key: BooleanPreferenceKey; label: string }> }> = [
  {
    label: 'Practice',
    items: [
      { key: 'include_default_exercises', label: 'Include default exercises' },
      { key: 'show_target_practice_time', label: 'Show target practice time' },
    ],
  },
  {
    label: 'Progress',
    items: [{ key: 'show_completed_weeks', label: 'Show completed weeks in progress overview' }],
  },
]

export default function Settings() {
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences)
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<BooleanPreferenceKey | 'language' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const { t, setLanguage: setInterfaceLanguage } = useI18n()
  const safeToUpdate = !loading && savingKey === null && !error

  useLayoutEffect(() => registerPwaUpdateGuard('settings', false), [])
  useLayoutEffect(() => { setPwaUpdateGuard('settings', safeToUpdate) }, [safeToUpdate])

  useEffect(() => {
    async function loadPreferences() {
      const { data, error: loadError } = await supabase.from('app_settings').select('*').maybeSingle()
      if (loadError) setError(loadError.message)
      if (data) {
        setPreferences({
          language: isLanguage(data.language) ? data.language : defaultLanguage,
          include_default_exercises: data.include_default_exercises ?? true,
          show_completed_weeks: data.show_completed_weeks,
          show_target_practice_time: data.show_target_practice_time,
        })
      }
      setLoading(false)
    }

    void loadPreferences()
  }, [])

  async function togglePreference(key: BooleanPreferenceKey) {
    const nextValue = !preferences[key]
    setPreferences((current) => ({ ...current, [key]: nextValue }))
    setSavingKey(key)
    setSaved(false)
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
    setSaved(!saveError)
  }

  async function changeLanguage(language: Language) {
    const previousLanguage = preferences.language
    setPreferences((current) => ({ ...current, language }))
    setInterfaceLanguage(language)
    setSavingKey('language')
    setSaved(false)
    setError(null)

    const { error: saveError } = await supabase.from('app_settings').upsert({ ...preferences, language })
    if (saveError) {
      setPreferences((current) => ({ ...current, language: previousLanguage }))
      setInterfaceLanguage(previousLanguage)
      setError(saveError.message)
    }
    setSavingKey(null)
    setSaved(!saveError)
  }

  return (
    <div className="page">
      <div className="pb-4">
        <h1 className="page-title">{t('Preferences')}</h1>
        <p className="meta mt-1">{t('Preferences are saved to your account.')}</p>
        <p role="status" className="meta mt-1">{savingKey ? t('Saving…') : saved ? t('ux.preferencesSaved') : ''}</p>
        {error && <p role="alert" className="msg-error mt-2">{error}</p>}
        {loading && <p role="status" className="state pb-0">{t('Loading preferences…')}</p>}
      </div>
      <section data-tour="settings-language" className="section">
        <h2 className="section-title">{t('Language')}</h2>
        <div className="list mt-3">
          <label className="list-row flex-wrap justify-between text-sm text-slate-200">
            <span>{t('Interface language')}</span>
            <AppSelect
              aria-label={t('Interface language')}
              value={preferences.language}
              onValueChange={(value) => { if (isLanguage(value)) void changeLanguage(value) }}
              disabled={loading || savingKey !== null}
              className="field w-auto disabled:opacity-50"
              options={supportedLanguages.map((option) => ({ value: option, label: t(option.toUpperCase()) }))}
            />
          </label>
        </div>
      </section>
      {preferenceGroups.map((group) => (
        <section key={group.label} data-tour={group.label === 'Practice' ? 'settings-preferences' : undefined} className="section">
          <h2 className="section-title">{t(group.label)}</h2>
          <div className="list mt-3">
            {group.items.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                role="switch"
                aria-checked={preferences[key]}
                disabled={loading || savingKey !== null}
                onClick={() => void togglePreference(key)}
                className="list-row justify-between text-sm text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span>{t(label)}</span>
                <span
                  aria-hidden="true"
                  className={[
                    'relative h-6 w-11 shrink-0 rounded-full border transition',
                    preferences[key] ? 'border-sky-400 bg-sky-500/70' : 'border-slate-600 bg-slate-800',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'absolute left-0.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow transition-transform',
                      preferences[key] ? 'translate-x-5' : 'translate-x-0',
                    ].join(' ')}
                  />
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}
      <CalendarSettings />
    </div>
  )
}
