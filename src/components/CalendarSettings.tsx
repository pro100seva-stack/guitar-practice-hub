import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useI18n } from '../lib/i18n'
import { localeForLanguage, toLocalIsoDate } from '../lib/dateFormat'
import { addCalendarDays, createCalendarEventDrafts, isCalendarDate, selectCalendarRange, validateCalendarSchedule, type CalendarEventDraft, type CalendarFrequency, type CalendarSchedule, type CalendarScheduleError } from '../lib/calendarSchedule'
import AppSelect from './AppSelect'
import { connectGoogleCalendar, GoogleCalendarError, prepareGoogleCalendar, type GoogleCalendarConnection, type GoogleCalendarCreatedEvent, type GoogleCalendarDestination } from '../lib/googleCalendar'
import { createCalendarIcs } from '../lib/calendarIcs'
import { captureLocalMaterialAccess, isLocalMaterialAccessCurrent, localMaterialOwner, onLocalMaterialInvalidation, type LocalMaterialAccess } from '../lib/localMaterialAccess'
import { forgetCalendarConnection, hasPersistentCalendarSupport, rememberCalendarProvider, rememberPersistentCalendarSupport, retainCalendarConnection, retainedCalendarConnection, selectedCalendarProvider } from '../lib/calendarConnection'
import { createPersistentCalendarApi, loadCalendarServerStatus, requestPersistentCalendarCode, type CalendarAuthorizationBegin } from '../lib/persistentGoogleCalendar'

export type CalendarProvider = 'google' | 'apple' | 'device'
type ReviewedReminder = { planId: string; provider: CalendarProvider; calendarId: string; calendarName: string; title: string; schedule: CalendarSchedule; events: readonly CalendarEventDraft[] }

function CalendarDatePicker({ value, onChange, multiple, selected, range, label }: { value: string; onChange: (value: string) => void; multiple?: boolean; selected: readonly string[]; range?: { start: string; end: string }; label: string }) {
  const { language, t } = useI18n()
  const [month, setMonth] = useState(() => (isCalendarDate(value) ? value : toLocalIsoDate()).slice(0, 7))
  const locale = localeForLanguage(language)
  const first = new Date(`${month}-01T12:00:00Z`)
  const leading = (first.getUTCDay() + 6) % 7
  const dayCount = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate()
  const heading = first.toLocaleDateString(locale, { timeZone: 'UTC', month: 'long', year: 'numeric' })
  const weekdays = Array.from({ length: 7 }, (_, index) => new Date(Date.UTC(2026, 0, 5 + index)).toLocaleDateString(locale, { timeZone: 'UTC', weekday: 'narrow' }))
  function moveMonth(delta: number) {
    const date = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + delta, 1, 12))
    if (date.getUTCFullYear() >= 1900 && date.getUTCFullYear() <= 9999) setMonth(date.toISOString().slice(0, 7))
  }
  return <div className="max-w-sm rounded-xl border border-slate-700 bg-slate-950 p-2" role="group" aria-label={label}>
    <div className="flex items-center justify-between gap-2">
      <button type="button" onClick={() => moveMonth(-1)} aria-label={t('calendar.previousMonth')} className="min-h-11 min-w-11 rounded text-slate-300 hover:bg-slate-800">‹</button>
      <p aria-live="polite" className="text-center text-sm font-medium text-slate-200">{heading}</p>
      <button type="button" onClick={() => moveMonth(1)} aria-label={t('calendar.nextMonth')} className="min-h-11 min-w-11 rounded text-slate-300 hover:bg-slate-800">›</button>
    </div>
    <div className="grid grid-cols-7">
      {weekdays.map((day, index) => <span key={index} aria-hidden="true" className="py-2 text-center text-xs text-slate-400">{day}</span>)}
      {Array.from({ length: leading }, (_, index) => <span key={`blank-${index}`} aria-hidden="true" />)}
      {Array.from({ length: dayCount }, (_, index) => {
        const date = `${month}-${String(index + 1).padStart(2, '0')}`
        const active = range ? date === range.start || (!!range.end && date >= range.start && date <= range.end) : multiple ? selected.includes(date) : date === value
        const edge = range && (date === range.start || date === range.end)
        return <button key={date} type="button" aria-pressed={active} aria-label={new Date(`${date}T12:00:00Z`).toLocaleDateString(locale, { timeZone: 'UTC', dateStyle: 'full' })} onClick={() => onChange(date)} className={`min-h-11 min-w-0 rounded text-sm focus-visible:outline-2 focus-visible:outline-sky-300 ${edge ? 'bg-sky-500/35 font-semibold text-sky-100' : active ? 'bg-sky-500/20 font-semibold text-sky-200' : 'text-slate-300 hover:bg-slate-800'}`}>{index + 1}</button>
      })}
    </div>
  </div>
}

export default function CalendarSettings() {
  const { language, t } = useI18n()
  const prefix = useId()
  const clientId = typeof import.meta.env.VITE_GOOGLE_CALENDAR_CLIENT_ID === 'string' ? import.meta.env.VITE_GOOGLE_CALENDAR_CLIENT_ID.trim() : ''
  const persistentEnabled = import.meta.env.VITE_CALENDAR_PERSISTENT_AUTH === 'true'
  const [initialProvider] = useState(() => {
    try { return selectedCalendarProvider(captureLocalMaterialAccess()) } catch { return null }
  })
  const [provider, setProvider] = useState<CalendarProvider>(initialProvider ?? 'google')
  const [sectionOpen, setSectionOpen] = useState(Boolean(initialProvider))
  const [providerChosen, setProviderChosen] = useState(Boolean(initialProvider))
  const [title, setTitle] = useState('')
  const [mode, setMode] = useState<CalendarSchedule['mode']>('once')
  const [date, setDate] = useState(toLocalIsoDate)
  const [dates, setDates] = useState<string[]>([])
  const [frequency, setFrequency] = useState<CalendarFrequency>('weekly')
  const [interval, setInterval] = useState('1')
  const [until, setUntil] = useState(() => addCalendarDays(toLocalIsoDate(), 90))
  const [rangeAnchor, setRangeAnchor] = useState<string | null>(null)
  const [allDay, setAllDay] = useState(false)
  const [time, setTime] = useState('18:00')
  const [duration, setDuration] = useState(30)
  const [timeZone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
  const [review, setReview] = useState<ReviewedReminder | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sdkReady, setSdkReady] = useState(false)
  const [connection, setConnection] = useState<GoogleCalendarConnection | null>(null)
  const [calendars, setCalendars] = useState<GoogleCalendarDestination[]>([])
  const [calendarId, setCalendarId] = useState('')
  const [completed, setCompleted] = useState<GoogleCalendarCreatedEvent[]>([])
  const [pendingDates, setPendingDates] = useState<string[] | null>(null)
  const [downloaded, setDownloaded] = useState(false)
  const [expired, setExpired] = useState(false)
  const [serverMode, setServerMode] = useState<'checking' | 'server' | 'browser' | 'unavailable'>('checking')
  const [connectionCheck, setConnectionCheck] = useState(0)
  const [authorizationBegin, setAuthorizationBegin] = useState<CalendarAuthorizationBegin | null>(null)
  const [beginCheck, setBeginCheck] = useState(0)
  const beginTimeRef = useRef(0)
  const [serverApi] = useState(() => {
    try {
      const access = captureLocalMaterialAccess()
      return createPersistentCalendarApi(localMaterialOwner(access), undefined, () => isLocalMaterialAccessCurrent(access))
    } catch { return createPersistentCalendarApi(null) }
  })
  const mountedRef = useRef(false)
  const accessRef = useRef<LocalMaterialAccess | null>(null)
  const connectionRef = useRef<GoogleCalendarConnection | null>(null)
  const requestRef = useRef(0)
  const downloadUrlsRef = useRef(new Set<string>())
  const controllerRef = useRef<AbortController | null>(null)

  function currentAccess() {
    return mountedRef.current && accessRef.current !== null && isLocalMaterialAccessCurrent(accessRef.current)
  }

  useEffect(() => {
    mountedRef.current = true
    const downloadUrls = downloadUrlsRef.current
    try { accessRef.current = captureLocalMaterialAccess() } catch { accessRef.current = null }
    if (accessRef.current) {
      const retained = retainedCalendarConnection(accessRef.current)
      if (retained) {
        setProvider('google')
        setProviderChosen(true)
        setSectionOpen(true)
        rememberCalendarProvider(accessRef.current, 'google')
        connectionRef.current = retained
        setConnection(retained)
        setExpired(retained.expiresAt !== null && retained.expiresAt <= Date.now())
      }
    }
    const releaseConnection = () => {
      requestRef.current++
      controllerRef.current?.abort()
      connectionRef.current = null
      accessRef.current = null
    }
    const unsubscribe = onLocalMaterialInvalidation(releaseConnection)
    return () => {
      mountedRef.current = false
      unsubscribe()
      releaseConnection()
      for (const url of downloadUrls) URL.revokeObjectURL(url)
      downloadUrls.clear()
    }
  }, [])

  useEffect(() => {
    if (!providerChosen || provider !== 'google' || serverMode === 'checking' || serverMode === 'unavailable' || (!clientId && serverMode === 'browser')) return
    let cancelled = false
    void prepareGoogleCalendar().then(() => {
      if (!cancelled && currentAccess()) setSdkReady(true)
    }).catch(() => { if (!cancelled && currentAccess()) setError('calendar.googleSdk') })
    return () => { cancelled = true }
  }, [clientId, provider, providerChosen, serverMode])

  useEffect(() => {
    if (!connection || connection.expiresAt === null) return
    const timer = window.setTimeout(() => { if (currentAccess()) setExpired(true) }, Math.max(0, connection.expiresAt - Date.now()))
    return () => window.clearTimeout(timer)
  }, [connection])

  useEffect(() => {
    if (!currentAccess()) return
    let cancelled = false
    const controller = new AbortController()
    const request = ++requestRef.current
    const active = () => !cancelled && currentAccess() && request === requestRef.current
    async function load() {
      setBusy(true)
      setServerMode('checking')
      try {
        const status = await loadCalendarServerStatus(persistentEnabled, serverApi.status, controller.signal)
        if (!active()) return
        if (!status.configured) {
          if (connectionRef.current?.expiresAt === null || (accessRef.current && hasPersistentCalendarSupport(accessRef.current))) throw new GoogleCalendarError('calendar.googleUnavailable')
          setServerMode('browser')
          const direct = connectionRef.current
          setExpired(Boolean(direct && direct.expiresAt !== null && direct.expiresAt <= Date.now()))
          if (direct && direct.expiresAt !== null && direct.expiresAt > Date.now()) {
            const destinations = await direct.listCalendars(controller.signal)
            if (!active()) return
            setCalendars(destinations)
            setCalendarId((previous) => destinations.some((entry) => entry.id === previous) ? previous : destinations.find((entry) => entry.primary)?.id ?? destinations[0]?.id ?? '')
          }
          return
        }
        if (accessRef.current) rememberPersistentCalendarSupport(accessRef.current)
        setServerMode('server')
        setExpired(status.needsReconnect)
        if (status.linked || status.needsReconnect) {
          setProvider('google')
          setProviderChosen(true)
          setSectionOpen(true)
          if (accessRef.current) rememberCalendarProvider(accessRef.current, 'google')
        }
        if (status.linked && !status.needsReconnect) {
          const next = connectionRef.current?.expiresAt === null ? connectionRef.current : serverApi.connection()
          connectionRef.current = next
          if (accessRef.current) retainCalendarConnection(accessRef.current, next)
          const destinations = await next.listCalendars(controller.signal)
          if (!active()) return
          setConnection(next)
          setCalendars(destinations)
          setCalendarId((previous) => destinations.some((entry) => entry.id === previous) ? previous : destinations.find((entry) => entry.primary)?.id ?? destinations[0]?.id ?? '')
        } else {
          if (accessRef.current) forgetCalendarConnection(accessRef.current)
          connectionRef.current = null
          setConnection(null)
          setCalendars([])
        }
      } catch (problem) {
        if (!active()) return
        // A failed status request is not permission to switch Google identities through browser fallback.
        if (problem instanceof GoogleCalendarError && (problem.key === 'calendar.googleReconnect' || problem.key === 'calendar.googlePermission')) setExpired(true)
        else setServerMode('unavailable')
        // A failed restore must not hide a possibly linked Google account behind fresh choices.
        if (persistentEnabled) {
          setProvider('google')
          setProviderChosen(true)
          setSectionOpen(true)
        }
        setError(errorKey(problem))
      } finally {
        if (active()) setBusy(false)
      }
    }
    void load()
    return () => { cancelled = true; controller.abort() }
  }, [connectionCheck, persistentEnabled, serverApi])

  useEffect(() => {
    if (serverMode !== 'server' || !providerChosen || provider !== 'google' || busy || (connection && !expired) || !currentAccess()) return
    if (authorizationBegin) {
      const timer = window.setTimeout(() => setAuthorizationBegin(null), Math.max(0, beginTimeRef.current + 9 * 60_000 - Date.now()))
      return () => window.clearTimeout(timer)
    }
    let cancelled = false
    const controller = new AbortController()
    void serverApi.begin(controller.signal).then((begin) => {
      if (!cancelled && currentAccess()) { setAuthorizationBegin(begin); beginTimeRef.current = Date.now() }
    }).catch((problem: unknown) => { if (!cancelled && currentAccess()) setError(errorKey(problem)) })
    return () => { cancelled = true; controller.abort() }
  }, [authorizationBegin, beginCheck, busy, connection, expired, provider, providerChosen, serverApi, serverMode])

  function errorKey(problem: unknown) {
    if (problem instanceof GoogleCalendarError) return problem.key
    if (problem instanceof Error && problem.message.startsWith('calendar.')) return problem.message
    return 'calendar.confirmFailed'
  }

  async function retrySdk() {
    if ((!clientId && serverMode !== 'server') || sdkReady || busy || !currentAccess()) return
    const request = ++requestRef.current
    setBusy(true)
    setError(null)
    try {
      await prepareGoogleCalendar()
      if (currentAccess() && request === requestRef.current) setSdkReady(true)
    } catch { if (currentAccess() && request === requestRef.current) setError('calendar.googleSdk') }
    finally { if (currentAccess() && request === requestRef.current) setBusy(false) }
  }

  async function connect() {
    if (!sdkReady || busy || !currentAccess() || (serverMode !== 'server' && serverMode !== 'browser')) return
    if (serverMode === 'browser' && !clientId) return
    if (serverMode === 'server' && (!authorizationBegin || Date.now() - beginTimeRef.current >= 9 * 60_000)) { setAuthorizationBegin(null); return }
    const request = ++requestRef.current
    connectionRef.current?.dispose()
    connectionRef.current = null
    setConnection(null)
    setBusy(true)
    setError(null)
    setExpired(false)
    const controller = new AbortController()
    controllerRef.current = controller
    // The SDK is already loaded; request authorization directly inside the user's click activation.
    const begin = authorizationBegin
    // Both popup methods are invoked before the first await; backend state was prepared beforehand.
    const authorization = serverMode === 'server' && begin
      ? requestPersistentCalendarCode(begin).then(async (code) => {
        if (!currentAccess() || request !== requestRef.current) throw new GoogleCalendarError('calendar.googleReconnect')
        await serverApi.connect(code, begin.state, controller.signal)
        return serverApi.connection()
      })
      : connectGoogleCalendar(clientId)
    if (serverMode === 'server') setAuthorizationBegin(null)
    try {
      const next = await authorization
      if (!currentAccess() || request !== requestRef.current) { next.dispose(); return }
      connectionRef.current = next
      if (accessRef.current) retainCalendarConnection(accessRef.current, next)
      const destinations = await next.listCalendars(controller.signal)
      if (!currentAccess() || request !== requestRef.current) { next.dispose(); return }
      setConnection(next)
      setCalendars(destinations)
      setCalendarId((previous) => destinations.some((destination) => destination.id === previous) ? previous : destinations.find((destination) => destination.primary)?.id ?? destinations[0]?.id ?? '')
    } catch (problem) {
      if (currentAccess() && request === requestRef.current) {
        connectionRef.current?.dispose()
        if (accessRef.current) forgetCalendarConnection(accessRef.current)
        connectionRef.current = null
        setCalendars([])
        setError(errorKey(problem))
      }
    } finally { if (currentAccess() && request === requestRef.current) setBusy(false) }
  }

  async function disconnect() {
    if (busy || !currentAccess()) return
    if (provider === 'google' && (serverMode === 'checking' || serverMode === 'unavailable')) {
      setError('calendar.googleUnavailable')
      return
    }
    const request = ++requestRef.current
    setBusy(true)
    const previous = connectionRef.current
    setError(null)
    try {
      if (provider === 'google') {
        if (previous) await previous.disconnect()
        else if (serverMode === 'server') await serverApi.connection().disconnect()
      }
      if (!currentAccess() || request !== requestRef.current) return
      if (provider === 'google') {
        if (accessRef.current) forgetCalendarConnection(accessRef.current)
        connectionRef.current = null
        setConnection(null)
        setCalendars([])
        setCalendarId('')
        setExpired(false)
      }
      if (accessRef.current) rememberCalendarProvider(accessRef.current, null)
      setProviderChosen(false)
      setSectionOpen(false)
      setAuthorizationBegin(null)
      setReview(null)
      setCompleted([])
      setPendingDates(null)
      setDownloaded(false)
    } catch { if (currentAccess()) setError('calendar.googleUnavailable') }
    finally {
      if (currentAccess() && request === requestRef.current) setBusy(false)
    }
  }

  function update(action: () => void) { action(); setError(null) }
  function chooseProvider(choice: CalendarProvider) {
    if (busy || !currentAccess()) return
    setProvider(choice)
    setProviderChosen(true)
    setSectionOpen(true)
    if (accessRef.current) rememberCalendarProvider(accessRef.current, choice)
    setError(null)
  }
  function schedule(): CalendarSchedule {
    const timing = allDay ? { kind: 'all-day' as const, timeZone } : { kind: 'timed' as const, timeZone, time, durationMinutes: duration }
    return mode === 'once' ? { mode, date, timing }
      : mode === 'dates' ? { mode, dates, timing }
        : { mode, startDate: date, frequency, interval: Number(interval), ...(until ? { untilDate: until } : {}), timing }
  }
  function prepare(event: FormEvent) {
    event.preventDefault()
    if (!currentAccess() || busy) return
    const candidate = schedule()
    if (candidate.mode === 'recurring' && !candidate.untilDate) { setError('calendar.selectRangeEnd'); return }
    const invalid: CalendarScheduleError | null = validateCalendarSchedule(candidate)
    if (invalid) { setError(invalid); return }
    if (provider === 'google' && (!connection || expired || !calendarId)) { setError('calendar.googleReconnect'); return }
    try {
      const plan: ReviewedReminder = { planId: crypto.randomUUID(), provider, calendarId, calendarName: calendars.find((calendar) => calendar.id === calendarId)?.summary ?? '', title: title.trim() || t('calendar.eventTitle'), schedule: candidate, events: createCalendarEventDrafts(candidate) }
      // Validate import constraints before showing a confirmation, without creating or downloading anything.
      if (provider !== 'google') createCalendarIcs(candidate, { planId: plan.planId, title: plan.title })
      setError(null)
      setCompleted([])
      setPendingDates(null)
      setDownloaded(false)
      setReview(plan)
    } catch (problem) { setError(errorKey(problem)) }
  }

  async function confirmGoogle() {
    if (!review || review.provider !== 'google' || busy || !currentAccess()) return
    if (!connection || expired) { setError('calendar.googleReconnect'); return }
    if (!calendars.some((calendar) => calendar.id === review.calendarId)) { setError('calendar.googlePermission'); return }
    const request = ++requestRef.current
    const controller = new AbortController()
    controllerRef.current = controller
    setBusy(true)
    setError(null)
    try {
      const result = await connection.insertPlan(review.calendarId, { planId: review.planId, title: review.title, drafts: pendingDates ? review.events.filter((draft) => pendingDates.includes(draft.date)) : review.events }, controller.signal)
      if (!currentAccess() || request !== requestRef.current) return
      setCompleted((previous) => [...new Map([...previous, ...result.completed].map((entry) => [entry.date, entry])).values()])
      setPendingDates(result.pendingDates)
      if (result.errorKey) {
        setError(result.errorKey)
        if (result.errorKey === 'calendar.googleReconnect' || result.errorKey === 'calendar.googlePermission') setExpired(true)
      }
    } catch (problem) {
      if (currentAccess() && request === requestRef.current) {
        const key = errorKey(problem)
        if (key === 'calendar.googleReconnect' || key === 'calendar.googlePermission') setExpired(true)
        setError(key)
      }
    } finally { if (currentAccess() && request === requestRef.current) setBusy(false) }
  }

  function download() {
    if (!review || review.provider === 'google' || !currentAccess()) return
    try {
      const contents = createCalendarIcs(review.schedule, { planId: review.planId, title: review.title })
      const url = URL.createObjectURL(new Blob([contents], { type: 'text/calendar;charset=utf-8' }))
      downloadUrlsRef.current.add(url)
      const link = document.createElement('a')
      link.href = url
      link.download = 'pro100practice-reminders.ics'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => { URL.revokeObjectURL(url); downloadUrlsRef.current.delete(url) }, 30_000)
      setDownloaded(true)
      setError(null)
    } catch (problem) { setError(errorKey(problem)) }
  }

  const locale = localeForLanguage(language)
  const reviewDates = review ? review.events.map((draft) => new Date(`${draft.date}T12:00:00Z`).toLocaleDateString(locale, { timeZone: 'UTC', dateStyle: 'medium' })) : []
  const finished = review?.provider === 'google' && pendingDates !== null && pendingDates.length === 0
  const formLocked = busy || review !== null
  const durationOptions = [5, 15, 30, 45, 60, 90, 120]

  return <section className="section" aria-labelledby={`${prefix}-heading`}>
    <h2 id={`${prefix}-heading`} className="section-title">{t('calendar.title')}</h2>
    {!providerChosen && <button type="button" disabled={busy} aria-expanded={sectionOpen} aria-controls={`${prefix}-content`} onClick={() => setSectionOpen((open) => !open)} className="btn btn-secondary mt-3">{t('calendar.setUpReminder')}</button>}
    {providerChosen && <div className="mt-3 flex items-center gap-2" role="group" aria-label={t('calendar.provider')}>
      <button type="button" aria-pressed="true" aria-expanded={sectionOpen} aria-controls={`${prefix}-content`} onClick={() => setSectionOpen((open) => !open)} className="min-h-11 rounded-full border border-emerald-400/60 bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-200 focus-visible:outline-2 focus-visible:outline-sky-300">{t(`calendar.${provider}Choice`)}</button>
      <button type="button" disabled={formLocked} onClick={() => void disconnect()} className="btn btn-ghost">{t('calendar.disconnect')}</button>
    </div>}
    {sectionOpen && <div id={`${prefix}-content`}>
      {!providerChosen && <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={t('calendar.provider')}>
        {(['google', 'apple', 'device'] as const).map((choice) => <button key={choice} type="button" disabled={busy} onClick={() => chooseProvider(choice)} className="chip">{t(`calendar.${choice}Choice`)}</button>)}
      </div>}
    {providerChosen && <form onSubmit={prepare} className="mt-4 space-y-4">
      <fieldset disabled={formLocked} className="space-y-4 disabled:opacity-60">
        {provider === 'google' && <div className="space-y-2">
          {serverMode === 'checking' && <p role="status" className="meta">{t('calendar.checkingConnection')}</p>}
          {serverMode === 'browser' && !clientId && <p className="meta">{t('calendar.googleConfiguration')}</p>}
          <div className="flex flex-wrap items-center gap-2">{(!connection || expired) && <button type="button" disabled={formLocked || !sdkReady || (serverMode === 'server' ? !authorizationBegin : serverMode !== 'browser' || !clientId)} onClick={() => void connect()} className="btn btn-secondary">{t(expired ? 'calendar.reconnect' : 'calendar.connect')}</button>}</div>
          {serverMode === 'unavailable' && <button type="button" disabled={formLocked} onClick={() => { setError(null); setConnectionCheck((value) => value + 1) }} className="btn btn-secondary">{t('Retry')}</button>}
          {serverMode === 'server' && (!connection || expired) && !authorizationBegin && error && error !== 'calendar.googleSdk' && <button type="button" disabled={formLocked} onClick={() => { setError(null); setBeginCheck((value) => value + 1) }} className="btn btn-secondary">{t('Retry')}</button>}
          {(!!clientId || serverMode === 'server') && !sdkReady && error === 'calendar.googleSdk' && <button type="button" disabled={formLocked} onClick={() => void retrySdk()} className="btn btn-secondary">{t('calendar.retryLoading')}</button>}
          {connection && !expired && <p role="status" className="meta">{t(connection.expiresAt === null ? 'calendar.googleAccountLinked' : 'calendar.googleSessionLinked')}</p>}
          {expired && <p role="status" className="meta">{t('calendar.googleReconnect')}</p>}
          {connection && calendars.length === 0 && <p className="meta">{t('calendar.noCalendars')}</p>}
          {connection && calendars.length > 0 && <label className="block"><span className="label">{t('calendar.destination')}</span><AppSelect disabled={formLocked} value={calendarId} onValueChange={(value) => update(() => setCalendarId(value))} options={calendars.map((calendar) => ({ value: calendar.id, label: calendar.summary }))} aria-label={t('calendar.destination')} className="field max-w-sm" /></label>}
          <p className="meta">{t('calendar.googleNotifications')}</p>
        </div>}
        {provider !== 'google' && <p className="meta">{t('calendar.manualImport')}</p>}
        <label className="block"><span className="label">{t('calendar.reminderName')}</span><input type="text" maxLength={200} value={title} placeholder={t('calendar.eventTitle')} onChange={(event) => update(() => setTitle(event.target.value))} className="field max-w-sm" /></label>
        <label className="block"><span className="label">{t('calendar.schedule')}</span><AppSelect disabled={formLocked} value={mode} onValueChange={(value) => update(() => setMode(value as CalendarSchedule['mode']))} options={[{ value: 'once', label: t('calendar.once') }, { value: 'recurring', label: t('calendar.recurring') }, { value: 'dates', label: t('calendar.severalDates') }]} aria-label={t('calendar.schedule')} className="field max-w-sm" /></label>
        <div><p className="label">{t(mode === 'dates' ? 'calendar.selectSeveral' : mode === 'recurring' ? 'calendar.dateRange' : 'calendar.date')}</p><CalendarDatePicker value={date} selected={dates} multiple={mode === 'dates'} range={mode === 'recurring' ? { start: date, end: until } : undefined} label={t(mode === 'dates' ? 'calendar.selectSeveral' : mode === 'recurring' ? 'calendar.dateRange' : 'calendar.date')} onChange={(next) => update(() => {
          if (mode === 'dates') setDates((current) => current.includes(next) ? current.filter((item) => item !== next) : [...current, next].sort())
          else if (mode === 'recurring') { const range = selectCalendarRange(rangeAnchor, next); setDate(range.startDate); setUntil(range.untilDate); setRangeAnchor(range.anchor) }
          else setDate(next)
        })} />{mode === 'dates' && <p className="meta mt-2" role="status">{t('calendar.selectedCount', { count: dates.length })}</p>}{mode === 'recurring' && <p className="meta mt-2" role="status">{rangeAnchor ? t('calendar.selectRangeEnd') : t('calendar.selectedRange', { start: date, end: until })}</p>}</div>
        {mode === 'recurring' && <div className="grid max-w-sm gap-3 sm:grid-cols-2">
          <label className="block"><span className="label">{t('calendar.frequency')}</span><AppSelect disabled={formLocked} value={frequency} onValueChange={(value) => update(() => setFrequency(value as CalendarFrequency))} options={(['daily', 'weekly', 'monthly'] as const).map((value) => ({ value, label: t(`calendar.${value}`) }))} aria-label={t('calendar.frequency')} className="field" /></label>
          <label className="block"><span className="label">{t('calendar.every')}</span><input type="number" min="1" max="99" step="1" value={interval} onChange={(event) => update(() => setInterval(event.target.value))} className="field" /></label>
        </div>}
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-slate-200"><input type="checkbox" checked={allDay} onChange={(event) => update(() => setAllDay(event.target.checked))} className="h-5 w-5" />{t('calendar.allDay')}</label>
        {!allDay && <div className="grid max-w-sm gap-3 sm:grid-cols-2"><label className="block"><span className="label">{t('calendar.time')}</span><input type="time" required value={time} onChange={(event) => update(() => setTime(event.target.value))} className="field" /></label><label className="block"><span className="label">{t('calendar.sessionLength')}</span><AppSelect disabled={formLocked} value={String(duration)} onValueChange={(value) => update(() => setDuration(Number(value)))} options={durationOptions.map((minutes) => ({ value: String(minutes), label: t('calendar.minutes', { minutes }) }))} aria-label={t('calendar.sessionLength')} className="field" /></label></div>}
        <p className="meta">{t('calendar.timezone', { timezone: timeZone })}</p>
        <p className="meta">{t(allDay ? 'calendar.allDayAlerts' : 'calendar.timedAlert')}</p>
        <button type="submit" className="btn btn-secondary">{t('calendar.review')}</button>
      </fieldset>
      {error && <p role="alert" className="msg-error">{t(error)}</p>}
      {review && <div className="max-w-lg space-y-3 rounded-xl border border-slate-600 bg-slate-950 p-4" aria-labelledby={`${prefix}-review`}>
        <h3 id={`${prefix}-review`} className="font-medium text-slate-100">{t('calendar.reviewHeading')}</h3>
        <p className="text-sm font-medium text-slate-200">{review.title}</p>
        <p className="text-sm text-slate-300">{review.provider === 'google' ? review.calendarName : t(review.provider === 'apple' ? 'calendar.apple' : 'calendar.device')}</p>
        <p className="text-sm text-slate-300">{reviewDates.join(' · ')}</p>
        {review.schedule.mode === 'recurring' && <p className="text-sm text-slate-300">{t(`calendar.${review.schedule.frequency}`)} · {t('calendar.everyValue', { interval: review.schedule.interval })}{review.schedule.untilDate ? ` · ${review.schedule.untilDate}` : ''}</p>}
        <p className="text-sm text-slate-300">{review.schedule.timing.kind === 'all-day' ? t('calendar.allDay') : `${review.schedule.timing.time} · ${t('calendar.minutes', { minutes: review.schedule.timing.durationMinutes })}`} · {review.schedule.timing.timeZone}</p>
        <p className="meta">{t(review.schedule.timing.kind === 'all-day' ? 'calendar.allDayAlerts' : 'calendar.timedAlert')}</p>
        {completed.length > 0 && <p role="status" className="text-sm text-emerald-300">{t('calendar.addedCount', { count: completed.length })}</p>}
        {pendingDates && pendingDates.length > 0 && <p role="status" className="meta">{t('calendar.pendingCount', { count: pendingDates.length })}</p>}
        {downloaded && <p role="status" className="text-sm text-emerald-300">{t('calendar.importReady')}</p>}
        {review.provider === 'google' && !finished && <>
          {(!connection || expired) && !sdkReady && <button type="button" disabled={busy} onClick={() => void retrySdk()} className="btn btn-secondary">{t('calendar.retryLoading')}</button>}
          {serverMode === 'server' && (!connection || expired) && sdkReady && !authorizationBegin && error && <button type="button" disabled={busy} onClick={() => { setError(null); setBeginCheck((value) => value + 1) }} className="btn btn-secondary">{t('Retry')}</button>}
          {(!connection || expired || error === 'calendar.googlePermission') && <button type="button" disabled={busy || !sdkReady || (serverMode === 'server' ? !authorizationBegin : !clientId)} onClick={() => void connect()} className="btn btn-secondary">{t('calendar.reconnect')}</button>}
          <button type="button" disabled={busy || expired || !connection} onClick={() => void confirmGoogle()} className="btn btn-primary">{t(busy ? 'Saving…' : pendingDates ? 'calendar.retryPending' : 'calendar.confirm')}</button>
        </>}
        {review.provider !== 'google' && <button type="button" onClick={download} className="btn btn-primary">{t(downloaded ? 'calendar.downloadAgain' : 'calendar.download')}</button>}
        <button type="button" disabled={busy} onClick={() => { setReview(null); setError(null); setCompleted([]); setPendingDates(null); setDownloaded(false) }} className="btn btn-ghost">{t(finished || downloaded ? 'Done' : completed.length > 0 ? 'calendar.keepCompleted' : 'calendar.back')}</button>
        {review.provider !== 'google' && <p className="meta">{t('calendar.manualImport')}</p>}
      </div>}
    </form>}
    </div>}
  </section>
}

