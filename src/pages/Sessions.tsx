import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { useHeaderSlots } from '../components/headerSlots'
import { supabase } from '../lib/supabase'
import { deleteLocalMaterial, estimateLocalStorage, listLocalMaterials, loadLocalMaterialBlob, saveLocalMaterial, type LocalMaterial, type LocalStorageEstimate } from '../lib/localMaterials'
import type { Database } from '../lib/database.types'
import { formatDate, formatDateRange, localeForLanguage, toLocalIsoDate } from '../lib/dateFormat'
import { useI18n } from '../lib/i18n'
import { getDefaultMaterials } from '../lib/defaultMaterials'
import { planSessionBlockSave } from '../lib/sessionBlockSavePlan'
import { getSessionEditorState, hasSavedSession, isSessionEditorDirty, type BlockTimerState, type SelectedBlock } from '../lib/sessionEditorState'
import { createRequestTracker, findActiveMaterial, removeBlockMaterial, setBlockMaterials, updateBlockMaterial, type ActiveMaterial, type MaterialsByBlock } from '../lib/materialScope'
import MetronomeIcon from '../components/icons/MetronomeIcon'
import TuningForkIcon from '../components/icons/TuningForkIcon'
import { isYouTubeEmbedUrl, isYouTubeHostLink, toYouTubeEmbedUrl, toYouTubeIframeSrc, toYouTubeWatchUrl } from '../lib/youtube'

type MaterialFeedback = { error: string | null; notice: string | null; saveState: 'idle' | 'saving' | 'saved' }
const emptyMaterialFeedback: MaterialFeedback = { error: null, notice: null, saveState: 'idle' }

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

type RemovedBlock = {
  block: SelectedBlock
  timer: BlockTimerState | undefined
  index: number
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

export default function Sessions() {
  const { language, t } = useI18n()
  const headerSlots = useHeaderSlots()
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
  const [date, setDate] = useState(toLocalIsoDate())
  const [comment, setComment] = useState('')
  const [selectedBlocks, setSelectedBlocks] = useState<SelectedBlock[]>([])
  const [expandedBlockIds, setExpandedBlockIds] = useState<Set<string>>(new Set())
  const [isBlockPickerOpen, setIsBlockPickerOpen] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const [removedBlock, setRemovedBlock] = useState<RemovedBlock | null>(null)
  const [pendingDiscardAction, setPendingDiscardAction] = useState<{ run: () => void } | null>(null)
  const [isWeekStripOpen, setIsWeekStripOpen] = useState(false)
  const [isWeekDetailsOpen, setIsWeekDetailsOpen] = useState(false)
  const [isTodoOpen, setIsTodoOpen] = useState(false)
  const [todoError, setTodoError] = useState<string | null>(null)
  const [timers, setTimers] = useState<Record<string, BlockTimerState>>({})
  const [isRecentSessionsOpen, setIsRecentSessionsOpen] = useState(false)
  const [showTargetPracticeTime, setShowTargetPracticeTime] = useState(true)
  const [includeDefaultExercises, setIncludeDefaultExercises] = useState(true)
  const [isMetronomePlaying, setIsMetronomePlaying] = useState(false)
  const [isMetronomeSettingsOpen, setIsMetronomeSettingsOpen] = useState(false)
  const [currentBeat, setCurrentBeat] = useState(0)
  const [bpmInput, setBpmInput] = useState('100')
  const [bpm, setBpm] = useState(100)
  const [beatsPerMeasure, setBeatsPerMeasure] = useState(4)
  const [timeSignatureMode, setTimeSignatureMode] = useState<'3/4' | '4/4' | '5/4' | 'custom'>('4/4')
  const [customBeatCount, setCustomBeatCount] = useState('4')
  const [customMeasureCount, setCustomMeasureCount] = useState('4')
  const [tuningKey, setTuningKey] = useState<TuningKey>('standard')
  const [activeReferenceTone, setActiveReferenceTone] = useState<string | null>(null)
  const [materialsByBlock, setMaterialsByBlock] = useState<MaterialsByBlock>({})
  const [materialUrlInputs, setMaterialUrlInputs] = useState<Record<string, string>>({})
  const [materialFeedback, setMaterialFeedback] = useState<Record<string, MaterialFeedback>>({})
  const [localStorageEstimate, setLocalStorageEstimate] = useState<LocalStorageEstimate>({ usage: null, quota: null })
  const [activeMaterial, setActiveMaterialState] = useState<ActiveMaterial | null>(null)
  const [activeDefaultMaterial, setActiveDefaultMaterial] = useState<{ blockKey: string; title: string; url: string } | null>(null)
  const [activeMaterialUrl, setActiveMaterialUrl] = useState<string | null>(null)
  const [mediaError, setMediaError] = useState<string | null>(null)
  const [loopStart, setLoopStart] = useState<number | null>(null)
  const [loopEnd, setLoopEnd] = useState<number | null>(null)
  const [isLooping, setIsLooping] = useState(false)
  const [bookmarks, setBookmarks] = useState<number[]>([])
  const materialFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [isTunerOpen, setIsTunerOpen] = useState(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const referenceToneRef = useRef<OscillatorNode | null>(null)
  const referenceToneGainRef = useRef<GainNode | null>(null)
  const schedulerIntervalRef = useRef<number | null>(null)
  const beatCounterRef = useRef(0)
  const lastTapTimeRef = useRef<number | null>(null)
  const metronomeHoldTimerRef = useRef<number | null>(null)
  const metronomePointerDownRef = useRef(false)
  const metronomeHoldTriggeredRef = useRef(false)
  const tunerHoldTimerRef = useRef<number | null>(null)
  const tunerHoldTriggeredRef = useRef(false)
  const toolPanelRef = useRef<HTMLDivElement | null>(null)
  const metronomeButtonRef = useRef<HTMLButtonElement | null>(null)
  const tunerButtonRef = useRef<HTMLButtonElement | null>(null)
  const lastToolButtonRef = useRef<HTMLButtonElement | null>(null)
  const materialsRequestTrackerRef = useRef(createRequestTracker())
  const dayStripRef = useRef<HTMLDivElement | null>(null)
  const blocksSectionRef = useRef<HTMLElement | null>(null)
  const addBlockButtonRef = useRef<HTMLButtonElement | null>(null)
  const blockSheetRef = useRef<HTMLDivElement | null>(null)
  const discardPromptRef = useRef<HTMLDivElement | null>(null)
  const messageRef = useRef<HTMLParagraphElement | null>(null)
  const pendingFocusBlockIdRef = useRef<string | null>(null)
  const removedBlockTimeoutRef = useRef<number | null>(null)
  const bpmRef = useRef(bpm)
  const beatsPerMeasureRef = useRef(beatsPerMeasure)
  const lookaheadRef = useRef(0.12)
  const nextNoteTimeRef = useRef(0)

  useEffect(() => {
    void loadData()
    void loadAppSettings()
  }, [])

  function patchMaterialFeedback(blockKey: string, patch: Partial<MaterialFeedback>) {
    setMaterialFeedback((current) => ({ ...current, [blockKey]: { ...emptyMaterialFeedback, ...current[blockKey], ...patch } }))
  }

  function setActiveMaterial(blockKey: string, id: string | null) {
    if (activeMaterial?.id !== id) setActiveMaterialUrl(null)
    setActiveMaterialState(id ? { blockKey, id } : null)
    if (id) setActiveDefaultMaterial(null)
  }

  async function loadBlockMaterials(blockKey: string) {
    const requestId = materialsRequestTrackerRef.current.begin(blockKey)
    try {
      const materials = await listLocalMaterials(blockKey)
      if (!materialsRequestTrackerRef.current.isCurrent(blockKey, requestId)) return
      setMaterialsByBlock((current) => setBlockMaterials(current, blockKey, materials))
      setLocalStorageEstimate(await estimateLocalStorage())
    } catch (loadError) {
      patchMaterialFeedback(blockKey, { error: loadError instanceof Error ? loadError.message : t('Could not load local materials.') })
    }
  }

  const activeMaterialRecord = findActiveMaterial(materialsByBlock, activeMaterial)
  const activeMaterialRecordRef = useRef<LocalMaterial | null>(null)
  const activeMaterialId = activeMaterialRecord?.id ?? null
  const activeMaterialSource = activeMaterialRecord?.source ?? null
  const activeMaterialStorage = activeMaterialRecord?.storage ?? null
  const activeMaterialSourceUrl = activeMaterialRecord?.url ?? null
  const activeMaterialHasBlob = Boolean(activeMaterialRecord?.blob)

  useEffect(() => {
    activeMaterialRecordRef.current = activeMaterialRecord
  })

  // Depends only on stable primitives so bookmark saves and list reloads keep the blob URL and A-B loop.
  useEffect(() => {
    const record = activeMaterialRecordRef.current
    if (!record) {
      setActiveMaterialUrl(null)
      setMediaError(null)
      setLoopStart(null)
      setLoopEnd(null)
      setIsLooping(false)
      setBookmarks([])
      return
    }

    setBookmarks(record.bookmarks ?? [])

    if (record.source === 'url') {
      setActiveMaterialUrl(record.url ?? null)
      setMediaError(null)
      setLoopStart(null)
      setLoopEnd(null)
      setIsLooping(false)
      return
    }

    if (!record.blob && record.storage !== 'cache') {
      setActiveMaterialUrl(null)
      setMediaError(null)
      setLoopStart(null)
      setLoopEnd(null)
      setIsLooping(false)
      return
    }

    let cancelled = false
    let objectUrl: string | null = null
    void loadLocalMaterialBlob(record).then((blob) => {
      if (cancelled || !blob) return
      const nextObjectUrl = URL.createObjectURL(blob)
      objectUrl = nextObjectUrl
      setActiveMaterialUrl(nextObjectUrl)
      setMediaError(null)
      setLoopStart(null)
      setLoopEnd(null)
      setIsLooping(false)
    }).catch((loadError) => {
      if (cancelled) return
      setActiveMaterialUrl(null)
      setMediaError(loadError instanceof Error ? loadError.message : t('Could not load the local material.'))
    })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [activeMaterialId, activeMaterialSource, activeMaterialStorage, activeMaterialSourceUrl, activeMaterialHasBlob])

  async function handleLocalMaterialUpload(blockKey: string, file: File | undefined) {
    if (!file) return
    patchMaterialFeedback(blockKey, { error: null, notice: null, saveState: 'saving' })
    const extension = file.name.split('.').pop()?.toLowerCase()
    const extensionType = extension === 'mp4' ? 'video/mp4' : extension === 'webm' ? 'video/webm' : extension === 'mov' ? 'video/quicktime' : ''
    const detectedType = extensionType || file.type
    const allowedTypes = ['application/pdf', 'image/', 'text/plain', 'video/']
    const isAllowed = allowedTypes.some((type) => type.endsWith('/') ? detectedType.startsWith(type) : detectedType === type)
    if (!isAllowed) {
      patchMaterialFeedback(blockKey, { error: t('Use a PDF, image, text, or video file.'), saveState: 'idle' })
      return
    }
    const storageEstimate = await estimateLocalStorage()
    if (storageEstimate.quota != null && storageEstimate.usage != null) {
      const availableBytes = storageEstimate.quota - storageEstimate.usage
      if (file.size > availableBytes) {
        patchMaterialFeedback(blockKey, { error: t('This file is larger than the browser storage currently available on this device.'), saveState: 'idle' })
        return
      }
    }

    if (detectedType.startsWith('video/')) {
      const probe = document.createElement('video')
      const support = probe.canPlayType(detectedType)
      if (!support) {
        patchMaterialFeedback(blockKey, { notice: t('This browser may not decode this video format. H.264/AAC MP4 or WebM/Opus is usually the most compatible.') })
      }
    }

    try {
      const materialId = crypto.randomUUID()
      await saveLocalMaterial({
        id: materialId,
        blockKey,
        name: file.name,
        type: detectedType,
        size: file.size,
        source: 'file',
        blob: file,
        createdAt: new Date().toISOString(),
      })
      await loadBlockMaterials(blockKey)
      setActiveMaterial(blockKey, materialId)
      patchMaterialFeedback(blockKey, { saveState: 'saved' })
      window.setTimeout(() => patchMaterialFeedback(blockKey, { saveState: 'idle' }), 2500)
    } catch (uploadError) {
      const isQuotaError = uploadError instanceof DOMException && uploadError.name === 'QuotaExceededError'
      patchMaterialFeedback(blockKey, {
        error: isQuotaError ? t('The browser storage quota was reached. Remove local materials or use another device.') : uploadError instanceof Error ? uploadError.message : t('Could not save the local material.'),
        saveState: 'idle',
      })
    }
  }

  async function addMaterialUrl(blockKey: string) {
    const value = (materialUrlInputs[blockKey] ?? '').trim()
    if (!value) return
    try {
      const youTubeEmbedUrl = toYouTubeEmbedUrl(value)
      if (!youTubeEmbedUrl && isYouTubeHostLink(value)) throw new Error(t('This YouTube link is not valid.'))
      const iframeSource = value.match(/src=["']([^"']+)["']/i)?.[1]
      let url: URL
      try {
        url = new URL(youTubeEmbedUrl ?? iframeSource ?? value)
      } catch {
        throw new Error(t('Enter a valid web URL.'))
      }
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error(t('Only HTTP and HTTPS URLs are supported.'))
      const materialId = crypto.randomUUID()
      await saveLocalMaterial({
        id: materialId,
        blockKey,
        name: youTubeEmbedUrl ? 'YouTube' : url.hostname,
        type: 'text/uri-list',
        size: 0,
        source: 'url',
        url: url.toString(),
        createdAt: new Date().toISOString(),
      })
      setMaterialUrlInputs((current) => ({ ...current, [blockKey]: '' }))
      patchMaterialFeedback(blockKey, { error: null, notice: null })
      await loadBlockMaterials(blockKey)
      setActiveMaterial(blockKey, materialId)
    } catch (urlError) {
      patchMaterialFeedback(blockKey, { error: urlError instanceof Error ? urlError.message : t('Enter a valid web URL.') })
    }
  }

  async function removeLearningMaterial(blockKey: string, id: string) {
    materialsRequestTrackerRef.current.begin(blockKey)
    try {
      await deleteLocalMaterial(id)
      setMaterialsByBlock((current) => removeBlockMaterial(current, blockKey, id))
      if (activeMaterial?.id === id) setActiveMaterialState(null)
      setLocalStorageEstimate(await estimateLocalStorage())
    } catch (removeError) {
      patchMaterialFeedback(blockKey, { error: removeError instanceof Error ? removeError.message : t('Could not remove the local material.') })
    }
  }

  function formatStorageSize(bytes: number | null) {
    if (bytes == null) return t('Storage estimate unavailable')
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

  async function saveBookmark() {
    const currentTime = videoRef.current?.currentTime
    if (!activeMaterial || !activeMaterialRecord || currentTime == null) return

    const nextBookmarks = [...new Set([...bookmarks, Number(currentTime.toFixed(1))])].sort((left, right) => left - right)
    await saveLocalMaterial({ ...activeMaterialRecord, blockKey: activeMaterial.blockKey, bookmarks: nextBookmarks })
    setBookmarks(nextBookmarks)
    setMaterialsByBlock((current) => updateBlockMaterial(current, activeMaterial.blockKey, activeMaterial.id, { bookmarks: nextBookmarks }))
  }

  async function removeBookmark(bookmark: number) {
    if (!activeMaterial || !activeMaterialRecord) return

    const nextBookmarks = bookmarks.filter((value) => value !== bookmark)
    await saveLocalMaterial({ ...activeMaterialRecord, blockKey: activeMaterial.blockKey, bookmarks: nextBookmarks })
    setBookmarks(nextBookmarks)
    setMaterialsByBlock((current) => updateBlockMaterial(current, activeMaterial.blockKey, activeMaterial.id, { bookmarks: nextBookmarks }))
  }

  function formatBookmarkTime(value: number) {
    const minutes = Math.floor(value / 60)
    const seconds = Math.floor(value % 60).toString().padStart(2, '0')
    return `${minutes}:${seconds}`
  }

  function getExternalMediaKind(material: LocalMaterial) {
    if (material.source !== 'url' || !material.url) return null
    const pathname = new URL(material.url).pathname.toLowerCase()
    if (isYouTubeEmbedUrl(new URL(material.url))) return 'embed'
    if (/\.(mp4|webm|ogg|mov)$/.test(pathname)) return 'video'
    if (/\.(png|jpe?g|gif|webp|avif)$/.test(pathname)) return 'image'
    if (/\.pdf$/.test(pathname)) return 'pdf'
    return 'page'
  }

  function getInlineMaterialUrl(material: LocalMaterial) {
    if (material.source !== 'url' || !material.url) return activeMaterialUrl

    const parsedUrl = new URL(material.url)
    if (!isYouTubeEmbedUrl(parsedUrl)) return material.url

    return toYouTubeIframeSrc(material.url)
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
    setIncludeDefaultExercises(data.include_default_exercises ?? true)
  }

  async function loadData(keep?: { date: string; weekId: string | null }) {
    if (!keep) setLoading(true)
    setError(null)

    const today = toLocalIsoDate()

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
    const keptWeek = keep?.weekId ? allWeeks.find((entry) => entry.id === keep.weekId) : undefined
    const currentWeek = keptWeek ?? allWeeks.find((entry) => entry.start_date <= today && entry.end_date >= today) ?? allWeeks[0] ?? null
    const currentWeekIndex = currentWeek ? allWeeks.findIndex((item) => item.id === currentWeek.id) : 0
    const allTemplates = (templatesResult.data ?? []) as BlockTemplate[]

    const dedupedTemplates = allTemplates.filter((template, index, array) => {
      return index === array.findIndex((candidate) => candidate.key === template.key)
    })

    const defaultDate = keep?.date ?? getDefaultDateForWeek(currentWeek ?? allWeeks[0] ?? null)
    const loadedSessions = (sessionsResult.data as SessionWithBlocks[]) ?? []
    const editorState = getSessionEditorState(defaultDate, dedupedTemplates, loadedSessions)

    setWeeks(allWeeks)
    setPlanWeek(currentWeek)
    setTodos(currentWeek ? ((todosResult.data ?? []) as Todo[]).filter((todo) => todo.week_id === currentWeek.id) : [])
    setProgramName((programsResult.data as Program[] | null)?.find((program) => program.id === currentWeek?.program_id)?.name ?? null)
    setSelectedWeekIndex(currentWeekIndex >= 0 ? currentWeekIndex : 0)
    setDate(defaultDate)
    setTemplates(dedupedTemplates)
    setComment(editorState.comment)
    setSelectedBlocks(editorState.selectedBlocks)
    setExpandedBlockIds(new Set())
    setRemovedBlock(null)
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
    return value === toLocalIsoDate()
  }

  function getDefaultDateForWeek(week: PlanWeek | null) {
    if (!week) return toLocalIsoDate()

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
    setComment(editorState.comment)
    setSelectedBlocks(editorState.selectedBlocks)
    setTimers(editorState.timers)
    setExpandedBlockIds(new Set())
    setRemovedBlock(null)
    setSelectedWeekIndex(weeks.findIndex((item) => item.id === week.id))
  }

  function handleSelectDay(nextDate: string) {
    setDate(nextDate)
    const editorState = getSessionEditorState(nextDate, templates, sessions)
    setComment(editorState.comment)
    setSelectedBlocks(editorState.selectedBlocks)
    setExpandedBlockIds(new Set())
    setRemovedBlock(null)
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
    setComment(editorState.comment)
    setSelectedBlocks(editorState.selectedBlocks)
    setTimers(editorState.timers)
    setExpandedBlockIds(new Set())
    setRemovedBlock(null)
  }

  function toggleBlock(templateId: string) {
    setSelectedBlocks((current) =>
      current.map((block) =>
        block.id === templateId ? { ...block, done: !block.done } : block
      )
    )
  }

  function toggleBlockDetails(templateId: string, blockKey: string) {
    const isOpening = !expandedBlockIds.has(templateId)
    setExpandedBlockIds(isOpening ? new Set([templateId]) : new Set())
    if (isOpening) {
      if (activeMaterial && activeMaterial.blockKey !== blockKey) setActiveMaterialState(null)
      if (activeDefaultMaterial && activeDefaultMaterial.blockKey !== blockKey) setActiveDefaultMaterial(null)
      void loadBlockMaterials(blockKey)
    }
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

  async function toggleTodoDone(index: number, done: boolean) {
    const todo = todos[index]
    if (!todo) return

    updateTodo(index, { done })
    if (todo.id.startsWith('draft-')) {
      if (todo.name.trim()) await saveTodo({ ...todo, done })
      return
    }

    setTodoError(null)
    const { error: todoUpdateError } = await supabase.from('todos').update({ done }).eq('id', todo.id)
    if (todoUpdateError) {
      setTodos((current) => current.map((item) => item.id === todo.id ? { ...item, done: todo.done } : item))
      setTodoError(t('Could not save the ToDo.'))
    }
  }

  async function saveTodo(todo: Todo) {
    const name = todo.name.trim()
    if (!name || !planWeek) return

    setTodoError(null)
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
        setTodoError(t('Could not save the ToDo.'))
        return
      }
      setTodos((current) => current.map((item) => item.id === todo.id ? data as Todo : item))
      return
    }

    const { data, error: todoError } = await supabase.from('todos').update(payload).eq('id', todo.id).select('*').single()
    if (todoError || !data) {
      setTodoError(t('Could not save the ToDo.'))
      return
    }
    setTodos((current) => current.map((item) => item.id === todo.id ? data as Todo : item))
  }

  async function removeTodo(index: number) {
    const todo = todos[index]
    if (!todo) return

    setTodos((current) => current.filter((item) => item.id !== todo.id))
    if (todo.id.startsWith('draft-')) return

    setTodoError(null)
    const { error: todoDeleteError } = await supabase.from('todos').delete().eq('id', todo.id)
    if (todoDeleteError) {
      setTodos((current) => [...current, todo].sort((a, b) => a.sort_order - b.sort_order))
      setTodoError(t('Could not save the ToDo.'))
    }
  }

  function addBlock(template: BlockTemplate) {
    if (selectedBlocks.some((block) => block.id === template.id)) return

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
    setIsBlockPickerOpen(false)
    setAnnouncement(t('{label} added', { label: template.label }))
    pendingFocusBlockIdRef.current = template.id
  }

  function clearRemovedBlockTimeout() {
    if (removedBlockTimeoutRef.current !== null) {
      window.clearTimeout(removedBlockTimeoutRef.current)
      removedBlockTimeoutRef.current = null
    }
  }

  function removeBlock(templateId: string) {
    const index = selectedBlocks.findIndex((block) => block.id === templateId)
    if (index < 0) return
    const block = selectedBlocks[index]
    const timer = timers[templateId]

    setSelectedBlocks((current) => current.filter((item) => item.id !== templateId))
    setExpandedBlockIds((current) => {
      const next = new Set(current)
      next.delete(templateId)
      return next
    })
    setTimers((current) => {
      const next = { ...current }
      delete next[templateId]
      return next
    })

    clearRemovedBlockTimeout()
    setRemovedBlock({ block, timer, index })
    removedBlockTimeoutRef.current = window.setTimeout(() => {
      setRemovedBlock(null)
      removedBlockTimeoutRef.current = null
    }, 5000)
    blocksSectionRef.current?.focus({ preventScroll: true })
  }

  function undoRemoveBlock() {
    if (!removedBlock) return
    const { block, timer, index } = removedBlock
    clearRemovedBlockTimeout()
    setRemovedBlock(null)
    setSelectedBlocks((current) => {
      if (current.some((item) => item.id === block.id)) return current
      const next = [...current]
      next.splice(Math.min(index, next.length), 0, block)
      return next
    })
    if (timer) setTimers((current) => ({ ...current, [block.id]: { ...timer, isRunning: false } }))
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
    setCurrentBeat(0)
  }

  async function toggleMetronome() {
    if (isMetronomePlaying) {
      stopMetronome()
      setIsMetronomePlaying(false)
      return
    }

    beatCounterRef.current = 0
    setIsMetronomePlaying(true)
    setIsMetronomeSettingsOpen(false)
  }

  function handleMetronomePointerDown() {
    metronomeHoldTriggeredRef.current = false
    metronomePointerDownRef.current = true
    metronomeHoldTimerRef.current = window.setTimeout(() => {
      metronomeHoldTimerRef.current = null
      metronomeHoldTriggeredRef.current = true
      openMetronomeSettings()
    }, 550)
  }

  function handleMetronomePointerUp() {
    metronomePointerDownRef.current = false
    if (metronomeHoldTimerRef.current !== null) {
      window.clearTimeout(metronomeHoldTimerRef.current)
      metronomeHoldTimerRef.current = null
    }
  }

  function handleMetronomeButtonClick() {
    if (metronomeHoldTriggeredRef.current) {
      metronomeHoldTriggeredRef.current = false
      return
    }

    if (isMetronomePlaying) {
      void toggleMetronome()
      return
    }

    void toggleMetronome()
  }

  function handleMetronomeContextMenu(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    if (metronomeHoldTimerRef.current !== null) {
      window.clearTimeout(metronomeHoldTimerRef.current)
      metronomeHoldTimerRef.current = null
    }
    // A press-initiated contextmenu must not also start/stop on release.
    if (metronomePointerDownRef.current) metronomeHoldTriggeredRef.current = true
    openMetronomeSettings()
  }

  function handleMetronomeKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    metronomeHoldTriggeredRef.current = false
    if (event.key !== 'Enter' || !event.shiftKey) return
    event.preventDefault()
    toggleMetronomeSettings()
  }

  function handleTunerPointerDown() {
    tunerHoldTriggeredRef.current = false
    tunerHoldTimerRef.current = window.setTimeout(() => {
      tunerHoldTriggeredRef.current = true
      openTuner()
    }, 550)
  }

  function handleTunerPointerUp() {
    if (tunerHoldTimerRef.current !== null) {
      window.clearTimeout(tunerHoldTimerRef.current)
      tunerHoldTimerRef.current = null
    }
  }

  function handleTunerButtonClick() {
    if (tunerHoldTriggeredRef.current) {
      tunerHoldTriggeredRef.current = false
      return
    }
    if (isTunerOpen) {
      setIsTunerOpen(false)
      return
    }
    openTuner()
  }

  function handleTunerContextMenu(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    openTuner()
  }

  function openMetronomeSettings() {
    lastToolButtonRef.current = metronomeButtonRef.current
    setIsTunerOpen(false)
    setIsMetronomeSettingsOpen(true)
  }

  function toggleMetronomeSettings() {
    lastToolButtonRef.current = metronomeButtonRef.current
    setIsTunerOpen(false)
    setIsMetronomeSettingsOpen((current) => !current)
  }

  function openTuner() {
    lastToolButtonRef.current = tunerButtonRef.current
    setIsMetronomeSettingsOpen(false)
    setIsTunerOpen(true)
  }

  const isToolPanelOpen = isMetronomeSettingsOpen || isTunerOpen

  useEffect(() => {
    if (!isToolPanelOpen) return

    toolPanelRef.current?.focus({ preventScroll: true })

    function closePanels() {
      setIsMetronomeSettingsOpen(false)
      setIsTunerOpen(false)
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (metronomeButtonRef.current?.contains(target) || tunerButtonRef.current?.contains(target) || toolPanelRef.current?.contains(target)) return
      closePanels()
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      closePanels()
      lastToolButtonRef.current?.focus()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isToolPanelOpen])

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
    setCurrentBeat(beatCounterRef.current % beatsPerMeasureRef.current)
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
    if (!canSave) return
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
          total_minutes: totalBlockMinutes,
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

    const blockSavePlan = planSessionBlockSave(sessionData.id, selectedBlocks.map((block) => ({
      key: block.key,
      label: block.label,
      done: block.done,
      targetMinutes: block.targetMinutes,
      actualMinutes: block.actualMinutes,
      elapsedSeconds: timers[block.id]?.elapsedSeconds,
    })))
    const blocksRemovalQuery = supabase
      .from('session_blocks')
      .delete()
      .eq('session_id', sessionData.id)

    const { error: blocksRemovalError } = blockSavePlan.blockKeysToKeep.length > 0
      ? await blocksRemovalQuery.not('block_key', 'in', `(${blockSavePlan.blockKeysToKeep.join(',')})`)
      : await blocksRemovalQuery

    if (blocksRemovalError) {
      setError(blocksRemovalError.message)
      setSaving(false)
      return
    }

    if (blockSavePlan.upserts.length > 0) {
      const { error: blocksError } = await supabase
        .from('session_blocks')
        .upsert(blockSavePlan.upserts, { onConflict: 'session_id,block_key' })

      if (blocksError) {
        setError(blocksError.message)
        setSaving(false)
        return
      }
    }

    await loadData({ date, weekId: planWeek?.id ?? null })
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
  const todayDate = toLocalIsoDate()
  const isPastDay = date < todayDate
  const savedForDate = hasSavedSession(date, sessions)
  const isDirty = isSessionEditorDirty(getSessionEditorState(date, templates, sessions), { comment, timers, selectedBlocks })
  const canSave = selectedBlocks.length > 0 || savedForDate
  const availableTemplates = templates.filter((template) => !selectedBlocks.some((block) => block.id === template.id))
  const todosDone = todos.filter((todo) => todo.done).length

  function confirmDiscard(action: () => void) {
    if (isDirty) setPendingDiscardAction({ run: action })
    else action()
  }

  function renderBlockPicker(options: BlockTemplate[]) {
    return (
      <ul aria-label={t('Practice blocks')} className="mt-3 space-y-2">
        {options.map((template) => (
          <li key={template.id}>
            <button
              type="button"
              onClick={() => addBlock(template)}
              className="flex min-h-14 w-full items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-950 px-4 text-left text-base text-slate-100 transition hover:border-sky-500"
            >
              <span className="min-w-0">{template.label}</span>
              {template.target_minutes != null && (
                <span className="shrink-0 text-sm text-slate-400">{t('{minutes} min', { minutes: template.target_minutes })}</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    )
  }

  function closeBlockPicker() {
    setIsBlockPickerOpen(false)
    addBlockButtonRef.current?.focus()
  }

  useEffect(() => {
    if (!isDirty) return
    function warnBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [isDirty])

  useEffect(() => {
    const blockId = pendingFocusBlockIdRef.current
    if (!blockId) return
    const header = document.getElementById(`block-header-${blockId}`)
    if (!header) return
    pendingFocusBlockIdRef.current = null
    header.focus({ preventScroll: true })
    header.scrollIntoView({ block: 'nearest' })
  }, [selectedBlocks])

  useEffect(() => {
    if (!isBlockPickerOpen) return
    const sheet = blockSheetRef.current
    const getFocusable = () => Array.from(sheet?.querySelectorAll<HTMLElement>('button:not([disabled])') ?? [])
    getFocusable()[0]?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setIsBlockPickerOpen(false)
        addBlockButtonRef.current?.focus()
        return
      }
      if (event.key !== 'Tab') return
      const items = getFocusable()
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (!sheet?.contains(active)) {
        event.preventDefault()
        first.focus()
      } else if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isBlockPickerOpen])

  useEffect(() => {
    if (pendingDiscardAction) discardPromptRef.current?.focus()
  }, [pendingDiscardAction])

  useEffect(() => {
    if (message) messageRef.current?.focus()
  }, [message])

  useEffect(() => {
    const strip = dayStripRef.current
    const selectedDay = strip?.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (!strip || !selectedDay) return
    strip.scrollLeft = selectedDay.offsetLeft - (strip.clientWidth - selectedDay.offsetWidth) / 2
  }, [loading, date, planWeek?.id])

  useEffect(() => () => {
    if (removedBlockTimeoutRef.current !== null) window.clearTimeout(removedBlockTimeoutRef.current)
  }, [])

  if (loading) {
    return <p className="text-sm text-slate-400">{t('Loading…')}</p>
  }

  return (
    <div className="mx-auto min-w-0 max-w-3xl [&_input]:scroll-mt-[calc(var(--app-header-h)+4rem)] [&_select]:scroll-mt-[calc(var(--app-header-h)+4rem)] [&_textarea]:scroll-mt-[calc(var(--app-header-h)+4rem)]">
      {headerSlots.actions && createPortal(
        <>
            <button
              type="button"
              ref={metronomeButtonRef}
              onPointerDown={handleMetronomePointerDown}
              onPointerUp={handleMetronomePointerUp}
              onPointerCancel={handleMetronomePointerUp}
              onContextMenu={handleMetronomeContextMenu}
              onKeyDown={handleMetronomeKeyDown}
              onClick={handleMetronomeButtonClick}
              aria-label={t(isMetronomePlaying ? 'Playing' : 'Metronome')}
              aria-haspopup="true"
              aria-expanded={isMetronomeSettingsOpen}
              aria-keyshortcuts="Shift+Enter Shift+F10"
              title={t('Metronome')}
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-200"
              style={{
                background: `conic-gradient(from -90deg, ${Array.from({ length: beatsPerMeasure }, (_, index) => {
                  const segment = 360 / beatsPerMeasure
                  const start = index * segment + 3
                  const end = (index + 1) * segment - 3
                  const color = isMetronomePlaying && index === currentBeat ? '#38bdf8' : 'rgba(71, 85, 105, 0.85)'
                  return `${color} ${start}deg ${end}deg, transparent ${end}deg ${(index + 1) * segment}deg`
                }).join(', ')})`,
              }}
            >
              <span className="absolute inset-[3px] flex items-center justify-center rounded-full bg-slate-950">
                <MetronomeIcon className="h-6 w-auto" />
              </span>
            </button>
          <button
            type="button"
            ref={tunerButtonRef}
            aria-expanded={isTunerOpen}
            aria-label={t('Tuner')}
            onPointerDown={handleTunerPointerDown}
            onPointerUp={handleTunerPointerUp}
            onPointerCancel={handleTunerPointerUp}
            onContextMenu={handleTunerContextMenu}
            onClick={handleTunerButtonClick}
            title={t('Tuner')}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-950 text-slate-200"
          >
            <TuningForkIcon className="h-6 w-auto" />
          </button>
        </>,
        headerSlots.actions,
      )}

        {headerSlots.panel && isToolPanelOpen && createPortal(<div ref={toolPanelRef} tabIndex={-1} role="group" aria-label={t(isTunerOpen ? 'Tuner' : 'Metronome settings')} className="mx-auto max-h-[60dvh] max-w-6xl overflow-x-auto overflow-y-auto border-b border-slate-800 bg-slate-900 p-3 shadow-lg shadow-slate-950/30 focus:outline-none">
              {isMetronomeSettingsOpen && <div className="flex flex-wrap items-end justify-center gap-2">
                <label className="text-xs text-slate-400">
                  BPM
                  <input
                    type="number"
                    min="40"
                    max="220"
                    value={bpmInput}
                    onChange={(event) => handleBpmChange(event.target.value)}
                    onBlur={handleBpmBlur}
                    className="mt-1 h-11 w-20 rounded border border-slate-700 bg-slate-950 px-2 text-base text-slate-200"
                  />
                </label>

                <label className="text-xs text-slate-400">
                  {t('Time')}
                  <select
                    value={timeSignatureMode}
                    onChange={(event) => handleTimeSignatureChange(event.target.value as '3/4' | '4/4' | '5/4' | 'custom')}
                    className="mt-1 h-11 rounded border border-slate-700 bg-slate-950 px-2 text-base text-slate-200"
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
                        className="mt-1 h-11 w-16 rounded border border-slate-700 bg-slate-950 px-2 text-base text-slate-200"
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
                        className="mt-1 h-11 w-16 rounded border border-slate-700 bg-slate-950 px-2 text-base text-slate-200"
                      />
                    </label>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleTapTempo}
                  className="h-11 rounded border border-slate-700 px-4 text-sm text-slate-300"
                >
                  {t('Tap')}
                </button>
                <button
                  type="button"
                  onClick={() => { void toggleMetronome() }}
                  className="h-11 rounded bg-slate-100 px-4 text-sm font-medium text-slate-900"
                >
                  {isMetronomePlaying ? t('Stop') : t('Start')}
                </button>
              </div>}
              {isTunerOpen && (
                <div>
                  <select
                    value={tuningKey}
                    onChange={(event) => {
                      stopReferenceTone()
                      setTuningKey(event.target.value as TuningKey)
                    }}
                    className="h-11 w-full rounded border border-slate-700 bg-slate-950 px-2 text-base text-slate-200"
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
                        className="min-h-11 min-w-0 break-words rounded border border-slate-700 px-2 text-sm text-slate-300 transition hover:border-sky-500 hover:text-sky-200"
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
                    className="mt-2 min-h-11 w-full rounded border border-slate-700 px-2 text-sm text-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t('Stop tone')}
                  </button>
                </div>
              )}
            </div>, headerSlots.panel)}

      <p aria-live="polite" className="sr-only">{announcement}</p>

      {pendingDiscardAction && (
        <div ref={discardPromptRef} tabIndex={-1} role="alert" className="mt-3 rounded border border-amber-500/50 bg-amber-500/10 p-3 focus:outline-none">
          <p className="text-sm font-medium text-amber-100">{t('Discard changes?')}</p>
          <p className="mt-1 text-sm text-slate-300">{t('Unsaved changes will be lost.')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => { const action = pendingDiscardAction; setPendingDiscardAction(null); action.run() }}
              className="min-h-11 rounded bg-slate-100 px-4 text-sm font-medium text-slate-900"
            >
              {t('Discard')}
            </button>
            <button
              type="button"
              onClick={() => setPendingDiscardAction(null)}
              className="min-h-11 rounded border border-slate-600 px-4 text-sm text-slate-200"
            >
              {t('Keep editing')}
            </button>
          </div>
        </div>
      )}

      <section className="py-4">
        <h1 className="text-xl font-semibold">{t('Session {date}', { date: formatHeadingDate(date, language) })}</h1>

        <div className="mt-3">
          <label htmlFor="practice-week-select" className="block text-xs text-slate-400">{t('Jump to')}</label>
          <select
            id="practice-week-select"
            value={planWeek?.id ?? ''}
            onChange={(event) => {
              const targetWeek = weeks.find((weekItem) => weekItem.id === event.target.value)
              if (targetWeek) confirmDiscard(() => handleSelectWeek(targetWeek))
            }}
            className="mt-1 h-11 w-full rounded border border-slate-700 bg-slate-950 px-3 text-base text-slate-200 focus:border-slate-500"
          >
            {weeks.map((weekItem) => (
              <option key={weekItem.id} value={weekItem.id}>
                {t('Week {week}', { week: weekItem.week_number })} · {formatDateRange(weekItem.start_date, weekItem.end_date, language)}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => setIsWeekStripOpen((current) => !current)}
          aria-expanded={isWeekStripOpen}
          aria-controls="practice-week-strip"
          className="mt-1 flex min-h-11 w-full items-center justify-between gap-2 text-left text-sm text-slate-300"
        >
          <span>{t('Practice weeks')}</span>
          <span className="text-sm text-slate-400">{t(isWeekStripOpen ? 'Hide' : 'Show')}</span>
        </button>

        {isWeekStripOpen && (
          <div id="practice-week-strip" className="mb-2 flex flex-wrap gap-3">
            {visibleWeeks.map((weekItem) => {
              const isCurrentWeek = weekItem.start_date <= todayDate && weekItem.end_date >= todayDate
              const isSelected = weekItem.id === (planWeek?.id ?? weeks[selectedWeekIndex]?.id)

              return (
                <button
                  key={weekItem.id}
                  type="button"
                  onClick={() => confirmDiscard(() => handleSelectWeek(weekItem))}
                  aria-pressed={isSelected}
                  className={`min-h-11 min-w-[150px] flex-1 rounded-lg border p-3 text-left transition ${
                    isSelected
                      ? 'border-sky-500 bg-sky-500/10 text-sky-100'
                      : 'border-slate-700 bg-slate-950/80 text-slate-200 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{t('Week {week}', { week: weekItem.week_number })}</p>
                    {isCurrentWeek && (
                      <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium uppercase tracking-[0.18em] text-emerald-300">
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
        )}

        <div className="mt-2 flex items-center justify-between gap-3">
          <h2 className="min-w-0 truncate text-base font-semibold text-slate-100">{planWeek?.focus ?? t('No week selected')}</h2>
          {planWeek && planWeek.start_date <= todayDate && planWeek.end_date >= todayDate && (
            <span className="shrink-0 rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 text-xs font-medium uppercase tracking-[0.18em] text-sky-300">
              {t('Current week')}
            </span>
          )}
        </div>
        <p className="text-sm text-slate-400">
          {programName ?? '—'} · {planWeek ? formatDateRange(planWeek.start_date, planWeek.end_date, language) : '—'}
        </p>
        <button
          type="button"
          onClick={() => setIsWeekDetailsOpen((current) => !current)}
          aria-expanded={isWeekDetailsOpen}
          aria-controls="practice-week-details"
          className="flex min-h-11 w-full items-center justify-between gap-2 text-left text-sm text-slate-300"
        >
          <span>{t('Week description')}</span>
          <span className="text-sm text-slate-400">{t(isWeekDetailsOpen ? 'Hide' : 'Show')}</span>
        </button>
        {isWeekDetailsOpen && (
          <p id="practice-week-details" className="whitespace-pre-wrap pb-2 text-sm text-slate-300">
            {planWeek?.tasks?.trim() || t('No description recorded for this week yet.')}
          </p>
        )}

        <div data-tour="practice-day-blocks" role="group" aria-label={t('Days in selected week')} className="mt-2">
          <div ref={dayStripRef} className="relative flex snap-x gap-2 overflow-x-auto pb-1">
            {selectedWeekDates.map((day) => {
              const isSelectedDay = day === date
              const isToday = day === todayDate
              const isCompleted = day < todayDate && sessions.some((session) => session.session_date === day)
              const dayDate = new Date(`${day}T00:00:00`)
              const fullDate = dayDate.toLocaleDateString(localeForLanguage(language), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => confirmDiscard(() => handleSelectDay(day))}
                  aria-pressed={isSelectedDay}
                  aria-current={isToday ? 'date' : undefined}
                  aria-label={[fullDate, isToday ? t('Today') : null, isCompleted ? t('Done') : null].filter(Boolean).join(', ')}
                  className={`relative min-h-14 min-w-[5.5rem] flex-1 shrink-0 snap-center rounded-lg border px-1.5 py-1.5 text-center transition ${
                    isSelectedDay
                      ? 'border-sky-500 bg-sky-500/10 text-sky-100'
                      : isCompleted
                        ? 'border-emerald-500/50 bg-emerald-500/5 text-emerald-100'
                        : 'border-slate-700 bg-slate-950/70 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {isToday && <span aria-hidden="true" className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-slate-950" />}
                  <span className="block text-xs uppercase tracking-wide text-slate-400">
                    {dayDate.toLocaleDateString(localeForLanguage(language), { weekday: 'short' })}
                  </span>
                  <span className="block text-base font-medium">{dayDate.getDate()}</span>
                  <span className="block whitespace-nowrap text-xs leading-4 text-slate-400">
                    {isToday ? t('Today') : isCompleted ? '✓' : '\u00a0'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <section
        ref={blocksSectionRef}
        tabIndex={-1}
        aria-labelledby="practice-blocks-heading"
        className="border-t border-slate-800 py-4 focus:outline-none"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="practice-blocks-heading" className="text-lg font-semibold text-slate-100">{formatHeadingDate(date, language)}</h2>
          {isTodayDate(date) && (
            <span className="shrink-0 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium uppercase tracking-[0.18em] text-emerald-300">
              {t('Today')}
            </span>
          )}
        </div>
        <p className="text-sm text-slate-400">{t('Practice time')}: {t('{minutes} min', { minutes: totalBlockMinutes })}</p>

        {selectedBlocks.length === 0 && (
          <div data-tour="practice-block-picker" className="mt-3">
            <p className="text-base font-medium text-slate-100">{t('No blocks yet')}</p>
            <p className="mt-1 text-sm text-slate-400">
              {isPastDay && !savedForDate ? t('No practice was logged for this day.') : t('Choose what to practice first.')}
            </p>
            {renderBlockPicker(templates)}
          </div>
        )}

        <div className="mt-3">
            {selectedBlocks.map((selected) => {
              const template = templates.find((item) => item.id === selected.id)

              if (!template) return null

              const elapsedSeconds = timers[template.id]?.elapsedSeconds ?? 0
              const timerMinutes = Math.floor(elapsedSeconds / 60)
              const timerSeconds = elapsedSeconds % 60
              const isExpanded = expandedBlockIds.has(template.id)
              const defaultMaterials = getDefaultMaterials(language, template.key)
              const blockMaterials = materialsByBlock[template.key] ?? []
              const blockFeedback = materialFeedback[template.key] ?? emptyMaterialFeedback

              return (
                <div key={template.id} className="border-b border-slate-800 py-1">
                  <div className="min-w-0">
                    <div className="flex min-h-14 items-center">
                      <label className="flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center">
                        <input
                          type="checkbox"
                          checked={selected.done}
                          onChange={() => toggleBlock(template.id)}
                          aria-label={template.label}
                          className="h-5 w-5 rounded border-slate-700 bg-slate-950"
                        />
                      </label>
                      <h3 className="min-w-0 flex-1">
                        <button
                          type="button"
                          id={`block-header-${template.id}`}
                          aria-expanded={isExpanded}
                          onClick={() => toggleBlockDetails(template.id, template.key)}
                          className="flex min-h-14 w-full min-w-0 scroll-mt-32 items-center justify-between gap-2 rounded-lg px-2 text-left transition hover:bg-slate-800/60 active:bg-slate-800"
                        >
                          <span className="min-w-0 break-words text-base font-semibold text-slate-100">{template.label}</span>
                          <span className="flex shrink-0 items-center gap-1 text-xs text-slate-400">
                            {t('Details')}
                            <svg aria-hidden="true" viewBox="0 0 20 20" className={`h-5 w-5 shrink-0 text-slate-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M5 8l5 5 5-5" />
                            </svg>
                          </span>
                        </button>
                      </h3>
                      <button
                        type="button"
                        onClick={() => removeBlock(template.id)}
                        aria-label={t('Remove block')}
                        title={t('Remove block')}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                      >
                        <span aria-hidden="true" className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 transition hover:bg-rose-400">
                          <span className="relative block h-2.5 w-2.5">
                            <span className="absolute left-1/2 top-1/2 h-0.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-full bg-slate-950" />
                            <span className="absolute left-1/2 top-1/2 h-0.5 w-2.5 -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full bg-slate-950" />
                          </span>
                        </span>
                      </button>
                    </div>
                    {!isExpanded && <div className="flex min-h-11 flex-wrap items-center gap-x-3 pl-11 text-sm text-slate-300">
                      {showTargetPracticeTime && <span>{t('Target: {minutes} min', { minutes: template.target_minutes ?? 0 })}</span>}
                      <span className="font-mono" aria-label={t('Timer')}>{String(timerMinutes).padStart(2, '0')}:{String(timerSeconds).padStart(2, '0')}</span>
                      <button
                        type="button"
                        onClick={() => toggleTimer(template.id)}
                        className="min-h-11 min-w-11 rounded px-3 text-sm font-medium text-sky-300 hover:text-sky-100"
                      >
                        {timers[template.id]?.isRunning ? t('Pause') : t('Start')}
                      </button>
                    </div>}

                    {isExpanded && (
                      <div className="ml-3 min-w-0 pb-3">
                        <p className="text-sm text-slate-300">
                          {template.description?.trim() || t('No description available for this practice block.')}
                        </p>
                        {showTargetPracticeTime && <p className="mt-1 text-sm text-slate-400">{t('Target: {minutes} min', { minutes: template.target_minutes ?? 0 })}</p>}
                        <fieldset className="mt-3 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-300">
                          <legend className="sr-only">{t('Timer')}</legend>
                          <button
                            type="button"
                            onClick={() => toggleTimer(template.id)}
                            className="min-h-11 rounded bg-slate-800 px-4 text-sm font-medium text-slate-200"
                          >
                            {timers[template.id]?.isRunning ? t('Pause') : t('Start')}
                          </button>
                          <button
                            type="button"
                            onClick={() => resetTimer(template.id)}
                            className="min-h-11 rounded border border-slate-700 px-4 text-sm text-slate-300"
                          >
                            {t('Reset')}
                          </button>
                          <input
                            type="number"
                            min="0"
                            inputMode="numeric"
                            aria-label={t('{block} timer minutes', { block: template.label })}
                            value={timerMinutes}
                            onChange={(event) => updateTimerPart(template.id, 'minutes', event.target.value)}
                            className="h-11 w-16 rounded border border-slate-700 bg-slate-950 px-2 text-center font-mono text-base text-slate-200"
                          />
                          <span className="font-mono text-base text-slate-300">:</span>
                          <input
                            type="number"
                            min="0"
                            max="59"
                            inputMode="numeric"
                            aria-label={t('{block} timer seconds', { block: template.label })}
                            value={timerSeconds.toString().padStart(2, '0')}
                            onChange={(event) => updateTimerPart(template.id, 'seconds', event.target.value)}
                            className="h-11 w-16 rounded border border-slate-700 bg-slate-950 px-2 text-center font-mono text-base text-slate-200"
                          />
                        </fieldset>
                        {includeDefaultExercises && defaultMaterials.length > 0 && (
                          <div className="mt-3 space-y-1 border-t border-slate-800 pt-3">
                            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{t('Default references')}</p>
                            {defaultMaterials.map((material) => (
                              <div key={material.title} className="min-w-0 py-1">
                                <div className="flex min-h-11 items-center justify-between gap-2">
                                  <p className="min-w-0 break-words text-sm font-medium text-slate-200">{material.title}</p>
                                  {material.filePath && (
                                    <button type="button" onClick={() => { setActiveMaterialState(null); setActiveDefaultMaterial(activeDefaultMaterial?.blockKey === template.key && activeDefaultMaterial.url === material.filePath ? null : { blockKey: template.key, title: material.title, url: material.filePath ?? '' }) }} className="min-h-11 min-w-11 shrink-0 px-2 text-sm text-sky-300 hover:text-sky-100">
                                      {activeDefaultMaterial?.blockKey === template.key && activeDefaultMaterial.url === material.filePath ? t('Close') : t('Open PDF')}
                                    </button>
                                  )}
                                </div>
                                <p className="break-words text-sm leading-relaxed text-slate-400">{material.detail}</p>
                                {material.filePath && activeDefaultMaterial?.blockKey === template.key && activeDefaultMaterial.url === material.filePath && (
                                  <div className="mt-2 overflow-hidden bg-slate-950">
                                    <object data={encodeURI(material.filePath)} type="application/pdf" aria-label={material.title} className="h-[420px] w-full bg-white">
                                      <p className="p-3 text-sm text-slate-700">{t('If the PDF does not appear, your browser cannot show it inline.')}</p>
                                    </object>
                                    <a href={encodeURI(material.filePath)} target="_blank" rel="noreferrer" className="flex min-h-11 items-center text-sm text-sky-300 hover:text-sky-200">
                                      {t('Open in new tab')}
                                    </a>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {(
                          <div className="mt-3 min-w-0 space-y-2 border-t border-slate-800 pt-3">
                            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                              {t('Materials stay on this device')}
                            </p>
                            <p className="text-xs text-slate-400">
                              {t('Local storage: {used} used', { used: formatStorageSize(localStorageEstimate.usage) })}
                              {localStorageEstimate.quota != null ? ` ${t('of {quota}', { quota: formatStorageSize(localStorageEstimate.quota) })}` : ''}
                            </p>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                              <button
                                type="button"
                                onClick={() => materialFileInputRefs.current[template.key]?.click()}
                                className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded border border-slate-700 bg-slate-800 px-3 text-sm text-slate-100 hover:border-slate-500"
                              >
                                {t('Choose file')}
                              </button>
                              <input
                                ref={(element) => { materialFileInputRefs.current[template.key] = element }}
                                id={`learning-material-file-${template.key}`}
                                type="file"
                                accept="application/pdf,image/*,text/plain,video/*"
                                onChange={(event) => { void handleLocalMaterialUpload(template.key, event.target.files?.[0]); event.currentTarget.value = '' }}
                                className="sr-only"
                              />
                              {blockFeedback.saveState !== 'idle' && (
                                <span className={`text-sm ${blockFeedback.saveState === 'saved' ? 'text-emerald-300' : 'text-slate-400'}`}>
                                  {blockFeedback.saveState === 'saving' ? t('Saving locally…') : t('Saved on this device')}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <input
                                type="url"
                                value={materialUrlInputs[template.key] ?? ''}
                                onChange={(event) => setMaterialUrlInputs((current) => ({ ...current, [template.key]: event.target.value }))}
                                placeholder={t('Material URL')}
                                className="h-11 min-w-0 flex-1 rounded border border-slate-700 bg-slate-950 px-2 text-base text-slate-200"
                              />
                              <button
                                type="button"
                                onClick={() => { void addMaterialUrl(template.key) }}
                                className="min-h-11 rounded border border-slate-700 px-3 text-sm text-slate-300"
                              >
                                {t('Add URL')}
                              </button>
                            </div>
                            {blockMaterials.length > 0 && (
                              <div>
                                {blockMaterials.map((material) => (
                                  <div key={material.id} className="flex min-h-11 items-center justify-between gap-2 text-sm">
                                    <button
                                      type="button"
                                      onClick={() => setActiveMaterial(template.key, material.id)}
                                      className={`min-h-11 min-w-0 flex-1 truncate text-left hover:text-sky-200 ${activeMaterial?.blockKey === template.key && activeMaterial.id === material.id ? 'text-sky-200' : 'text-sky-300'}`}
                                    >
                                      {material.name}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => { void removeLearningMaterial(template.key, material.id) }}
                                      className="min-h-11 min-w-11 shrink-0 px-2 text-rose-300"
                                    >
                                      {t('Remove')}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                            {activeMaterial?.blockKey === template.key && activeMaterialUrl && (() => {
                              const activeMaterial = activeMaterialRecord
                              if (!activeMaterial) return null
                              const isVideo = activeMaterial.type.startsWith('video/')
                              const isImage = activeMaterial.type.startsWith('image/')
                              const externalMediaKind = getExternalMediaKind(activeMaterial)
                              const isExternalPage = externalMediaKind === 'page'
                              const inlineMaterialUrl = getInlineMaterialUrl(activeMaterial)

                              return (
                                <div className="mt-3 overflow-hidden bg-slate-950">
                                  <div className="flex items-center justify-between gap-2 px-2">
                                    <span className="min-w-0 truncate text-sm text-slate-300">{activeMaterial.name}</span>
                                    <button
                                      type="button"
                                      onClick={() => setActiveMaterialState(null)}
                                      className="min-h-11 min-w-11 shrink-0 px-2 text-sm text-slate-300 hover:text-slate-100"
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
                                      loading="lazy"
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
                                        key={`${activeMaterial.id}-${activeMaterial.type}`}
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
                                      <div className="space-y-2 py-2">
                                        <div className="flex items-center justify-between gap-2">
                                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{t('Bookmarks')}</p>
                                          <button
                                            type="button"
                                            onClick={() => { void saveBookmark() }}
                                            className="min-h-11 rounded border border-slate-700 px-3 text-sm text-slate-300"
                                          >
                                            {t('Save position')}
                                          </button>
                                        </div>
                                        {bookmarks.length > 0 ? (
                                          <div className="flex flex-wrap gap-2">
                                            {bookmarks.map((bookmark) => (
                                              <span key={bookmark} className="inline-flex items-center rounded border border-slate-700 bg-slate-950 text-sm text-slate-300">
                                                <button type="button" onClick={() => { if (videoRef.current) videoRef.current.currentTime = bookmark }} className="min-h-11 px-3 text-sky-300 hover:text-sky-100">
                                                  {formatBookmarkTime(bookmark)}
                                                </button>
                                                <button type="button" onClick={() => { void removeBookmark(bookmark) }} aria-label={t('Remove bookmark')} className="min-h-11 min-w-11 text-slate-300 hover:text-rose-300">
                                                  ×
                                                </button>
                                              </span>
                                            ))}
                                          </div>
                                        ) : (
                                          <p className="text-sm text-slate-400">{t('No bookmarks yet')}</p>
                                        )}
                                      </div>
                                      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
                                        <button
                                          type="button"
                                          onClick={() => setLoopPoint('start')}
                                          className="min-h-11 rounded border border-slate-700 px-3 hover:border-sky-500"
                                        >
                                          {t('Set A')} {loopStart == null ? '' : `(${loopStart.toFixed(1)}s)`}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setLoopPoint('end')}
                                          className="min-h-11 rounded border border-slate-700 px-3 hover:border-sky-500"
                                        >
                                          {t('Set B')} {loopEnd == null ? '' : `(${loopEnd.toFixed(1)}s)`}
                                        </button>
                                        <button
                                          type="button"
                                          disabled={loopStart == null || loopEnd == null || loopEnd <= loopStart}
                                          onClick={() => setIsLooping((current) => !current)}
                                          className="min-h-11 rounded border border-slate-700 px-3 hover:border-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                          {isLooping ? t('Looping') : t('Loop A-B')}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={clearLoop}
                                          className="min-h-11 rounded border border-slate-700 px-3 text-slate-300 hover:text-slate-100"
                                        >
                                          {t('Clear')}
                                        </button>
                                      </div>
                                      {activeMaterial.source === 'file' && (
                                        <div>
                                          <p className="mb-1 text-xs text-slate-400">{t('Audio track fallback')}</p>
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
                                  ) : activeMaterial.type === 'application/pdf' || externalMediaKind === 'pdf' ? (
                                    <div>
                                      <object data={activeMaterialUrl} type="application/pdf" aria-label={activeMaterial.name} className="h-[420px] w-full bg-white">
                                        <p className="p-3 text-xs text-slate-700">{t('If the PDF does not appear, your browser cannot show it inline.')}</p>
                                      </object>
                                      <a href={activeMaterialUrl} target="_blank" rel="noreferrer" className="flex min-h-11 items-center text-sm text-sky-300 hover:text-sky-200">
                                        {t('Open in new tab')}
                                      </a>
                                    </div>
                                  ) : (
                                    <iframe
                                      src={activeMaterialUrl}
                                      title={activeMaterial.name}
                                      className="h-[420px] w-full bg-white"
                                    />
                                  )}
                                  {externalMediaKind === 'embed' && activeMaterial.url && (
                                    <a
                                      href={toYouTubeWatchUrl(activeMaterial.url) ?? activeMaterial.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex min-h-11 items-center text-sm text-sky-300 hover:text-sky-200"
                                    >
                                      {t('Playback trouble? Open on YouTube')}
                                    </a>
                                  )}
                                  {mediaError && <p className="py-2 text-sm text-rose-300">{mediaError}</p>}
                                </div>
                              )
                            })()}
                            {blockFeedback.error && <p className="break-words text-sm text-rose-300">{blockFeedback.error}</p>}
                            {blockFeedback.notice && <p className="break-words text-sm text-amber-300">{blockFeedback.notice}</p>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        <div aria-live="polite">
          {removedBlock && (
            <div className="mt-3 flex min-h-11 items-center justify-between gap-3 rounded border border-slate-700 bg-slate-900 pl-3">
              <span className="text-sm text-slate-200">{t('Block removed')}</span>
              <button type="button" onClick={undoRemoveBlock} className="min-h-11 px-4 text-sm font-medium text-sky-300 hover:text-sky-100">
                {t('Undo')}
              </button>
            </div>
          )}
        </div>

        {selectedBlocks.length > 0 && (
          <div data-tour="practice-block-picker" className="mt-3">
            {availableTemplates.length > 0 && (
              <button
                ref={addBlockButtonRef}
                type="button"
                aria-haspopup="dialog"
                onClick={() => setIsBlockPickerOpen(true)}
                className="flex h-12 w-full items-center justify-center rounded-lg border border-dashed border-slate-600 text-sm font-medium text-slate-200 hover:border-sky-500"
              >
                + {t('Add another block')}
              </button>
            )}
          </div>
        )}

        {isBlockPickerOpen && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70"
            onClick={(event) => { if (event.target === event.currentTarget) closeBlockPicker() }}
          >
            <div
              ref={blockSheetRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="practice-block-sheet-title"
              className="max-h-[80dvh] w-full max-w-3xl overflow-y-auto rounded-t-xl border-t border-slate-700 bg-slate-900 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 id="practice-block-sheet-title" className="text-lg font-semibold text-slate-100">{t('Add a block')}</h2>
                <button type="button" onClick={closeBlockPicker} className="min-h-11 min-w-11 rounded px-3 text-sm text-slate-300 hover:text-white">
                  {t('Close')}
                </button>
              </div>
              {renderBlockPicker(availableTemplates)}
            </div>
          </div>
        )}
      </section>

      <form onSubmit={handleSubmit} className="space-y-4 border-t border-slate-800 py-4">
        <label className="block space-y-1 text-sm">
          <span className="block text-slate-300">{t('Notes')}</span>
          <textarea
            rows={3}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-base"
            placeholder={t('What did you work on?')}
          />
        </label>

        {message && <p ref={messageRef} tabIndex={-1} role="status" className="msg-success focus:outline-none">{message}</p>}
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          data-tour="practice-save"
          disabled={saving}
          aria-disabled={!canSave || saving}
          aria-describedby={canSave ? undefined : 'practice-save-hint'}
          className={`min-h-11 w-full rounded bg-slate-100 px-4 font-medium text-slate-900 disabled:opacity-50 sm:w-auto ${canSave ? '' : 'cursor-not-allowed opacity-50'}`}
        >
          {saving ? t('Saving…') : t(selectedBlocks.length === 0 && savedForDate ? 'Save changes' : 'Save session')}
        </button>
        {!canSave && <p id="practice-save-hint" className="text-sm text-slate-400">{t('Add a block to save a session.')}</p>}
      </form>

      <section className="border-t border-slate-800 py-4">
        <h2>
          <button
            type="button"
            onClick={() => setIsTodoOpen((current) => !current)}
            aria-expanded={isTodoOpen}
            aria-controls="practice-todo-panel"
            className="flex min-h-11 w-full items-center justify-between gap-2 text-left text-base font-semibold"
          >
            <span>{t('ToDo')} · {todosDone}/{todos.length}</span>
            <span className="text-sm font-normal text-slate-400">{t(isTodoOpen ? 'Hide' : 'Show')}</span>
          </button>
        </h2>

        {isTodoOpen && (
          <div id="practice-todo-panel" className="mt-2 space-y-2">
            {todos.length === 0 && <p className="text-sm text-slate-400">{t('No ToDo items yet for this week.')}</p>}
            {todoError && <p role="alert" className="text-sm text-red-400">{todoError}</p>}

            {todos.map((todo, index) => (
              <div key={`${todo.id}-${index}`} className="flex min-h-11 items-center gap-1">
                <label className="flex h-11 w-11 shrink-0 items-center justify-center">
                  <input
                    type="checkbox"
                    checked={todo.done}
                    aria-label={todo.name || t('ToDo name')}
                    onChange={(event) => { void toggleTodoDone(index, event.target.checked) }}
                    className="h-5 w-5 rounded border-slate-700 bg-slate-950"
                  />
                </label>
                <input
                  value={todo.name}
                  onChange={(event) => updateTodo(index, { name: event.target.value })}
                  onBlur={(event) => { void saveTodo({ ...todo, name: event.currentTarget.value }) }}
                  onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur() } }}
                  className="h-11 min-w-0 flex-1 rounded border border-slate-700 bg-slate-950 px-3 text-base outline-none transition focus:border-slate-500"
                  placeholder={t('ToDo name')}
                />
                <button
                  type="button"
                  onClick={() => { void removeTodo(index) }}
                  aria-label={t('Remove')}
                  title={t('Remove')}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded text-lg text-slate-400 hover:text-rose-300"
                >
                  <span aria-hidden="true">×</span>
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addTodo}
              className="min-h-11 rounded border border-slate-700 px-3 text-sm text-slate-300"
            >
              {t('+ Add ToDo')}
            </button>
          </div>
        )}
      </section>

      <section className="border-t border-slate-800 py-4">
        <h2>
          <button
            type="button"
            onClick={() => setIsRecentSessionsOpen((current) => !current)}
            aria-expanded={isRecentSessionsOpen}
            className="flex min-h-11 w-full items-center justify-between gap-2 text-left text-lg font-semibold"
          >
            <span>{t('Recent sessions')}</span>
            <span className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-normal text-slate-300">
              {t(isRecentSessionsOpen ? 'Hide' : 'Show')}
            </span>
          </button>
        </h2>

        {isRecentSessionsOpen && (
          <div className="mt-3 space-y-3">
            {sessions.length === 0 && <p className="text-sm text-slate-400">{t('No sessions yet.')}</p>}

            {sessions.slice(0, 5).map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => confirmDiscard(() => handleOpenRecentSession(session))}
                className="min-h-11 w-full rounded border border-slate-800 bg-slate-900/70 p-3 text-left transition hover:border-slate-600"
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
