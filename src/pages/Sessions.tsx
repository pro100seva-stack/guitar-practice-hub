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

function formatTimerDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

export default function Sessions() {
  const [templates, setTemplates] = useState<BlockTemplate[]>([])
  const [planWeek, setPlanWeek] = useState<PlanWeek | null>(null)
  const [sessions, setSessions] = useState<SessionWithBlocks[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [totalMinutes, setTotalMinutes] = useState('45')
  const [comment, setComment] = useState('')
  const [selectedBlocks, setSelectedBlocks] = useState<SelectedBlock[]>([])
  const [timers, setTimers] = useState<Record<string, BlockTimerState>>({})
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

    const [planResult, templatesResult, sessionsResult] = await Promise.all([
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

    const currentWeek = planResult.data as PlanWeek | null
    const allTemplates = (templatesResult.data ?? []) as BlockTemplate[]

    const dedupedTemplates = allTemplates.filter((template, index, array) => {
      return index === array.findIndex((candidate) => candidate.key === template.key)
    })

    setPlanWeek(currentWeek)
    setTemplates(dedupedTemplates)
    setSelectedBlocks(
      dedupedTemplates.map((template) => ({
        id: template.id,
        key: template.key,
        label: template.label,
        done: false,
        actualMinutes: '',
        targetMinutes: template.target_minutes,
      }))
    )
    setTimers({})
    setSessions((sessionsResult.data as SessionWithBlocks[]) ?? [])
    setLoading(false)
  }

  function toggleBlock(templateId: string) {
    setSelectedBlocks((current) =>
      current.map((block) =>
        block.id === templateId ? { ...block, done: !block.done } : block
      )
    )
  }

  function updateBlockMinutes(templateId: string, value: string) {
    setSelectedBlocks((current) =>
      current.map((block) =>
        block.id === templateId ? { ...block, actualMinutes: value } : block
      )
    )
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
    setTimers((current) => ({
      ...current,
      [templateId]: {
        ...(current[templateId] ?? { isRunning: false, elapsedSeconds: 0 }),
        isRunning: !(current[templateId]?.isRunning ?? false),
      },
    }))
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

  function applyTimerAsActualMinutes(templateId: string) {
    const currentTimer = timers[templateId]
    if (!currentTimer) return

    const value = Math.max(1, Math.ceil(currentTimer.elapsedSeconds / 60)).toString()
    updateBlockMinutes(templateId, value)
    setSelectedBlocks((current) =>
      current.map((block) =>
        block.id === templateId ? { ...block, done: true, actualMinutes: value } : block
      )
    )
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
          total_minutes: Number(totalMinutes),
          comment: comment.trim() ? comment.trim() : null,
          week_id: planWeek?.id ?? null,
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

    const blocksToInsert = selectedBlocks
      .filter((block) => block.done)
      .map((block) => ({
        session_id: sessionData.id,
        block_key: block.key,
        label: block.label,
        done: true,
        target_minutes: block.targetMinutes,
        actual_minutes: block.actualMinutes ? Number(block.actualMinutes) : null,
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
    if (!block.done) return sum

    const value = Number(block.actualMinutes)
    if (!Number.isFinite(value) || value <= 0) return sum

    return sum + value
  }, 0)

  if (loading) {
    return <p className="text-sm text-slate-400">Loading…</p>
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Session {formatHeadingDate(date)}</h1>
            <p className="mt-1 text-sm text-slate-400">
              Use the current week plan as your practice guide for today.
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

        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/70 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Current week plan</p>
          <p className="mt-2 font-medium text-slate-200">
            {planWeek?.focus ?? 'No current week plan available.'}
          </p>
          <pre className="mt-2 whitespace-pre-wrap text-sm text-slate-400">
            {planWeek?.tasks ?? 'No plan details available yet.'}
          </pre>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="block text-slate-300">Date</span>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2"
                required
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="block text-slate-300">Total minutes</span>
              <input
                type="number"
                min="1"
                value={totalMinutes}
                onChange={(event) => setTotalMinutes(event.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2"
                required
              />
            </label>
          </div>

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

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-300">Practice blocks</p>
            <div className="flex flex-wrap gap-3">
              {templates.length === 0 && (
                <p className="text-sm text-slate-400">No blocks available for the current week phase.</p>
              )}

              {templates.map((template) => {
                const selected = selectedBlocks.find((block) => block.id === template.id)

                if (!selected) return null

                return (
                  <div key={template.id} className="min-w-[220px] flex-1 basis-[220px] rounded border border-slate-800 bg-slate-900/70 p-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selected.done}
                        onChange={() => toggleBlock(template.id)}
                      />
                      <span className="font-medium text-slate-200">{template.label}</span>
                    </label>

                    <div className="mt-3 rounded border border-dashed border-slate-700 bg-slate-950/60 p-2 text-center text-xs text-slate-500">
                      <div className="font-mono text-lg text-slate-200">
                        {formatTimerDuration(timers[template.id]?.elapsedSeconds ?? 0)}
                      </div>
                      <div className="mt-2 flex flex-wrap justify-center gap-2">
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
                      {(timers[template.id]?.elapsedSeconds ?? 0) > 0 && (
                        <button
                          type="button"
                          onClick={() => applyTimerAsActualMinutes(template.id)}
                          className="mt-2 text-[11px] font-medium text-cyan-400"
                        >
                          Use as actual minutes
                        </button>
                      )}
                    </div>

                    {selected.done && (
                      <div className="mt-2">
                        <label className="text-xs text-slate-400">
                          Actual minutes
                          <input
                            type="number"
                            min="0"
                            value={selected.actualMinutes}
                            onChange={(event) => updateBlockMinutes(template.id, event.target.value)}
                            className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm"
                            placeholder="Optional"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

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
        <h2 className="text-lg font-semibold">Recent sessions</h2>
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
      </section>
    </div>
  )
}