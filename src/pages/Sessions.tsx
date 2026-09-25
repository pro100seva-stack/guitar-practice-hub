import { useEffect, useRef, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { deleteLocalMaterial, estimateLocalStorage, listLocalMaterials, saveLocalMaterial, type LocalMaterial, type LocalStorageEstimate } from '../lib/localMaterials'
import type { Database } from '../lib/database.types'
import { formatDate, formatDateRange, localeForLanguage } from '../lib/dateFormat'
import { useI18n } from '../lib/i18n'
import { getDefaultMaterials } from '../lib/defaultMaterials'

type BlockTemplate = Database['public']['Tables']['block_templates']['Row']
type PlanWeek = Database['public']['Tables']['plan_weeks']['Row']
type Program = Database['public']['Tables']['programs']['Row']
type Todo = Database['public']['Tables']['todos']['Row']
type ScheduledPlanWeek = PlanWeek & {
  end_date: string
  start_date: string
  week_number: number
}
type SessionBlock = Database['public']['Tables']['session_blocks']['Row']
type SessionWithBlocks = Database['public']['Tables']['sessions']['Row'] & {
  session_blocks: SessionBlock[]
}

function isScheduledWeek(week: PlanWeek): week is ScheduledPlanWeek {
  return week.week_number !== null && week.start_date !== null && week.end_date !== null
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

type TuningKey = 'standard' | 'drop-d' | 'dadgad' | 'half-step-down'

const tuningPresets: Record<TuningKey, { label: string; notes: Array<{ stringName: string; frequency: number }> }> = {
  standard: {
    label: 'Standard · E A D G B E',
    notes: [
      { stringName: 'Low E', frequency: 82.41 },
      { stringName: 'A', frequency: 110 },
      { stringName: 'D', frequency: 146.83 },
      { stringName: 'G', frequency: 196 },
      { stringName: 'B', frequency: 246.94 },
      { stringName: 'High E', frequency: 329.63 },
    ],
  },
  'drop-d': {
    label: 'Drop D · D A D G B E',
    notes: [
      { stringName: 'Low D', frequency: 73.42 },
      { stringName: 'A', frequency: 110 },
      { stringName: 'D', frequency: 146.83 },
      { stringName: 'G', frequency: 196 },
      { stringName: 'B', frequency: 246.94 },
      { stringName: 'High E', frequency: 329.63 },
    ],
  },
  dadgad: {
    label: 'DADGAD · D A D G A D',
    notes: [
      { stringName: 'Low D', frequency: 73.42 },
      { stringName: 'A', frequency: 110 },
      { stringName: 'D', frequency: 146.83 },
      { stringName: 'G', frequency: 196 },
      { stringName: 'A', frequency: 220 },
      { stringName: 'High D', frequency: 293.66 },
    ],
  },
  'half-step-down': {
    label: 'Half-step down · Eb Ab Db Gb Bb Eb',
    notes: [
      { stringName: 'Low Eb', frequency: 77.78 },
      { stringName: 'Ab', frequency: 103.83 },
      { stringName: 'Db', frequency: 138.59 },
      { stringName: 'Gb', frequency: 185 },
      { stringName: 'Bb', frequency: 233.08 },
      { stringName: 'High Eb', frequency: 311.13 },
    ],
  },
}

function formatHeadingDate(value: string, language: Parameters<typeof localeForLanguage>[0]) {
  return formatDate(value, language)
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getSessionEditorState(date: string, templates: BlockTemplate[], sessions: SessionWithBlocks[]) {
  const savedSession = sessions.find((session) => session.session_date === date)
  const savedBlocks = new Map(savedSession?.session_blocks.map((block) => [block.block_key, block]) ?? [])
  const isPastDate = date < new Date().toISOString().slice(0, 10)
  const sessionTemplates = isPastDate
    ? templates.filter((template) => (savedBlocks.get(template.key)?.actual_minutes ?? 0) > 0)
    : savedSession
      ? templates.filter((template) => savedBlocks.has(template.key))
      : templates
  const timers = Object.fromEntries(
    sessionTemplates.flatMap((template) => {
      const actualMinutes = savedBlocks.get(template.key)?.actual_minutes
      return actualMinutes == null
        ? []
        : [[template.id, { isRunning: false, elapsedSeconds: actualMinutes * 60 } satisfies BlockTimerState]]
    })
  )

  return {
    totalMinutes: savedSession ? String(savedSession.total_minutes) : '45',
    comment: savedSession?.comment ?? '',
    timers,
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
  const { language, t } = useI18n()
  const [templates, setTemplates] = useState<BlockTemplate[]>([])
  const [planWeek, setPlanWeek] = useState<ScheduledPlanWeek | null>(null)
  const [programName, setProgramName] = useState<string | null>(null)
  const [weeks, setWeeks] = useState<ScheduledPlanWeek[]>([])
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0)
  const [sessions, setSessions] = useState<SessionWithBlocks[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [totalMinutes, setTotalMinutes] = useState('45')
  const [comment, setComment] = useState('')
  const [selectedBlocks, setSelectedBlocks] = useState<SelectedBlock[]>([])
  const [blockToAddId, setBlockToAddId] = useState('')
  const [expandedBlockIds, setExpandedBlockIds] = useState<Set<string>>(new Set())
  const [timers, setTimers] = useState<Record<string, BlockTimerState>>({})
  const [isRecentSessionsOpen, setIsRecentSessionsOpen] = useState(false)
  const [showTargetPracticeTime, setShowTargetPracticeTime] = useState(true)
  const [isMetronomePlaying, setIsMetronomePlaying] = useState(false)
  const [bpmInput, setBpmInput] = useState('100')
  const [bpm, setBpm] = useState(100)
  const [beatsPerMeasure, setBeatsPerMeasure] = useState(4)
  const [timeSignatureMode, setTimeSignatureMode] = useState<'3/4' | '4/4' | '5/4' | 'custom'>('4/4')
  const [customBeatCount, setCustomBeatCount] = useState('4')
  const [customMeasureCount, setCustomMeasureCount] = useState('4')
  const [tuningKey, setTuningKey] = useState<TuningKey>('standard')
  const [activeReferenceTone, setActiveReferenceTone] = useState<string | null>(null)
  const [learningMaterials, setLearningMaterials] = useState<LocalMaterial[]>([])
  const [materialUrlInput, setMaterialUrlInput] = useState('')
  const [materialError, setMaterialError] = useState<string | null>(null)
  const [materialNotice, setMaterialNotice] = useState<string | null>(null)
  const [materialSaveState, setMaterialSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [localStorageEstimate, setLocalStorageEstimate] = useState<LocalStorageEstimate>({ usage: null, quota: null })
  const [activeMaterialId, setActiveMaterialId] = useState<string | null>(null)
  const [activeMaterialUrl, setActiveMaterialUrl] = useState<string | null>(null)
  const [mediaError, setMediaError] = useState<string | null>(null)
  const [loopStart, setLoopStart] = useState<number | null>(null)
  const [loopEnd, setLoopEnd] = useState<number | null>(null)
  const [isLooping, setIsLooping] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [isTunerOpen, setIsTunerOpen] = useState(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const referenceToneRef = useRef<OscillatorNode | null>(null)
  const referenceToneGainRef = useRef<GainNode | null>(null)
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
    void loadLearningMaterials()
  }, [])

  async function loadLearningMaterials() {
    try {
      setLearningMaterials(await listLocalMaterials('learning'))
      setLocalStorageEstimate(await estimateLocalStorage())
    } catch (loadError) {
      setMaterialError(loadError instanceof Error ? loadError.message : t('Could not load local materials.'))
    }
  }

  useEffect(() => {
    const activeMaterial = learningMaterials.find((material) => material.id === activeMaterialId)
    if (!activeMaterial) {
      setActiveMaterialUrl(null)
      setMediaError(null)
      setLoopStart(null)
      setLoopEnd(null)
      setIsLooping(false)
      return
    }

    if (activeMaterial.source === 'url') {
      setActiveMaterialUrl(activeMaterial.url ?? null)
      setMediaError(null)
      setLoopStart(null)
      setLoopEnd(null)
      setIsLooping(false)
      return
    }

    if (!activeMaterial.blob) {
      setActiveMaterialUrl(null)
      setMediaError(null)
      setLoopStart(null)
      setLoopEnd(null)
      setIsLooping(false)
      return
    }

    const objectUrl = URL.createObjectURL(activeMaterial.blob)
    setActiveMaterialUrl(objectUrl)
    setMediaError(null)
    setLoopStart(null)
    setLoopEnd(null)
    setIsLooping(false)
    return () => URL.revokeObjectURL(objectUrl)
  }, [activeMaterialId, learningMaterials])

  async function handleLocalMaterialUpload(file: File | undefined) {
    if (!file) return
    setMaterialError(null)
    setMaterialNotice(null)
    setMaterialSaveState('saving')
    const allowedTypes = ['application/pdf', 'image/', 'text/plain', 'video/']
    const isAllowed = allowedTypes.some((type) => type.endsWith('/') ? file.type.startsWith(type) : file.type === type)
    if (!isAllowed) {
      setMaterialError(t('Use a PDF, image, text, or video file.'))
      setMaterialSaveState('idle')
      return
    }
    const storageEstimate = await estimateLocalStorage()
    if (storageEstimate.quota != null && storageEstimate.usage != null) {
      const availableBytes = storageEstimate.quota - storageEstimate.usage
      if (file.size > availableBytes) {
        setMaterialError(t('This file is larger than the browser storage currently available on this device.'))
        setMaterialSaveState('idle')
        return
      }
    }

    if (file.type.startsWith('video/')) {
      const probe = document.createElement('video')
      const support = probe.canPlayType(file.type)
      if (!support) {
        setMaterialNotice(t('This browser may not decode this video format. H.264/AAC MP4 or WebM/Opus is usually the most compatible.'))
      }
    }

    try {
      await saveLocalMaterial({
        id: crypto.randomUUID(),
        blockKey: 'learning',
        name: file.name,
        type: file.type,
        size: file.size,
        source: 'file',
        blob: file,
        createdAt: new Date().toISOString(),
      })
      await loadLearningMaterials()
      setMaterialSaveState('saved')
      window.setTimeout(() => setMaterialSaveState('idle'), 2500)
    } catch (uploadError) {
      const isQuotaError = uploadError instanceof DOMException && uploadError.name === 'QuotaExceededError'
      setMaterialError(isQuotaError ? t('The browser storage quota was reached. Remove local materials or use another device.') : uploadError instanceof Error ? uploadError.message : t('Could not save the local material.'))
      setMaterialSaveState('idle')
    }
  }

  async function addMaterialUrl() {
    const value = materialUrlInput.trim()
    if (!value) return
    try {
      const iframeSource = value.match(/src=["']([^"']+)["']/i)?.[1]
      const url = new URL(iframeSource ?? value)
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error(t('Only HTTP and HTTPS URLs are supported.'))
      await saveLocalMaterial({
        id: crypto.randomUUID(),
        blockKey: 'learning',
        name: url.hostname,
        type: 'text/uri-list',
        size: 0,
        source: 'url',
        url: url.toString(),
        createdAt: new Date().toISOString(),
      })
      setMaterialUrlInput('')
      setMaterialError(null)
      setMaterialNotice(null)
      await loadLearningMaterials()
    } catch (urlError) {
      setMaterialError(urlError instanceof Error ? urlError.message : t('Enter a valid web URL.'))
    }
  }

  async function removeLearningMaterial(id: string) {
    await deleteLocalMaterial(id)
    setLearningMaterials((current) => current.filter((material) => material.id !== id))
    if (activeMaterialId === id) setActiveMaterialId(null)
    setLocalStorageEstimate(await estimateLocalStorage())
  }

  function formatStorageSize(bytes: number | null) {
    if (bytes == null) return 'Storage estimate unavailable'
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  function setLoopPoint(point: 'start' | 'end') {
    const currentTime = videoRef.current?.currentTime
    if (currentTime == null) return
    if (point === 'start') setLoopStart(currentTime)
    else setLoopEnd(currentTime)
  }

  function clearLoop() {
    setLoopStart(null)
    setLoopEnd(null)
    setIsLooping(false)
  }

  function getExternalMediaKind(material: LocalMaterial) {
    if (material.source !== 'url' || !material.url) return null
    const pathname = new URL(material.url).pathname.toLowerCase()
    const hostname = new URL(material.url).hostname.toLowerCase()
    if ((hostname === 'www.youtube.com' || hostname === 'youtube.com' || hostname === 'www.youtube-nocookie.com') && pathname.startsWith('/embed/')) return 'embed'
    if (/\.(mp4|webm|ogg|mov)$/.test(pathname)) return 'video'
    if (/\.(png|jpe?g|gif|webp|avif)$/.test(pathname)) return 'image'
    if (/\.pdf$/.test(pathname)) return 'pdf'
    return 'page'
  }

  function getInlineMaterialUrl(material: LocalMaterial) {
    if (material.source !== 'url' || !material.url) return activeMaterialUrl

    const parsedUrl = new URL(material.url)
    const isYouTubeEmbed = (parsedUrl.hostname === 'www.youtube.com' || parsedUrl.hostname === 'youtube.com' || parsedUrl.hostname === 'www.youtube-nocookie.com') && parsedUrl.pathname.startsWith('/embed/')
    if (!isYouTubeEmbed) return material.url

    parsedUrl.hostname = 'www.youtube-nocookie.com'
    parsedUrl.searchParams.delete('si')
    parsedUrl.searchParams.set('playsinline', '1')
    parsedUrl.searchParams.set('enablejsapi', '1')
    parsedUrl.searchParams.set('origin', window.location.origin)
    return parsedUrl.toString()
  }

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
      stopReferenceTone()
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
    setShowTargetPracticeTime(data.show_target_practice_time ?? true)
  }

  async function loadData() {
    setLoading(true)
    setError(null)

    const today = new Date().toISOString().slice(0, 10)

    const [weeksResult, planResult, templatesResult, sessionsResult, programsResult, todosResult] = await Promise.all([
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
        .order('session_date', { ascending: false }),
      supabase.from('programs').select('*'),
      supabase.from('todos').select('*').order('sort_order', { ascending: true }),
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

    if (programsResult.error) {
      setError(programsResult.error.message)
      setLoading(false)
      return
    }

    if (todosResult.error) {
      setError(todosResult.error.message)
      setLoading(false)
      return
    }

    const allWeeks = ((weeksResult.data ?? []) as PlanWeek[]).filter(isScheduledWeek)
    const currentWeek = allWeeks.find((entry) => entry.start_date <= today && entry.end_date >= today) ?? allWeeks[0] ?? null
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
    setTodos(currentWeek ? ((todosResult.data ?? []) as Todo[]).filter((todo) => todo.week_id === currentWeek.id) : [])
    setProgramName((programsResult.data as Program[] | null)?.find((program) => program.id === currentWeek?.program_id)?.name ?? null)
    setSelectedWeekIndex(currentWeekIndex >= 0 ? currentWeekIndex : 0)
    setDate(defaultDate)
    setTemplates(dedupedTemplates)
    setTotalMinutes(editorState.totalMinutes)
    setComment(editorState.comment)
    setSelectedBlocks(editorState.selectedBlocks)
    setBlockToAddId('')
    setTimers(editorState.timers)
    setSessions(loadedSessions)
    setLoading(false)
  }

  function getWeekDates(week: PlanWeek | null) {
    if (!week) return []

    const storedStart = new Date(`${week.start_date}T00:00:00`)
    const day = storedStart.getDay()
    const start = new Date(storedStart)
    start.setDate(start.getDate() + (day === 0 ? -6 : 1 - day))
    const result: string[] = []
    const cursor = new Date(start)

    for (let index = 0; index < 7; index += 1) {
      result.push(formatLocalDate(cursor))
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
    return weekDates.find((value) => isTodayDate(value)) ?? weekDates[0]
  }

  async function loadTodos(weekId: string | null) {
    if (!weekId) {
      setTodos([])
      return
    }

    const { data, error: todoError } = await supabase
      .from('todos')
      .select('*')
      .eq('week_id', weekId)
      .order('sort_order', { ascending: true })

    if (todoError) {
      setError(todoError.message)
      return
    }

    setTodos((data ?? []) as Todo[])
  }

  function handleSelectWeek(week: ScheduledPlanWeek) {
    setPlanWeek(week)
    void loadTodos(week.id)
    const nextDate = getDefaultDateForWeek(week)
    const editorState = getSessionEditorState(nextDate, templates, sessions)
    setDate(nextDate)
    setTotalMinutes(editorState.totalMinutes)
    setComment(editorState.comment)
    setSelectedBlocks(editorState.selectedBlocks)
    setTimers(editorState.timers)
    setBlockToAddId('')
    setExpandedBlockIds(new Set())
    setSelectedWeekIndex(weeks.findIndex((item) => item.id === week.id))
  }

  function handleSelectDay(nextDate: string) {
    setDate(nextDate)
    const editorState = getSessionEditorState(nextDate, templates, sessions)
    setTotalMinutes(editorState.totalMinutes)
    setComment(editorState.comment)
    setSelectedBlocks(editorState.selectedBlocks)
    setBlockToAddId('')
    setExpandedBlockIds(new Set())
    setTimers(editorState.timers)
  }

  function handleOpenRecentSession(session: SessionWithBlocks) {
    const sessionWeekIndex = session.week_id
      ? weeks.findIndex((weekItem) => weekItem.id === session.week_id)
      : weeks.findIndex((weekItem) => weekItem.start_date <= session.session_date && weekItem.end_date >= session.session_date)
    const nextWeek = sessionWeekIndex >= 0 ? weeks[sessionWeekIndex] : null
    const editorState = getSessionEditorState(session.session_date, templates, sessions)

    if (nextWeek) {
      setPlanWeek(nextWeek)
      void loadTodos(nextWeek.id)
      setSelectedWeekIndex(sessionWeekIndex)
    }
    setDate(session.session_date)
    setTotalMinutes(editorState.totalMinutes)
    setComment(editorState.comment)
    setSelectedBlocks(editorState.selectedBlocks)
    setTimers(editorState.timers)
    setBlockToAddId('')
    setExpandedBlockIds(new Set())
  }

  function toggleBlock(templateId: string) {
    setSelectedBlocks((current) =>
      current.map((block) =>
        block.id === templateId ? { ...block, done: !block.done } : block
      )
    )
  }

  function addTodo() {
    if (!planWeek) return

    const nextSortOrder = Math.max(-1, ...todos.map((todo) => todo.sort_order)) + 1
    setTodos((current) => [...current, {
      id: `draft-${Date.now()}`,
      week_id: planWeek.id,
      name: '',
      done: false,
      sort_order: nextSortOrder,
      source: 'app',
    }])
  }

  function updateTodo(index: number, updates: Partial<Todo>) {
    setTodos((current) => current.map((todo, todoIndex) => todoIndex === index ? { ...todo, ...updates } : todo))
  }

  async function saveTodo(todo: Todo) {
    const name = todo.name.trim()
    if (!name || !planWeek) return

    setError(null)
    const payload = {
      week_id: planWeek.id,
      name,
      done: todo.done,
      sort_order: todo.sort_order,
      source: todo.source ?? 'app',
    }

    if (todo.id.startsWith('draft-')) {
      const { data, error: todoError } = await supabase.from('todos').insert(payload).select('*').single()
      if (todoError || !data) {
        setError(todoError?.message ?? t('Could not save the ToDo.'))
        return
      }
      setTodos((current) => current.map((item) => item.id === todo.id ? data as Todo : item))
      return
    }

    const { data, error: todoError } = await supabase.from('todos').update(payload).eq('id', todo.id).select('*').single()
    if (todoError || !data) {
      setError(todoError?.message ?? t('Could not save the ToDo.'))
      return
    }
    setTodos((current) => current.map((item) => item.id === todo.id ? data as Todo : item))
  }

  function removeTodo(index: number) {
    setTodos((current) => current.filter((_, todoIndex) => todoIndex !== index))
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

  async function playReferenceTone(stringName: string, frequency: number) {
    const context = await ensureAudioContext()
    stopReferenceTone()
    const oscillator = context.createOscillator()
    const gainNode = context.createGain()

    oscillator.type = 'triangle'
    oscillator.frequency.value = frequency
    gainNode.gain.setValueAtTime(0.0001, context.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.35)
    oscillator.connect(gainNode)
    gainNode.connect(context.destination)
    oscillator.start()
    referenceToneRef.current = oscillator
    referenceToneGainRef.current = gainNode
    setActiveReferenceTone(stringName)
  }

  function stopReferenceTone() {
    const context = audioContextRef.current
    const oscillator = referenceToneRef.current
    const gainNode = referenceToneGainRef.current
    setActiveReferenceTone(null)
    if (!context || !oscillator || !gainNode) return

    const stopTime = context.currentTime + 0.35
    gainNode.gain.cancelScheduledValues(context.currentTime)
    gainNode.gain.setValueAtTime(Math.max(gainNode.gain.value, 0.0001), context.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.0001, stopTime)
    oscillator.stop(stopTime + 0.02)
    referenceToneRef.current = null
    referenceToneGainRef.current = null
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
      setError(t('Not signed in.'))
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
      setError(sessionError?.message ?? t('Could not save the session.'))
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

    const selectedBlockKeys = selectedBlocks.map((block) => block.key)
    const blocksRemovalQuery = supabase
      .from('session_blocks')
      .delete()
      .eq('session_id', sessionData.id)

    const { error: blocksRemovalError } = selectedBlockKeys.length > 0
      ? await blocksRemovalQuery.not('block_key', 'in', `(${selectedBlockKeys.join(',')})`)
      : await blocksRemovalQuery

    if (blocksRemovalError) {
      setError(blocksRemovalError.message)
      setSaving(false)
      return
    }

    if (blocksToInsert.length > 0) {
      const { error: blocksError } = await supabase
        .from('session_blocks')
        .upsert(blocksToInsert, { onConflict: 'session_id,block_key' })

      if (blocksError) {
        setError(blocksError.message)
        setSaving(false)
        return
      }
    }

    if (planWeek) {
      const { error: todoDeleteError } = await supabase.from('todos').delete().eq('week_id', planWeek.id)
      if (todoDeleteError) {
        setError(todoDeleteError.message)
        setSaving(false)
        return
      }

      if (todos.length > 0) {
        const { error: todoInsertError } = await supabase.from('todos').insert(
          todos
            .filter((todo) => todo.name.trim())
            .map((todo, index) => ({
              week_id: planWeek.id,
              name: todo.name.trim(),
              done: todo.done,
              sort_order: index + 1,
              source: todo.source ?? 'app',
            }))
        )

        if (todoInsertError) {
          setError(todoInsertError.message)
          setSaving(false)
          return
        }
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
    setMessage(t('Session saved successfully.'))
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
    return <p className="text-sm text-slate-400">{t('Loading…')}</p>
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{t('Session {date}', { date: formatHeadingDate(date, language) })}</h1>
            <p className="mt-1 text-sm text-slate-400">
              {t('Practice week navigator for the current cycle.')}
            </p>
          </div>

          <div className="flex flex-wrap items-stretch gap-3 lg:justify-end">
            <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 lg:min-w-[280px]">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">{t('Metronome')}</p>
                  <p className="text-sm text-slate-300">{t(isMetronomePlaying ? 'Playing' : 'Standby')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { void toggleMetronome() }}
                  className="rounded bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-900"
                >
                  {isMetronomePlaying ? t('Stop') : t('Start')}
                </button>
              </div>

              <div className="mt-2 flex flex-wrap items-end gap-2">
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
                  {t('Time')}
                  <select
                    value={timeSignatureMode}
                    onChange={(event) => handleTimeSignatureChange(event.target.value as '3/4' | '4/4' | '5/4' | 'custom')}
                    className="mt-1 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-200"
                  >
                    <option value="3/4">3/4</option>
                    <option value="4/4">4/4</option>
                    <option value="5/4">5/4</option>
                    <option value="custom">{t('Custom')}</option>
                  </select>
                </label>

                {timeSignatureMode === 'custom' && (
                  <div className="flex items-end gap-2">
                    <label className="text-xs text-slate-400">
                      {t('Beat')}
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
                      {t('Measure')}
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
                  {t('Tap')}
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-2 lg:min-w-[280px]">
              <button
                type="button"
                aria-expanded={isTunerOpen}
                onClick={() => setIsTunerOpen((current) => !current)}
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{t('Tuner')}</span>
                <span className="text-xs text-slate-500">{t(isTunerOpen ? 'Hide' : 'Show')}</span>
              </button>
              {isTunerOpen && (
                <div className="mt-2">
                  <select
                    value={tuningKey}
                    onChange={(event) => {
                      stopReferenceTone()
                      setTuningKey(event.target.value as TuningKey)
                    }}
                    className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-200"
                    aria-label={t('Guitar tuning')}
                  >
                    {Object.entries(tuningPresets).map(([key, tuning]) => (
                      <option key={key} value={key}>{t(tuning.label)}</option>
                    ))}
                  </select>
                  <div key={tuningKey} className="mt-2 grid grid-cols-3 gap-1">
                    {tuningPresets[tuningKey].notes.map((note) => (
                      (() => {
                        const displayNote = note.stringName.startsWith('Low ') || note.stringName.startsWith('High ')
                          ? t(note.stringName)
                          : note.stringName
                        return (
                      <button
                        key={note.stringName}
                        type="button"
                        title={t('Play {note} reference tone', { note: displayNote })}
                        onClick={() => { void playReferenceTone(note.stringName, note.frequency) }}
                        className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 transition hover:border-sky-500 hover:text-sky-200"
                      >
                        {activeReferenceTone === note.stringName ? t('Playing') : displayNote}
                      </button>
                        )
                      })()
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={stopReferenceTone}
                    disabled={!activeReferenceTone}
                    className="mt-2 w-full rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t('Stop tone')}
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 lg:min-w-[240px]">
              <p className="text-xs uppercase tracking-wide text-slate-400">{t('Practice time')}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-100">{totalBlockMinutes} min</p>
              <p className="text-sm text-slate-400">{t('Total across selected blocks')}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/80 p-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{t('Practice weeks')}</p>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-300">
              <span>{t('Jump to')}</span>
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
                    {t('Week {week}', { week: weekItem.week_number })} · {formatDateRange(weekItem.start_date, weekItem.end_date, language)}
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
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{t('Week {week}', { week: weekItem.week_number })}</p>
                    {isCurrentWeek && (
                      <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.18em] text-emerald-300">
                        {t('Today')}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-lg font-semibold">{weekItem.focus || t('Focus')}</p>
                  <p className="mt-1 text-xs text-slate-400">{formatDateRange(weekItem.start_date, weekItem.end_date, language)}</p>
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/80 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{t('Selected week')}</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-100">{planWeek?.focus ?? t('No week selected')}</h2>
            </div>

            {planWeek && planWeek.start_date <= new Date().toISOString().slice(0, 10) && planWeek.end_date >= new Date().toISOString().slice(0, 10) && (
              <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.18em] text-sky-300">
                {t('Current week')}
              </span>
            )}
          </div>

          <div className="mt-3 grid gap-2 text-sm text-slate-300 md:grid-cols-2">
            <div className="rounded border border-slate-800 bg-slate-950/70 p-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{t('Program')}</p>
              <p className="mt-1">{programName ?? '—'}</p>
            </div>
            <div className="rounded border border-slate-800 bg-slate-950/70 p-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{t('Dates')}</p>
              <p className="mt-1">{planWeek ? formatDateRange(planWeek.start_date, planWeek.end_date, language) : '—'}</p>
            </div>
          </div>

          <div className="mt-3 rounded border border-slate-800 bg-slate-950/70 p-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{t('Week description')}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">
              {planWeek?.tasks?.trim() || t('No description recorded for this week yet.')}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/80 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-200">{t('ToDo')}</p>
            <button
              type="button"
              onClick={addTodo}
              className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300"
            >
              {t('+ Add ToDo')}
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {todos.length === 0 && <p className="text-sm text-slate-400">{t('No ToDo items yet for this week.')}</p>}

            {todos.map((todo, index) => (
              <div key={`${todo.id}-${index}`} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={todo.done}
                  onChange={(event) => updateTodo(index, { done: event.target.checked })}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-950"
                />
                <input
                  value={todo.name}
                  onChange={(event) => updateTodo(index, { name: event.target.value })}
                  onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void saveTodo({ ...todo, name: event.currentTarget.value }) } }}
                  className="flex-1 rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                  placeholder={t('ToDo name')}
                />
                <button
                  type="button"
                  onClick={() => removeTodo(index)}
                  className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-400"
                >
                  {t('Remove')}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/80 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{t('Days in selected week')}</p>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-7">
            {selectedWeekDates.map((day) => {
              const isSelectedDay = day === date
              const isToday = isTodayDate(day)
              const isCompleted = day < new Date().toISOString().slice(0, 10)
                && sessions.some((session) => session.session_date === day)

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`relative rounded-lg border px-2 py-3 text-center transition ${
                    isSelectedDay
                      ? 'border-sky-500 bg-sky-500/10 text-sky-100'
                      : isCompleted
                          ? 'border-emerald-500/50 bg-emerald-500/5 text-emerald-100'
                        : 'border-slate-700 bg-slate-950/70 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {isToday && (
                    <span
                      aria-label={t('Current day')}
                      title={t('Current day')}
                      className="absolute right-2 top-2 h-3 w-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.75)]"
                    />
                  )}
                  <div className="flex items-center justify-center gap-1">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                      {new Date(`${day}T00:00:00`).toLocaleDateString(localeForLanguage(language), { weekday: 'short' })}
                    </p>
                    {isCompleted && (
                      <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[8px] uppercase tracking-[0.12em] text-emerald-200">
                        ✓ {t('Done')}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-medium">{new Date(`${day}T00:00:00`).toLocaleDateString(localeForLanguage(language), { month: 'short', day: 'numeric' })}</p>
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/80 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{t('Selected day')}</p>
              <h3 className="mt-1 text-lg font-semibold text-slate-100">{formatHeadingDate(date, language)}</h3>
            </div>
            {isTodayDate(date) && (
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.18em] text-emerald-300">
                {t('Today')}
              </span>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-2 rounded border border-slate-800 bg-slate-950/60 p-3 sm:flex-row sm:items-end">
            <label className="flex-1 text-xs text-slate-400">
              {t('Add practice block')}
              <select
                value={blockToAddId}
                onChange={(event) => setBlockToAddId(event.target.value)}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-200"
              >
                <option value="">{t('Choose a block')}</option>
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
              {t('Add block')}
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {selectedBlocks.length === 0 && (
              <p className="text-sm text-slate-400">{t('No practice blocks selected for this day.')}</p>
            )}

            {templates.map((template) => {
              const selected = selectedBlocks.find((block) => block.id === template.id)

              if (!selected) return null

              const elapsedSeconds = timers[template.id]?.elapsedSeconds ?? 0
              const timerMinutes = Math.floor(elapsedSeconds / 60)
              const timerSeconds = elapsedSeconds % 60
              const isExpanded = expandedBlockIds.has(template.id)
              const defaultMaterials = getDefaultMaterials(language, template.key)

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
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        onClick={() => setExpandedBlockIds((current) => {
                          const next = new Set(current)
                          if (next.has(template.id)) next.delete(template.id)
                          else next.add(template.id)
                          return next
                        })}
                        className="min-w-0 text-left"
                      >
                        <p className="text-sm font-semibold text-slate-100">{template.label}</p>
                        {showTargetPracticeTime && <p className="text-xs text-slate-400">{t('Target: {minutes} min', { minutes: template.target_minutes ?? 0 })}</p>}
                      </button>
                    </div>

                    {isExpanded && (
                      <>
                        <p className="mt-2 text-sm text-slate-300">
                          {template.description?.trim() || t('No description available for this practice block.')}
                        </p>
                        {defaultMaterials.length > 0 && (
                          <div className="mt-3 space-y-2 rounded border border-slate-800 bg-slate-900/50 p-3">
                            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{t('Default references')}</p>
                            {defaultMaterials.map((material) => (
                              <div key={material.title} className="rounded border border-slate-800 bg-slate-950/60 px-3 py-2">
                                <p className="text-xs font-medium text-slate-200">{material.title}</p>
                                <p className="mt-1 text-xs leading-relaxed text-slate-400">{material.detail}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        {template.key === 'learning' && (
                          <div className="mt-3 space-y-2 rounded border border-slate-800 bg-slate-900/60 p-3">
                            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                              {t('Materials stay on this device')}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {t('Local storage: {used} used', { used: formatStorageSize(localStorageEstimate.usage) })}
                              {localStorageEstimate.quota != null ? ` ${t('of {quota}', { quota: formatStorageSize(localStorageEstimate.quota) })}` : ''}
                            </p>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                              <input
                                type="file"
                                accept="application/pdf,image/*,text/plain,video/*"
                                onChange={(event) => { void handleLocalMaterialUpload(event.target.files?.[0]); event.currentTarget.value = '' }}
                                className="min-w-0 flex-1 text-xs text-slate-300 file:mr-2 file:rounded file:border-0 file:bg-slate-700 file:px-2 file:py-1 file:text-xs file:text-slate-100"
                              />
                              {materialSaveState !== 'idle' && (
                                <span className={`text-xs ${materialSaveState === 'saved' ? 'text-emerald-300' : 'text-slate-400'}`}>
                                  {materialSaveState === 'saving' ? t('Saving locally…') : t('Saved on this device')}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <input
                                type="url"
                                value={materialUrlInput}
                                onChange={(event) => setMaterialUrlInput(event.target.value)}
                                placeholder={t('Material URL')}
                                className="min-w-0 flex-1 rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-200"
                              />
                              <button
                                type="button"
                                onClick={() => { void addMaterialUrl() }}
                                className="rounded border border-slate-700 px-2 py-1.5 text-xs text-slate-300"
                              >
                                {t('Add URL')}
                              </button>
                            </div>
                            {learningMaterials.length > 0 && (
                              <div className="space-y-1">
                                {learningMaterials.map((material) => (
                                  <div key={material.id} className="flex items-center justify-between gap-2 text-xs">
                                    <button
                                      type="button"
                                      onClick={() => setActiveMaterialId(material.id)}
                                      className={`min-w-0 truncate text-left hover:text-sky-200 ${activeMaterialId === material.id ? 'text-sky-200' : 'text-sky-300'}`}
                                    >
                                      {material.name}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => { void removeLearningMaterial(material.id) }}
                                      className="shrink-0 text-rose-300"
                                    >
                                      {t('Remove')}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                            {activeMaterialId && activeMaterialUrl && (() => {
                              const activeMaterial = learningMaterials.find((material) => material.id === activeMaterialId)
                              if (!activeMaterial) return null
                              const isVideo = activeMaterial.type.startsWith('video/')
                              const isImage = activeMaterial.type.startsWith('image/')
                              const externalMediaKind = getExternalMediaKind(activeMaterial)
                              const isExternalPage = externalMediaKind === 'page'
                              const inlineMaterialUrl = getInlineMaterialUrl(activeMaterial)

                              return (
                                <div className="mt-3 overflow-hidden rounded border border-slate-700 bg-slate-950">
                                  <div className="flex items-center justify-between gap-2 border-b border-slate-800 px-2 py-1.5">
                                    <span className="min-w-0 truncate text-xs text-slate-300">{activeMaterial.name}</span>
                                    <button
                                      type="button"
                                      onClick={() => setActiveMaterialId(null)}
                                      className="shrink-0 text-xs text-slate-400 hover:text-slate-200"
                                    >
                                      {t('Close')}
                                    </button>
                                  </div>
                                  {externalMediaKind === 'embed' && inlineMaterialUrl ? (
                                    <iframe
                                      src={inlineMaterialUrl}
                                      title={activeMaterial.name}
                                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                      allowFullScreen
                                      referrerPolicy="strict-origin-when-cross-origin"
                                      className="aspect-video w-full bg-black"
                                    />
                                  ) : isExternalPage && activeMaterial.url ? (
                                    <div className="space-y-3 p-4 text-sm text-slate-300">
                                      <p>{t('This web page does not provide an embeddable media format, or it blocks inline viewing.')}</p>
                                      <a
                                        href={activeMaterial.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-block rounded border border-slate-700 px-3 py-2 text-sky-300 hover:border-sky-500 hover:text-sky-200"
                                      >
                                        {t('Open in browser')}
                                      </a>
                                    </div>
                                  ) : isVideo || externalMediaKind === 'video' ? (
                                    <div className="space-y-2 bg-black p-2">
                                      <video
                                        ref={videoRef}
                                        src={activeMaterialUrl}
                                        controls
                                        playsInline
                                        preload="metadata"
                                        onTimeUpdate={(event) => {
                                          if (!isLooping || loopStart == null || loopEnd == null || loopEnd <= loopStart) return
                                          if (event.currentTarget.currentTime >= loopEnd) {
                                            event.currentTarget.currentTime = loopStart
                                            void event.currentTarget.play()
                                          }
                                        }}
                                        onError={() => setMediaError(t('This video codec or container is not fully supported by this browser.'))}
                                        className="max-h-[420px] w-full"
                                      />
                                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                                        <button
                                          type="button"
                                          onClick={() => setLoopPoint('start')}
                                          className="rounded border border-slate-700 px-2 py-1 hover:border-sky-500"
                                        >
                                          {t('Set A')} {loopStart == null ? '' : `(${loopStart.toFixed(1)}s)`}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setLoopPoint('end')}
                                          className="rounded border border-slate-700 px-2 py-1 hover:border-sky-500"
                                        >
                                          {t('Set B')} {loopEnd == null ? '' : `(${loopEnd.toFixed(1)}s)`}
                                        </button>
                                        <button
                                          type="button"
                                          disabled={loopStart == null || loopEnd == null || loopEnd <= loopStart}
                                          onClick={() => setIsLooping((current) => !current)}
                                          className="rounded border border-slate-700 px-2 py-1 hover:border-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                          {isLooping ? t('Looping') : t('Loop A-B')}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={clearLoop}
                                          className="rounded border border-slate-700 px-2 py-1 text-slate-400 hover:text-slate-200"
                                        >
                                          {t('Clear')}
                                        </button>
                                      </div>
                                      {activeMaterial.source === 'file' && (
                                        <div>
                                          <p className="mb-1 text-[11px] text-slate-400">{t('Audio track fallback')}</p>
                                          <audio
                                            src={activeMaterialUrl}
                                            controls
                                            preload="metadata"
                                            className="w-full"
                                            onError={() => setMediaError(t('The audio codec is not supported by this browser.'))}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  ) : isImage || externalMediaKind === 'image' ? (
                                    <img src={activeMaterialUrl} alt={activeMaterial.name} className="max-h-[420px] w-full object-contain" />
                                  ) : (
                                    <iframe
                                      src={activeMaterialUrl}
                                      title={activeMaterial.name}
                                      className="h-[420px] w-full bg-white"
                                    />
                                  )}
                                  {externalMediaKind === 'embed' && activeMaterial.url && (
                                    <a
                                      href={activeMaterial.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="block border-t border-slate-800 px-3 py-2 text-xs text-sky-300 hover:text-sky-200"
                                    >
                                      {t('Playback trouble? Open on YouTube')}
                                    </a>
                                  )}
                                  {mediaError && <p className="px-3 py-2 text-xs text-rose-300">{mediaError}</p>}
                                </div>
                              )
                            })()}
                            {materialError && <p className="text-xs text-rose-300">{materialError}</p>}
                            {materialNotice && <p className="text-xs text-amber-300">{materialNotice}</p>}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleTimer(template.id)}
                        className="rounded bg-slate-800 px-2 py-1 text-xs font-medium text-slate-200"
                      >
                        {timers[template.id]?.isRunning ? t('Pause') : t('Start')}
                      </button>
                      <button
                        type="button"
                        onClick={() => resetTimer(template.id)}
                        className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300"
                      >
                        {t('Reset')}
                      </button>
                    </div>

                    <fieldset className="flex shrink-0 items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                      <legend>{t('Timer')}</legend>
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
                      className="text-[11px] font-medium text-rose-300 whitespace-nowrap"
                    >
                      {t('Remove block')}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="block space-y-1 text-sm">
            <span className="block text-slate-300">{t('Notes')}</span>
            <textarea
              rows={3}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2"
              placeholder={t('What did you work on?')}
            />
          </label>

          

          {message && <p className="text-sm text-emerald-400">{message}</p>}
          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="rounded bg-slate-100 px-3 py-2 font-medium text-slate-900 disabled:opacity-50"
          >
            {saving ? t('Saving…') : t('Save session')}
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
          <h2 className="text-lg font-semibold">{t('Recent sessions')}</h2>
          <span className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300">
            {t(isRecentSessionsOpen ? 'Hide' : 'Show')}
          </span>
        </button>

        {isRecentSessionsOpen && (
          <div className="mt-3 space-y-3">
            {sessions.length === 0 && <p className="text-sm text-slate-400">{t('No sessions yet.')}</p>}

            {sessions.slice(0, 5).map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => handleOpenRecentSession(session)}
                className="w-full rounded border border-slate-800 bg-slate-900/70 p-3 text-left transition hover:border-slate-600"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-200">{formatDate(session.session_date, language)}</p>
                    <p className="text-sm text-slate-400">{session.total_minutes} {t('min')}</p>
                  </div>
                  <span className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-300">
                    {t(session.source === 'notion_import' ? 'Imported' : 'App')}
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
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}