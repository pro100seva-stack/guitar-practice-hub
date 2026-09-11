import { useEffect, useRef, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/database.types'

type BlockTemplate = Database['public']['Tables']['block_templates']['Row']
type PlanWeek = Database['public']['Tables']['plan_weeks']['Row']
type SessionBlock = Database['public']['Tables']['session_blocks']['Row']
type SessionWithBlocks = Database['public']['Tables']['sessions']['Row'] & {
  session_blocks: SessionBlock[]
}

type SelectedBlock = {
  id: string
  key: string
  label: string
  done: boolean
  actualMinutes: string
  targetMinutes: number | null
}

type BlockTimerState = {
  isRunning: boolean
  elapsedSeconds: number
}

function formatHeadingDate(value: string) {
  const date = new Date(`${value}T00:00:00`)
  return new Intl.DateTimeFormat('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  }).format(date)
}

function getSessionEditorState(date: string, templates: BlockTemplate[], sessions: SessionWithBlocks[]) {
  const savedSession = sessions.find((session) => session.session_date === date)
  const savedBlocks = new Map(savedSession?.session_blocks.map((block) => [block.block_key, block]) ?? [])
  const sessionTemplates = savedSession
    ? templates.filter((template) => savedBlocks.has(template.key))
    : templates

  return {
    totalMinutes: savedSession ? String(savedSession.total_minutes) : '45',
    comment: savedSession?.comment ?? '',
    selectedBlocks: sessionTemplates.map((template) => {
      const savedBlock = savedBlocks.get(template.key)
      return {
        id: template.id,
        key: template.key,
        label: template.label,
        done: savedBlock?.done ?? false,
        actualMinutes: savedBlock?.actual_minutes != null ? String(savedBlock.actual_minutes) : '',
        targetMinutes: template.target_minutes,
      }
    }),
  }
}

export default function Sessions() {
  const [templates, setTemplates] = useState<BlockTemplate[]>([])
  const [planWeek, setPlanWeek] = useState<PlanWeek | null>(null)
  const [weeks, setWeeks] = useState<PlanWeek[]>([])
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0)
  const [sessions, setSessions] = useState<SessionWithBlocks[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [totalMinutes, setTotalMinutes] = useState('45')
  const [comment, setComment] = useState('')
  const [selectedBlocks, setSelectedBlocks] = useState<SelectedBlock[]>([])
  const [blockToAddId, setBlockToAddId] = useState('')
  const [timers, setTimers] = useState<Record<string, BlockTimerState>>({})
  const [isRecentSessionsOpen, setIsRecentSessionsOpen] = useState(false)
  const [isMetronomePlaying, setIsMetronomePlaying] = useState(false)
  const [bpmInput, setBpmInput] = useState('100')
  const [bpm, setBpm] = useState(100)
  const [beatsPerMeasure, setBeatsPerMeasure] = useState(4)
  const [timeSignatureMode, setTimeSignatureMode] = useState<'3/4' | '4/4' | '5/4' | 'custom'>('4/4')
  const [customBeatCount, setCustomBeatCount] = useState('4')
  const [customMeasureCount, setCustomMeasureCount] = useState('4')
  const audioContextRef = useRef<AudioContext | null>(null)
  const schedulerIntervalRef = useRef<number | null>(null)
  const beatCounterRef = useRef(0)
  const lastTapTimeRef = useRef<number | null>(null)
  const bpmRef = useRef(bpm)
  const beatsPerMeasureRef = useRef(beatsPerMeasure)
  const lookaheadRef = useRef(0.12)
  const nextNoteTimeRef = useRef(0)

  useEffect(() => {
    void loadData()
    void loadAppSettings()
  }, [])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTimers((current) => {
        const nextEntries = Object.entries(current).map(([id, timer]) => {
          if (!timer.isRunning) {
            return [id, timer]
          }

          return [id, { ...timer, elapsedSeconds: timer.elapsedSeconds + 1 }]
        })

        return Object.fromEntries(nextEntries)
      })
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    bpmRef.current = bpm
  }, [bpm])

  useEffect(() => {
    beatsPerMeasureRef.current = beatsPerMeasure
  }, [beatsPerMeasure])

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void (async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return
        await supabase
          .from('app_settings')
          .upsert(
            {
              user_id: user.id,
              metronome_bpm: bpm,
              metronome_beats: beatsPerMeasure,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          )
      })()
    }, 500)
    return () => window.clearTimeout(timerId)
  }, [bpm, beatsPerMeasure])

  useEffect(() => {
    return () => {
      if (schedulerIntervalRef.current !== null) {
        window.clearInterval(schedulerIntervalRef.current)
        schedulerIntervalRef.current = null
      }
    }
  }, [])

  async function loadAppSettings() {
    const { data, error } = await supabase.from('app_settings').select('*').maybeSingle()
    if (error || !data) return

    if (data.metronome_bpm != null) {
      const nextBpm = clampBpm(data.metronome_bpm)
      setBpm(nextBpm)
      setBpmInput(String(nextBpm))
    }
    if (data.metronome_beats != null) {
      setBeatsPerMeasure(data.metronome_beats)
    }
  }

  async function loadData() {
    setLoading(true)
    setError(null)

    const today = new Date().toISOString().slice(0, 10)

    const [weeksResult, planResult, templatesResult, sessionsResult] = await Promise.all([
      supabase
        .from('plan_weeks')
        .select('*')
        .order('start_date', { ascending: true }),
      supabase
        .from('plan_weeks')
        .select('*')
        .lte('start_date', today)
        .gte('end_date', today)
        .maybeSingle(),
      supabase
        .from('block_templates')
        .select('*')
        .order('sort_order', { ascending: true }),
      supabase
        .from('sessions')
        .select('*, session_blocks(*)')
        .order('session_date', { ascending: false })
        .limit(5),
    ])

    if (weeksResult.error) {
      setError(weeksResult.error.message)
      setLoading(false)
      return
    }

    if (planResult.error) {
      setError(planResult.error.message)
      setLoading(false)
      return
    }

    if (templatesResult.error) {
      setError(templatesResult.error.message)
      setLoading(false)
      return
    }

    if (sessionsResult.error) {
      setError(sessionsResult.error.message)
      setLoading(false)
      return
    }

    const allWeeks = (weeksResult.data ?? []) as PlanWeek[]
    const currentWeek = (planResult.data as PlanWeek | null) ?? allWeeks.find((entry) => entry.start_date <= today && entry.end_date >= today) ?? allWeeks[0] ?? null
    const currentWeekIndex = currentWeek ? allWeeks.findIndex((item) => item.id === currentWeek.id) : 0
    const allTemplates = (templatesResult.data ?? []) as BlockTemplate[]

    const dedupedTemplates = allTemplates.filter((template, index, array) => {
      return index === array.findIndex((candidate) => candidate.key === template.key)
    })

    const defaultDate = getDefaultDateForWeek(currentWeek ?? allWeeks[0] ?? null)
    const loadedSessions = (sessionsResult.data as SessionWithBlocks[]) ?? []
    const editorState = getSessionEditorState(defaultDate, dedupedTemplates, loadedSessions)

    setWeeks(allWeeks)
    setPlanWeek(currentWeek)
    setSelectedWeekIndex(currentWeekIndex >= 0 ? currentWeekIndex : 0)
    setDate(defaultDate)
    setTemplates(dedupedTemplates)
    setTotalMinutes(editorState.totalMinutes)
    setComment(editorState.comment)
    setSelectedBlocks(editorState.selectedBlocks)
    setBlockToAddId('')
    setTimers({})
    setSessions(loadedSessions)
    setLoading(false)
  }

  function getWeekDates(week: PlanWeek | null) {
    if (!week) return []

    const start = new Date(`${week.start_date}T00:00:00`)
    const end = new Date(`${week.end_date}T00:00:00`)
    const result: string[] = []
    const cursor = new Date(start)

    while (cursor <= end) {
      result.push(cursor.toISOString().slice(0, 10))
      cursor.setDate(cursor.getDate() + 1)
    }

    return result
  }

  function isTodayDate(value: string) {
    return value === new Date().toISOString().slice(0, 10)
  }

  function getDefaultDateForWeek(week: PlanWeek | null) {
    if (!week) return new Date().toISOString().slice(0, 10)

    const weekDates = getWeekDates(week)
    return weekDates.find((value) => isTodayDate(value)) ?? week.start_date
  }

  function handleSelectWeek(week: PlanWeek) {
    setPlanWeek(week)
    setDate(getDefaultDateForWeek(week))
    setSelectedWeekIndex(weeks.findIndex((item) => item.id === week.id))
  }

  function handleSelectDay(nextDate: string) {
    setDate(nextDate)
    const editorState = getSessionEditorState(nextDate, templates, sessions)
    setTotalMinutes(editorState.totalMinutes)
    setComment(editorState.comment)
    setSelectedBlocks(editorState.selectedBlocks)
    setBlockToAddId('')
    setTimers({})
  }

  function toggleBlock(templateId: string) {
    setSelectedBlocks((current) =>
      current.map((block) =>
        block.id === templateId ? { ...block, done: !block.done } : block
      )
    )
  }

  function addBlock() {
    const template = templates.find((item) => item.id === blockToAddId)
    if (!template || selectedBlocks.some((block) => block.id === template.id)) return

    setSelectedBlocks((current) => [
      ...current,
      {
        id: template.id,
        key: template.key,
        label: template.label,
        done: false,
        actualMinutes: '',
        targetMinutes: template.target_minutes,
      },
    ])
    setBlockToAddId('')
  }

  function removeBlock(templateId: string) {
    setSelectedBlocks((current) => current.filter((block) => block.id !== templateId))
    setTimers((current) => {
      const next = { ...current }
      delete next[templateId]
      return next
    })
  }

  function clampBpm(value: number) {
    return Math.max(40, Math.min(220, Number.isFinite(value) ? value : 100))
  }

  async function ensureAudioContext() {
    if (!audioContextRef.current) {
      audioContextRef.current = new window.AudioContext()
    }

    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume()
    }

    return audioContextRef.current
  }

  function stopMetronome() {
    if (schedulerIntervalRef.current !== null) {
      window.clearInterval(schedulerIntervalRef.current)
      schedulerIntervalRef.current = null
    }
  }

  async function toggleMetronome() {
    if (isMetronomePlaying) {
      stopMetronome()
      setIsMetronomePlaying(false)
      return
    }

    beatCounterRef.current = 0
    setIsMetronomePlaying(true)
  }

  function scheduleMetronomeClick(time: number) {
    const context = audioContextRef.current
    if (!context) return

    const accent = beatCounterRef.current % beatsPerMeasureRef.current === 0
    const oscillator = context.createOscillator()
    const gainNode = context.createGain()
    const frequency = accent ? 880 : 620
    const volume = accent ? 0.18 : 0.1

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(frequency, time)
    gainNode.gain.setValueAtTime(0.0001, time)
    gainNode.gain.exponentialRampToValueAtTime(volume, time + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.16)

    oscillator.connect(gainNode)
    gainNode.connect(context.destination)
    oscillator.start(time)
    oscillator.stop(time + 0.18)

    beatCounterRef.current += 1
  }

  useEffect(() => {
    if (!isMetronomePlaying) {
      if (schedulerIntervalRef.current !== null) {
        window.clearInterval(schedulerIntervalRef.current)
        schedulerIntervalRef.current = null
      }
      return
    }

    let cancelled = false
    const startScheduler = async () => {
      const context = await ensureAudioContext()
      if (cancelled) return
      beatCounterRef.current = 0
      nextNoteTimeRef.current = context.currentTime + 0.05
      schedulerIntervalRef.current = window.setInterval(() => {
        const activeContext = audioContextRef.current
        if (!activeContext) return
        while (nextNoteTimeRef.current < activeContext.currentTime + lookaheadRef.current) {
          scheduleMetronomeClick(nextNoteTimeRef.current)
          nextNoteTimeRef.current += 60 / clampBpm(bpmRef.current)
        }
      }, 25)
    }
    void startScheduler()

    return () => {
      cancelled = true
      if (schedulerIntervalRef.current !== null) {
        window.clearInterval(schedulerIntervalRef.current)
        schedulerIntervalRef.current = null
      }
    }
  }, [isMetronomePlaying])

  function handleTapTempo() {
    const now = Date.now()
    if (lastTapTimeRef.current) {
      const interval = now - lastTapTimeRef.current
      if (interval > 0) {
        const nextBpm = Math.round(60000 / interval)
        const clamped = clampBpm(nextBpm)
        setBpm(clamped)
        setBpmInput(String(clamped))
      }
    }
    lastTapTimeRef.current = now
  }

  function handleBpmChange(value: string) {
    setBpmInput(value)

    if (value === '') return

    const parsedValue = Number(value)
    if (Number.isFinite(parsedValue)) {
      setBpm(clampBpm(parsedValue))
    }
  }

  function handleBpmBlur() {
    const parsedValue = Number(bpmInput)
    if (!Number.isFinite(parsedValue) || bpmInput.trim() === '') {
      const nextValue = clampBpm(bpm)
      setBpm(nextValue)
      setBpmInput(String(nextValue))
      return
    }

    const nextValue = clampBpm(parsedValue)
    setBpm(nextValue)
    setBpmInput(String(nextValue))
  }

  function handleTimeSignatureChange(nextMode: '3/4' | '4/4' | '5/4' | 'custom') {
    setTimeSignatureMode(nextMode)

    if (nextMode === 'custom') {
      const parsedBeatValue = Number(customBeatCount)
      const normalizedBeatValue = Number.isFinite(parsedBeatValue) ? Math.max(2, Math.min(12, Math.round(parsedBeatValue))) : 4
      const parsedMeasureValue = Number(customMeasureCount)
      const normalizedMeasureValue = Number.isFinite(parsedMeasureValue) ? Math.max(2, Math.min(12, Math.round(parsedMeasureValue))) : 4
      setBeatsPerMeasure(normalizedBeatValue)
      setCustomBeatCount(String(normalizedBeatValue))
      setCustomMeasureCount(String(normalizedMeasureValue))
      return
    }

    const mappedValue = nextMode === '3/4' ? 3 : nextMode === '4/4' ? 4 : 5
    setBeatsPerMeasure(mappedValue)
    setCustomBeatCount(String(mappedValue))
    setCustomMeasureCount('4')
  }

  function handleCustomBeatChange(value: string) {
    setCustomBeatCount(value)

    if (value === '') return

    const parsedValue = Number(value)
    if (Number.isFinite(parsedValue)) {
      const normalizedValue = Math.max(2, Math.min(12, Math.round(parsedValue)))
      setBeatsPerMeasure(normalizedValue)
      setCustomBeatCount(String(normalizedValue))
    }
  }

  function handleCustomMeasureChange(value: string) {
    setCustomMeasureCount(value)

    if (value === '') return

    const parsedValue = Number(value)
    if (Number.isFinite(parsedValue)) {
      const normalizedValue = Math.max(2, Math.min(12, Math.round(parsedValue)))
      setCustomMeasureCount(String(normalizedValue))
    }
  }

  function toggleTimer(templateId: string) {
    setTimers((current) => {
      const isTargetRunning = current[templateId]?.isRunning ?? false

      const pausedTimers = Object.fromEntries(
        Object.entries(current).map(([id, timer]) => [
          id,
          {
            ...timer,
            isRunning: false,
          },
        ])
      )

      return {
        ...pausedTimers,
        [templateId]: {
          ...(current[templateId] ?? { isRunning: false, elapsedSeconds: 0 }),
          isRunning: !isTargetRunning,
        },
      }
    })
  }

  function resetTimer(templateId: string) {
    setTimers((current) => ({
      ...current,
      [templateId]: {
        isRunning: false,
        elapsedSeconds: 0,
      },
    }))
  }

  function updateTimerPart(templateId: string, part: 'minutes' | 'seconds', value: string) {
    const parsedValue = Number(value)
    if (!Number.isFinite(parsedValue) || parsedValue < 0) return

    const normalizedValue = part === 'seconds' ? Math.min(59, Math.floor(parsedValue)) : Math.floor(parsedValue)

    setTimers((current) => ({
      ...current,
      [templateId]: {
        ...(current[templateId] ?? { isRunning: false, elapsedSeconds: 0 }),
        elapsedSeconds: part === 'minutes'
          ? normalizedValue * 60 + ((current[templateId]?.elapsedSeconds ?? 0) % 60)
          : Math.floor((current[templateId]?.elapsedSeconds ?? 0) / 60) * 60 + normalizedValue,
      },
    }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setMessage(null)
    setError(null)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setError('Not signed in.')
      setSaving(false)
      return
    }

    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .upsert(
        {
          user_id: user.id,
          session_date: date,
          total_minutes: totalBlockMinutes || Number(totalMinutes),
          comment: comment.trim() ? comment.trim() : null,
          week_id: planWeek?.id ?? null,
          source: 'app',
        },
        { onConflict: 'user_id,session_date' }
      )
      .select()
      .single()

    if (sessionError || !sessionData) {
      setError(sessionError?.message ?? 'Could not save the session.')
      setSaving(false)
      return
    }

    const blocksToInsert = selectedBlocks.map((block) => ({
        session_id: sessionData.id,
        block_key: block.key,
        label: block.label,
        done: block.done,
        target_minutes: block.targetMinutes,
        actual_minutes: timers[block.id]?.elapsedSeconds
          ? Math.max(1, Math.ceil(timers[block.id].elapsedSeconds / 60))
          : block.actualMinutes ? Number(block.actualMinutes) : null,
      }))

    const { error: blocksDeleteError } = await supabase
      .from('session_blocks')
      .delete()
      .eq('session_id', sessionData.id)

    if (blocksDeleteError) {
      setError(blocksDeleteError.message)
      setSaving(false)
      return
    }

    if (blocksToInsert.length > 0) {
      const { error: blocksError } = await supabase.from('session_blocks').insert(blocksToInsert)

      if (blocksError) {
        setError(blocksError.message)
        setSaving(false)
        return
      }
    }

    setDate(new Date().toISOString().slice(0, 10))
    setTotalMinutes('45')
    setComment('')
    setSelectedBlocks(
      templates.map((template) => ({
        id: template.id,
        key: template.key,
        label: template.label,
        done: false,
        actualMinutes: '',
        targetMinutes: template.target_minutes,
      }))
    )
    await loadData()
    setMessage('Session saved successfully.')
    setSaving(false)
  }

  const totalBlockMinutes = selectedBlocks.reduce((sum, block) => {
    const elapsedSeconds = timers[block.id]?.elapsedSeconds ?? 0
    if (elapsedSeconds > 0) {
      const minutes = Math.floor(elapsedSeconds / 60) + (elapsedSeconds % 60 >= 30 ? 1 : 0)
      return sum + minutes
    }

    if (!block.done) return sum

    const value = Number(block.actualMinutes)
    return Number.isFinite(value) && value > 0 ? sum + value : sum
  }, 0)

  const selectedWeekDates = getWeekDates(planWeek ?? weeks[selectedWeekIndex] ?? null)
  const visibleWeeks = weeks.slice(Math.max(0, selectedWeekIndex - 2), Math.min(weeks.length, selectedWeekIndex + 3))

  if (loading) {
    return <p className="text-sm text-slate-400">Loading…</p>
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Session {formatHeadingDate(date)}</h1>
            <p className="mt-1 text-sm text-slate-400">
              Practice week navigator for the current cycle.
            </p>
          </div>

          <div className="flex flex-wrap items-stretch gap-3 lg:justify-end">
            <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 lg:min-w-[260px]">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Metronome</p>
                  <p className="text-sm text-slate-300">{isMetronomePlaying ? 'Playing' : 'Standby'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { void toggleMetronome() }}
                  className="rounded bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-900"
                >
                  {isMetronomePlaying ? 'Stop' : 'Start'}
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-end gap-2">
                <label className="text-xs text-slate-400">
                  BPM
                  <input
                    type="number"
                    min="40"
                    max="220"
                    value={bpmInput}
                    onChange={(event) => handleBpmChange(event.target.value)}
                    onBlur={handleBpmBlur}
                    className="mt-1 w-20 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-200"
                  />
                </label>

                <label className="text-xs text-slate-400">
                  Time
                  <select
                    value={timeSignatureMode}
                    onChange={(event) => handleTimeSignatureChange(event.target.value as '3/4' | '4/4' | '5/4' | 'custom')}
                    className="mt-1 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-200"
                  >
                    <option value="3/4">3/4</option>
                    <option value="4/4">4/4</option>
                    <option value="5/4">5/4</option>
                    <option value="custom">Custom</option>
                  </select>
                </label>

                {timeSignatureMode === 'custom' && (
                  <div className="flex items-end gap-2">
                    <label className="text-xs text-slate-400">
                      Beat
                      <input
                        type="number"
                        min="2"
                        max="12"
                        value={customBeatCount}
                        onChange={(event) => handleCustomBeatChange(event.target.value)}
                        className="mt-1 w-14 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-200"
                      />
                    </label>

                    <label className="text-xs text-slate-400">
                      Measure
                      <input
                        type="number"
                        min="2"
                        max="12"
                        value={customMeasureCount}
                        onChange={(event) => handleCustomMeasureChange(event.target.value)}
                        className="mt-1 w-14 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-200"
                      />
                    </label>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleTapTempo}
                  className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300"
                >
                  Tap
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 lg:min-w-[240px]">
              <p className="text-xs uppercase tracking-wide text-slate-400">Practice time</p>
              <p className="mt-1 text-2xl font-semibold text-slate-100">{totalBlockMinutes} min</p>
              <p className="text-sm text-slate-400">Total across selected blocks</p>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/80 p-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Practice weeks</p>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-300">
              <span>Jump to</span>
              <select
                value={planWeek?.id ?? ''}
                onChange={(event) => {
                  const targetWeek = weeks.find((weekItem) => weekItem.id === event.target.value)
                  if (targetWeek) {
                    handleSelectWeek(targetWeek)
                  }
                }}
                className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-slate-200 focus:border-slate-500"
              >
                {weeks.map((weekItem) => (
                  <option key={weekItem.id} value={weekItem.id}>
                    Week {weekItem.week_number} · {weekItem.start_date}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-3 flex flex-wrap gap-3">
            {visibleWeeks.map((weekItem) => {
              const isCurrentWeek = weekItem.start_date <= new Date().toISOString().slice(0, 10) && weekItem.end_date >= new Date().toISOString().slice(0, 10)
              const isSelected = weekItem.id === (planWeek?.id ?? weeks[selectedWeekIndex]?.id)

              return (
                <button
                  key={weekItem.id}
                  type="button"
                  onClick={() => handleSelectWeek(weekItem)}
                  className={`min-w-[150px] flex-1 rounded-lg border p-3 text-left transition ${
                    isSelected
                      ? 'border-sky-500 bg-sky-500/10 text-sky-100'
                      : 'border-slate-700 bg-slate-950/80 text-slate-200 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Week {weekItem.week_number}</p>
                    {isCurrentWeek && (
                      <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.18em] text-emerald-300">
                        Today
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-lg font-semibold">{weekItem.focus || 'Plan focus'}</p>
                  <p className="mt-1 text-xs text-slate-400">{weekItem.start_date} – {weekItem.end_date}</p>
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/80 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Selected week</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-100">{planWeek?.focus ?? 'No week selected'}</h2>
            </div>

            {planWeek && planWeek.start_date <= new Date().toISOString().slice(0, 10) && planWeek.end_date >= new Date().toISOString().slice(0, 10) && (
              <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.18em] text-sky-300">
                Current week
              </span>
            )}
          </div>

          <div className="mt-3 grid gap-2 text-sm text-slate-300 md:grid-cols-2">
            <div className="rounded border border-slate-800 bg-slate-950/70 p-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Phase</p>
              <p className="mt-1">{planWeek?.phase ?? '—'}</p>
            </div>
            <div className="rounded border border-slate-800 bg-slate-950/70 p-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Dates</p>
              <p className="mt-1">{planWeek ? `${planWeek.start_date} – ${planWeek.end_date}` : '—'}</p>
            </div>
          </div>

          <div className="mt-3 rounded border border-slate-800 bg-slate-950/70 p-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Week description</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">
              {planWeek?.tasks?.trim() || 'No description recorded for this week yet.'}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/80 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Days in selected week</p>
            {selectedWeekDates.some((day) => isTodayDate(day)) && (
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.18em] text-emerald-300">
                Today
              </span>
            )}
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-7">
            {selectedWeekDates.map((day) => {
              const isSelectedDay = day === date
              const isToday = isTodayDate(day)

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`rounded-lg border px-2 py-3 text-center transition ${
                    isSelectedDay
                      ? 'border-sky-500 bg-sky-500/10 text-sky-100'
                      : isToday
                        ? 'border-emerald-500/50 bg-emerald-500/5 text-emerald-100'
                        : 'border-slate-700 bg-slate-950/70 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                      {new Date(`${day}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' })}
                    </p>
                    {isToday && (
                      <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[8px] uppercase tracking-[0.12em] text-emerald-200">
                        Today
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-medium">{new Date(`${day}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/80 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Selected day</p>
              <h3 className="mt-1 text-lg font-semibold text-slate-100">{formatHeadingDate(date)}</h3>
            </div>
            {isTodayDate(date) && (
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.18em] text-emerald-300">
                Today
              </span>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-2 rounded border border-slate-800 bg-slate-950/60 p-3 sm:flex-row sm:items-end">
            <label className="flex-1 text-xs text-slate-400">
              Add practice block
              <select
                value={blockToAddId}
                onChange={(event) => setBlockToAddId(event.target.value)}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-200"
              >
                <option value="">Choose a block</option>
                {templates
                  .filter((template) => !selectedBlocks.some((block) => block.id === template.id))
                  .map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.label}
                    </option>
                  ))}
              </select>
            </label>
            <button
              type="button"
              onClick={addBlock}
              disabled={!blockToAddId}
              className="rounded bg-slate-100 px-3 py-2 text-sm font-medium text-slate-900 disabled:opacity-50"
            >
              Add block
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {selectedBlocks.length === 0 && (
              <p className="text-sm text-slate-400">No practice blocks selected for this day.</p>
            )}

            {templates.map((template) => {
              const selected = selectedBlocks.find((block) => block.id === template.id)

              if (!selected) return null

              const elapsedSeconds = timers[template.id]?.elapsedSeconds ?? 0
              const timerMinutes = Math.floor(elapsedSeconds / 60)
              const timerSeconds = elapsedSeconds % 60

              return (
                <div key={template.id} className="flex flex-col gap-3 rounded border border-slate-800 bg-slate-950/60 p-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selected.done}
                        onChange={() => toggleBlock(template.id)}
                        className="h-4 w-4 rounded border-slate-700 bg-slate-950"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-100">{template.label}</p>
                        <p className="text-xs text-slate-400">Target: {template.target_minutes ?? 0} min</p>
                      </div>
                    </div>

                    <p className="mt-2 text-sm text-slate-300">
                      {template.description?.trim() || 'No description available for this practice block.'}
                    </p>
                  </div>

                  <div className="flex flex-col items-start gap-2 md:items-end">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleTimer(template.id)}
                        className="rounded bg-slate-800 px-2 py-1 text-xs font-medium text-slate-200"
                      >
                        {timers[template.id]?.isRunning ? 'Pause' : 'Start'}
                      </button>
                      <button
                        type="button"
                        onClick={() => resetTimer(template.id)}
                        className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300"
                      >
                        Reset
                      </button>
                    </div>

                    <fieldset className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                      <legend>Timer</legend>
                      <input
                        type="number"
                        min="0"
                        inputMode="numeric"
                        aria-label={`${template.label} timer minutes`}
                        value={timerMinutes}
                        onChange={(event) => updateTimerPart(template.id, 'minutes', event.target.value)}
                        className="w-16 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm font-mono text-slate-200"
                      />
                      <span className="font-mono text-sm text-slate-300">:</span>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        inputMode="numeric"
                        aria-label={`${template.label} timer seconds`}
                        value={timerSeconds.toString().padStart(2, '0')}
                        onChange={(event) => updateTimerPart(template.id, 'seconds', event.target.value)}
                        className="w-16 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm font-mono text-slate-200"
                      />
                    </fieldset>

                    <button
                      type="button"
                      onClick={() => removeBlock(template.id)}
                      className="text-[11px] font-medium text-rose-300"
                    >
                      Remove block
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="block space-y-1 text-sm">
            <span className="block text-slate-300">Notes</span>
            <textarea
              rows={3}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2"
              placeholder="What did you work on?"
            />
          </label>

          

          {message && <p className="text-sm text-emerald-400">{message}</p>}
          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="rounded bg-slate-100 px-3 py-2 font-medium text-slate-900 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save session'}
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
        <button
          type="button"
          onClick={() => setIsRecentSessionsOpen((current) => !current)}
          aria-expanded={isRecentSessionsOpen}
          className="flex w-full items-center justify-between gap-2 text-left"
        >
          <h2 className="text-lg font-semibold">Recent sessions</h2>
          <span className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300">
            {isRecentSessionsOpen ? 'Hide' : 'Show'}
          </span>
        </button>

        {isRecentSessionsOpen && (
          <div className="mt-3 space-y-3">
            {sessions.length === 0 && <p className="text-sm text-slate-400">No sessions yet.</p>}

            {sessions.map((session) => (
              <div key={session.id} className="rounded border border-slate-800 bg-slate-900/70 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-200">{session.session_date}</p>
                    <p className="text-sm text-slate-400">{session.total_minutes} min</p>
                  </div>
                  <span className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-300">
                    {session.source === 'notion_import' ? 'Imported' : 'App'}
                  </span>
                </div>

                {session.comment && <p className="mt-2 text-sm text-slate-300">{session.comment}</p>}

                {session.session_blocks.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {session.session_blocks.map((block) => (
                      <span key={block.id} className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-400">
                        {block.label} {block.done ? '✓' : '—'}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}