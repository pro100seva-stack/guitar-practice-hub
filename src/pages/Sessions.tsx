import { useEffect, useEffectEvent, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router'
import { useHeaderSlots } from '../components/headerSlots'
import BlockGallery from '../components/BlockGallery'
import AppSelect from '../components/AppSelect'
import PickerDialog from '../components/PickerDialog'
import RemoveBlockIcon from '../components/icons/RemoveBlockIcon'
import { supabase } from '../lib/supabase'
import { captureLocalMaterialAccess, isLocalMaterialAccessCurrent, localMaterialOwner, onLocalMaterialInvalidation, type LocalMaterialAccess } from '../lib/localMaterialAccess'
import { assignLocalMaterialToSong, deleteLocalMaterial, detectMaterialType, estimateLocalStorage, isAllowedMaterialType, listLocalMaterials, loadLocalMaterialBlob, localMaterialCleanupPending, materialFileAccept, normalizeBookmarks, patchLocalMaterialMetadata, practiceMediaKind, retryPendingLocalMaterialCleanup, saveLocalMaterial, type LocalMaterial, type LocalStorageEstimate, type PlaybackBookmark } from '../lib/localMaterials'
import type { Database } from '../lib/database.types'
import { archivePracticeSong, createPracticeSong, fetchDaySongs, fetchPracticeSongs, fetchWeekPracticeSongs, withWeekPracticeSongs, isSongBlock, selectDaySong, withDaySongBlocks, type DaySong, type PracticeSong, type SongBlockKey } from '../lib/songPracticeApi'
import { createSessionSaveQueue } from '../lib/sessionSaveQueue'
import { catalogBlockLabel, createOtherBlock, isSelectableCatalogBlock, loadPlanWeekBlockKeys, loadProgramBlockKeys, loadSessionRestorationCatalog, readProgramBlockMode, type CatalogBlock } from '../lib/catalogApi'
import { formatDate, formatDateRange, localeForLanguage, toLocalIsoDate } from '../lib/dateFormat'
import { useI18n } from '../lib/i18n'
import { getDefaultMaterials } from '../lib/defaultMaterials'
import { normalizeBlockLabel } from '../lib/blockLabels'
import { hasUnsupportedSessionBlocks, planSessionBlockSave, selectPracticedSessionBlocks, sessionBlockMinutes } from '../lib/sessionBlockSavePlan'
import { getPracticedDates } from '../lib/sessionActivity'
import { resolvePracticeDeepLink } from '../lib/practiceDeepLink'
import { canInitializeSessionDefaults, getSessionEditorState, hasSavedSession, isSessionEditorDirty, shouldDeleteClearedSession, type BlockTimerState, type SelectedBlock, type SessionEditorState } from '../lib/sessionEditorState'
import { activateBlockTimer, completeBlockTimer, editBlockTimer, pauseBlockTimer, resetBlockTimer, snapshotBlockTimers, toggleBlockTimer } from '../lib/sessionBlockTimer'
import { closeDeletedMaterial, createRequestTracker, findActiveMaterial, removeBlockMaterial, setBlockMaterials, updateBlockMaterial, type ActiveMaterial, type MaterialsByBlock } from '../lib/materialScope'
import MetronomeIcon from '../components/icons/MetronomeIcon'
import TuningForkIcon from '../components/icons/TuningForkIcon'
import { isYouTubeEmbedUrl, isYouTubeHostLink, lookupYouTubeTitle, toYouTubeEmbedUrl, youTubeTitleFallback } from '../lib/youtube'
import type { PlaybackIntent } from '../lib/youtubePractice'
import { formatPracticeKey, isPracticeKeyBlock, pickPracticeKey, type PracticeKeyBlock } from '../lib/practiceKey'
import { adjacentPracticeWeeks } from '../lib/practiceWeekNavigation'
import { metronomeClickGain, parseMetronomeVolume, readMetronomeVolume, writeMetronomeVolume } from '../lib/metronomeVolume'
import { metronomeBeatSeconds } from '../lib/metronomeTiming'
import YouTubePracticePlayer from '../components/YouTubePracticePlayer'
import LocalVideoPracticePlayer from '../components/LocalVideoPracticePlayer'
import SongMaterialTools, { SongToolIcon } from '../components/SongMaterialTools'
import { matchesSongMaterialFilter, songMaterialKind, type SongMaterialFilter } from '../lib/songMaterialTypes'
import { savePracticeSongNotes } from '../lib/songPracticeApi'

type MaterialFeedback = { error: string | null; notice: string | null; saveState: 'idle' | 'saving' | 'saved'; cancellable?: boolean; retryUpload?: boolean }
const emptyMaterialFeedback: MaterialFeedback = { error: null, notice: null, saveState: 'idle' }
// Bounds the visible wait for one local file save; slower writes are abandoned before their metadata commits.
const localMaterialSaveTimeoutMs = 120_000

function PracticeTimerIcon({ isRunning }: { isRunning: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      {isRunning ? <path d="M6 4h4v16H6zm8 0h4v16h-4z" /> : <path d="M7 4v16l13-8z" />}
    </svg>
  )
}

function MaterialSaveStatus({ saveState, savingLabel, savedLabel }: { saveState: MaterialFeedback['saveState']; savingLabel: string; savedLabel: string }) {
  // The live region stays mounted so state changes are announced.
  return (
    <span role="status" aria-live="polite" className="inline-flex">
      {saveState === 'saving' && (
        <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-sky-400/70 bg-sky-500/20 px-3 py-1 text-sm font-semibold text-sky-100">
          <span aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-sky-200 border-t-transparent motion-reduce:animate-none" />
          {savingLabel}
        </span>
      )}
      {saveState === 'saved' && <span className="text-sm text-emerald-300">{savedLabel}</span>}
    </span>
  )
}

type BlockTemplate = CatalogBlock
type PlanWeek = Database['public']['Tables']['plan_weeks']['Row']
type Program = Database['public']['Tables']['programs']['Row']
type ScheduledPlanWeek = PlanWeek & {
  end_date: string
  start_date: string
  week_number: number
}
type SessionBlock = Database['public']['Tables']['session_blocks']['Row']
type SessionWithBlocks = Database['public']['Tables']['sessions']['Row'] & {
  session_blocks: SessionBlock[]
}

function localMaterialScopeKey(blockKey: string, songId?: string) {
  return songId && (isSongBlock(blockKey) || blockKey === 'song') ? `song:${songId}` : songId ? `${blockKey}:song:${songId}` : blockKey
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
  const [materialAccess] = useState(captureLocalMaterialAccess)
  const { language, t } = useI18n()
  const headerSlots = useHeaderSlots()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [templates, setTemplates] = useState<BlockTemplate[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [planWeek, setPlanWeek] = useState<ScheduledPlanWeek | null>(null)
  const [programName, setProgramName] = useState<string | null>(null)
  const [programs, setPrograms] = useState<Program[]>([])
  const [membership, setMembership] = useState<{ weekId: string; keys: string[]; status: 'pending' | 'ready' | 'error'; error?: string } | null>(null)
  const [membershipRetry, setMembershipRetry] = useState(0)
  const [editorBaseline, setEditorBaseline] = useState<SessionEditorState>({ comment: '', timers: {}, selectedBlocks: [] })
  const [weeks, setWeeks] = useState<ScheduledPlanWeek[]>([])
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0)
  const [sessions, setSessions] = useState<SessionWithBlocks[]>([])
  const [songLibrary, setSongLibrary] = useState<PracticeSong[]>([])
  const [daySongs, setDaySongs] = useState<DaySong[]>([])
  const [weeklySongs, setWeeklySongs] = useState<{ weekId: string; songs: PracticeSong[] } | null>(null)
  const [songsDate, setSongsDate] = useState('')
  const [songsError, setSongsError] = useState<string | null>(null)
  const [songsLoading, setSongsLoading] = useState(false)
  const [songBusy, setSongBusy] = useState(false)
  const [newSongName, setNewSongName] = useState('')
  const [learnSongName, setLearnSongName] = useState('')
  const [songToRemove, setSongToRemove] = useState<string | null>(null)
  const [openSongRows, setOpenSongRows] = useState<Set<string>>(new Set())
  const [songMaterialFilters, setSongMaterialFilters] = useState<Record<string, SongMaterialFilter>>({})
  const [songViewerRow, setSongViewerRow] = useState<string | null>(null)
  const songViewerRowRef = useRef<string | null>(null)
  const [songNotesRow, setSongNotesRow] = useState<string | null>(null)
  const [songNotesDrafts, setSongNotesDrafts] = useState<Record<string, string>>({})
  const [songNotesSaved, setSongNotesSaved] = useState<Record<string, string | null>>({})
  const [songNotesErrors, setSongNotesErrors] = useState<Record<string, string>>({})
  const [songNotesSaving, setSongNotesSaving] = useState<Set<string>>(new Set())
  const songNotesOperationsRef = useRef(new Set<string>())
  const [tabNoticeRow, setTabNoticeRow] = useState<string | null>(null)
  const [legacySongChoices, setLegacySongChoices] = useState<Record<string, string>>({})
  const songRequestRef = useRef(0)
  const songOperationRef = useRef(false)
  const songDateRef = useRef('')
  const removedDaySongsRef = useRef<DaySong[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [date, setDate] = useState(toLocalIsoDate())
  songDateRef.current = date
  const inheritedSongs = weeklySongs?.weekId === planWeek?.id ? weeklySongs?.songs ?? [] : []
  const selectedDaySongs = withWeekPracticeSongs(date, inheritedSongs, songsDate === date ? daySongs : [])
  const [comment, setComment] = useState('')
  const [selectedBlocks, setSelectedBlocks] = useState<SelectedBlock[]>([])
  const [expandedBlockIds, setExpandedBlockIds] = useState<Set<string>>(new Set())
  const [isBlockPickerOpen, setIsBlockPickerOpen] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const [removedBlock, setRemovedBlock] = useState<RemovedBlock | null>(null)
  const [pendingDiscardAction, setPendingDiscardAction] = useState<{ run: () => void } | null>(null)
  const [isWeekDetailsOpen, setIsWeekDetailsOpen] = useState(false)
  const [isSongsOpen, setIsSongsOpen] = useState(true)
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
  const [metronomeVolume, setMetronomeVolume] = useState(readMetronomeVolume)
  const [tuningKey, setTuningKey] = useState<TuningKey>('standard')
  const [practiceKeys, setPracticeKeys] = useState<Record<PracticeKeyBlock, string>>(() => ({
    major_scales: pickPracticeKey('major_scales', null),
    minor_scales: pickPracticeKey('minor_scales', null),
  }))
  const [activeReferenceTone, setActiveReferenceTone] = useState<string | null>(null)
  const [materialsByBlock, setMaterialsByBlock] = useState<MaterialsByBlock>({})
  const [materialUrlInputs, setMaterialUrlInputs] = useState<Record<string, string>>({})
  const [materialAddScope, setMaterialAddScope] = useState<string | null>(null)
  const [manualYouTubeScopes, setManualYouTubeScopes] = useState<Record<string, boolean>>({})
  const clipboardReadsRef = useRef(new Set<string>())
  const urlSavesRef = useRef(new Set<string>())
  const [materialFeedback, setMaterialFeedback] = useState<Record<string, MaterialFeedback>>({})
  const [, setLocalStorageEstimate] = useState<LocalStorageEstimate>({ usage: null, quota: null })
  const [activeMaterial, setActiveMaterialState] = useState<ActiveMaterial | null>(null)
  const [activeDefaultMaterial, setActiveDefaultMaterial] = useState<{ blockKey: string; title: string; url: string } | null>(null)
  const [activeMaterialUrl, setActiveMaterialUrl] = useState<string | null>(null)
  const [mediaError, setMediaError] = useState<string | null>(null)
  const playbackBlockedRef = useRef(new Set<string>())
  const [materialRename, setMaterialRename] = useState<{ id: string; blockKey: string; songId?: string; draft: string; saving: boolean; error: string | null } | null>(null)
  const materialFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const materialAddMenuRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const materialAddButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const uploadControllersRef = useRef<Record<string, AbortController>>({})
  const retryUploadsRef = useRef<Record<string, File>>({})
  const [materialCleanupPending, setMaterialCleanupPending] = useState(false)
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
  const materialNavigationRef = useRef(0)
  const materialsMountedRef = useRef(false)
  const dayStripRef = useRef<HTMLDivElement | null>(null)
  const blocksSectionRef = useRef<HTMLElement | null>(null)
  const addBlockButtonRef = useRef<HTMLButtonElement | null>(null)
  const discardPromptRef = useRef<HTMLDivElement | null>(null)
  const messageRef = useRef<HTMLParagraphElement | null>(null)
  const pendingFocusBlockIdRef = useRef<string | null>(null)
  const removedBlockTimeoutRef = useRef<number | null>(null)
  const bpmRef = useRef(bpm)
  const beatsPerMeasureRef = useRef(beatsPerMeasure)
  const metronomeBeatUnitRef = useRef(4)
  const lookaheadRef = useRef(0.12)
  const metronomeVolumeRef = useRef(metronomeVolume)
  const nextNoteTimeRef = useRef(0)
  const editorNavigationRef = useRef(0)
  const editorRevisionRef = useRef(0)
  const dataRequestRef = useRef(0)
  const defaultsSuppressedDateRef = useRef<string | null>(null)
  const [saveQueue] = useState(createSessionSaveQueue)
  const pendingSavesRef = useRef(0)
  const latestEditorRef = useRef({ date, weekId: planWeek?.id ?? null, comment, selectedBlocks, timers })
  latestEditorRef.current = { date, weekId: planWeek?.id ?? null, comment, selectedBlocks, timers }
  const sessionsRef = useRef(sessions)
  sessionsRef.current = sessions
  const applyMembership = useEffectEvent((weekId: string, keys: string[]) => {
    if (saving || defaultsSuppressedDateRef.current === date || !canInitializeSessionDefaults(weekId, planWeek?.id ?? null, hasSavedSession(date, sessions), editorBaseline, { comment, selectedBlocks, timers: snapshotBlockTimers(timers, Date.now()) })) return
    const state = withDaySongBlocks(getSessionEditorState(date, templates, sessions, keys), selectedDaySongs, templates)
    setComment(state.comment)
    setSelectedBlocks(state.selectedBlocks)
    setTimers(state.timers)
    setEditorBaseline(state)
  })

  useEffect(() => {
    const weekId = planWeek?.id
    const program = programs.find((item) => item.id === planWeek?.program_id)
    const mode = readProgramBlockMode(program?.block_set_mode)
    if (!weekId || !program || mode === 'legacy_unconfigured') {
      setMembership(null)
      return
    }
    let cancelled = false
    setMembership({ weekId, keys: [], status: 'pending' })
    const request = mode === 'same_every_week' ? loadProgramBlockKeys(program.id) : loadPlanWeekBlockKeys(weekId)
    void request.then((keys) => {
      if (cancelled) return
      setMembership({ weekId, keys, status: 'ready' })
      applyMembership(weekId, keys)
    }).catch(() => {
      if (!cancelled) setMembership({ weekId, keys: [], status: 'error', error: t('Could not load block composition.') })
    })
    return () => { cancelled = true }
  }, [planWeek?.id, planWeek?.program_id, programs, membershipRetry, t])

  useEffect(() => {
    const linkedWeekId = searchParams.get('week')
    // Consume the link once so reload/back does not override the user's later in-page selection.
    if (linkedWeekId) {
      const next = new URLSearchParams(searchParams)
      next.delete('week')
      setSearchParams(next, { replace: true })
    }
    void loadData(undefined, linkedWeekId)
    void loadAppSettings()
  }, [])

  useEffect(() => {
    materialsMountedRef.current = true
    const unsubscribe = onLocalMaterialInvalidation(() => {
      if (!isLocalMaterialAccessCurrent(materialAccess)) {
        materialsMountedRef.current = false
        materialNavigationRef.current++
        dataRequestRef.current++
      }
    })
    return () => { materialsMountedRef.current = false; unsubscribe() }
  }, [materialAccess])

  useEffect(() => {
    let cancelled = false
    void retryPendingLocalMaterialCleanup(materialAccess).then(({ failed }) => {
      if (!cancelled && isLocalMaterialAccessCurrent(materialAccess)) setMaterialCleanupPending(failed > 0)
    }).catch(() => undefined)
    return () => { cancelled = true }
  }, [materialAccess])

  function captureMaterialAccess() {
    localMaterialOwner(materialAccess)
    return captureLocalMaterialAccess()
  }

  useEffect(() => {
    materialNavigationRef.current++
  }, [expandedBlockIds, date, activeMaterial?.id, activeDefaultMaterial?.url])

  function patchMaterialFeedback(blockKey: string, patch: Partial<MaterialFeedback>) {
    setMaterialFeedback((current) => ({ ...current, [blockKey]: { ...emptyMaterialFeedback, ...current[blockKey], ...patch } }))
  }

  function setActiveMaterial(blockKey: string, id: string | null) {
    materialNavigationRef.current++
    if (activeMaterial?.id !== id) setActiveMaterialUrl(null)
    setActiveMaterialState(id ? { blockKey, id } : null)
    if (id) setActiveDefaultMaterial(null)
  }

  useEffect(() => {
    if (!materialAddScope) return
    const menuKey = materialAddScope
    function closeMenu(event: PointerEvent) {
      if (event.target instanceof Node && !materialAddMenuRefs.current[menuKey]?.contains(event.target)) setMaterialAddScope(null)
    }
    function closeWithEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setMaterialAddScope(null)
      materialAddButtonRefs.current[menuKey]?.focus()
    }
    document.addEventListener('pointerdown', closeMenu, true)
    document.addEventListener('keydown', closeWithEscape)
    return () => {
      document.removeEventListener('pointerdown', closeMenu, true)
      document.removeEventListener('keydown', closeWithEscape)
    }
  }, [materialAddScope])

  async function loadBlockMaterials(blockKey: string, songId?: string) {
    const scopeKey = localMaterialScopeKey(blockKey, songId)
    const requestId = materialsRequestTrackerRef.current.begin(scopeKey)
    let access: LocalMaterialAccess | undefined
    try {
      access = captureMaterialAccess()
      const materials = await listLocalMaterials(access, { blockKey, songId })
      if (!materialsMountedRef.current || !isLocalMaterialAccessCurrent(access) || !materialsRequestTrackerRef.current.isCurrent(scopeKey, requestId)) return
      setMaterialsByBlock((current) => setBlockMaterials(current, scopeKey, materials, { blockKey, songId }))
      const estimate = await estimateLocalStorage()
      if (materialsMountedRef.current && isLocalMaterialAccessCurrent(access)) setLocalStorageEstimate(estimate)
    } catch {
      if (materialsMountedRef.current && access && isLocalMaterialAccessCurrent(access)) patchMaterialFeedback(scopeKey, { error: t('Could not load local materials.') })
    }
  }

  const activeMaterialRecord = findActiveMaterial(materialsByBlock, activeMaterial)
  const bookmarks = normalizeBookmarks(activeMaterialRecord?.bookmarks ?? [])
  const activeMaterialRecordRef = useRef<LocalMaterial | null>(null)
  const activeMaterialId = activeMaterialRecord?.id ?? null
  const activeMaterialSource = activeMaterialRecord?.source ?? null
  const activeMaterialStorage = activeMaterialRecord?.storage ?? null
  const activeMaterialSourceUrl = activeMaterialRecord?.url ?? null
  const activeMaterialHasBlob = Boolean(activeMaterialRecord?.blob)

  const playbackScopeRef = useRef({ date, planWeek, expandedBlockIds, selectedBlocks, activeMaterial, activeMaterialRecord, selectedDaySongs })
  useEffect(() => { playbackScopeRef.current = { date, planWeek, expandedBlockIds, selectedBlocks, activeMaterial, activeMaterialRecord, selectedDaySongs } })

  function confirmMaterialPlayback(sessionDate: string, weekId: string | null, blockId: string, blockKey: string, materialId: string, intent: PlaybackIntent, scopeKey: string = blockKey, songId?: string) {
    const { date, planWeek, expandedBlockIds, selectedBlocks, activeMaterial, activeMaterialRecord, selectedDaySongs } = playbackScopeRef.current
    if (!materialsMountedRef.current || !isLocalMaterialAccessCurrent(materialAccess) || sessionDate !== date || weekId !== (planWeek?.id ?? null)
      || !expandedBlockIds.has(blockId) || !selectedBlocks.some((block) => block.id === blockId && block.key === blockKey)
      || activeMaterial?.blockKey !== scopeKey || activeMaterial.id !== materialId || activeMaterialRecord?.id !== materialId
      || (songId && !selectedDaySongs.some((row) => row.song_id === songId && row.block_key === blockKey))) return
    const key = `${sessionDate}:${blockId}`
    const blocked = playbackBlockedRef.current.has(key) || selectedBlocks.some((block) => block.id === blockId && block.done)
    if (intent === 'explicit') playbackBlockedRef.current.delete(key)
    if (intent === 'explicit' || !blocked) editorRevisionRef.current++
    const current = latestEditorRef.current
    const next = activateBlockTimer(current.timers, blockId, Date.now(), intent, blocked)
    if (next === current.timers) return
    const pausedPrevious = Object.keys(current.timers).some((id) => current.timers[id].isRunning && !next[id]?.isRunning)
    commitPracticeProgress(current.selectedBlocks, next, pausedPrevious)
  }

  useEffect(() => {
    activeMaterialRecordRef.current = activeMaterialRecord
  })

  const materialLoadError = useEffectEvent(() => t('Could not load the local material.'))

  // Depends only on stable primitives so bookmark saves and list reloads keep the blob URL and A-B loop.
  useEffect(() => {
    const record = activeMaterialRecordRef.current
    if (!record) {
      setActiveMaterialUrl(null)
      setMediaError(null)
      return
    }

    const access = materialAccess
    if (!isLocalMaterialAccessCurrent(access)) return
    if (record.source === 'url') {
      setActiveMaterialUrl(record.url ?? null)
      setMediaError(null)
      return
    }

    if (!record.blob && record.storage !== 'cache') {
      setActiveMaterialUrl(null)
      setMediaError(null)
      return
    }

    let cancelled = false
    let objectUrl: string | null = null
    const unsubscribe = onLocalMaterialInvalidation(() => {
      if (isLocalMaterialAccessCurrent(access)) return
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    })
    void loadLocalMaterialBlob(access, record).then((blob) => {
      if (cancelled || !isLocalMaterialAccessCurrent(access) || !blob) return
      const nextObjectUrl = URL.createObjectURL(blob)
      objectUrl = nextObjectUrl
      setActiveMaterialUrl(nextObjectUrl)
      setMediaError(null)
    }).catch(() => {
      if (cancelled || !isLocalMaterialAccessCurrent(access)) return
      setActiveMaterialUrl(null)
      setMediaError(materialLoadError())
    })
    return () => {
      cancelled = true
      unsubscribe()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [activeMaterialId, activeMaterialSource, activeMaterialStorage, activeMaterialSourceUrl, activeMaterialHasBlob, materialAccess])

  async function handleLocalMaterialUpload(blockKey: string, file: File | undefined, songId?: string) {
    if (!file) return
    let access: LocalMaterialAccess
    try { access = captureMaterialAccess() } catch { return }
    const scopeKey = localMaterialScopeKey(blockKey, songId)
    if (uploadControllersRef.current[scopeKey] || clipboardReadsRef.current.has(scopeKey) || urlSavesRef.current.has(scopeKey)) return
    delete retryUploadsRef.current[scopeKey]
    patchMaterialFeedback(scopeKey, { error: null, notice: null, saveState: 'saving', cancellable: false, retryUpload: false })
    const detectedType = detectMaterialType(file.name, file.type)
    if (!isAllowedMaterialType(detectedType)) {
      patchMaterialFeedback(scopeKey, { error: t('Use a PDF, image, text, audio, or video file.'), saveState: 'idle' })
      return
    }
    let storageEstimate: LocalStorageEstimate
    try { storageEstimate = await estimateLocalStorage() } catch {
      if (materialsMountedRef.current && isLocalMaterialAccessCurrent(access)) patchMaterialFeedback(scopeKey, { error: t('Could not save the local material.'), saveState: 'idle' })
      return
    }
    if (!materialsMountedRef.current || !isLocalMaterialAccessCurrent(access)) return
    if (storageEstimate.quota != null && storageEstimate.usage != null) {
      const availableBytes = storageEstimate.quota - storageEstimate.usage
      if (file.size > availableBytes) {
        patchMaterialFeedback(scopeKey, { error: t('This file is larger than the browser storage currently available on this device.'), saveState: 'idle' })
        return
      }
    }

    const mediaKind = practiceMediaKind(detectedType)
    if (mediaKind && !document.createElement(mediaKind).canPlayType(detectedType)) {
      patchMaterialFeedback(scopeKey, {
        notice: mediaKind === 'video'
          ? t('This browser may not decode this video format. H.264/AAC MP4 or WebM/Opus is usually the most compatible.')
          : t('This browser may not decode this audio format. MP3, AAC (M4A) or Ogg/Opus is usually the most compatible.'),
      })
    }

    const controller = new AbortController()
    uploadControllersRef.current[scopeKey] = controller
    const stopped = new Promise<never>((_resolve, reject) => {
      controller.signal.addEventListener('abort', () => reject(controller.signal.reason), { once: true })
    })
    const timeoutId = window.setTimeout(() => controller.abort(new DOMException('Local material save timed out.', 'TimeoutError')), localMaterialSaveTimeoutMs)
    patchMaterialFeedback(scopeKey, { cancellable: true })
    const materialId = crypto.randomUUID()
    const saving = saveLocalMaterial(access, {
      id: materialId,
      blockKey,
      songId,
      name: file.name,
      type: detectedType,
      size: file.size,
      source: 'file',
      blob: file,
      createdAt: new Date().toISOString(),
    }, controller.signal)
    try {
      await Promise.race([saving, stopped])
      window.clearTimeout(timeoutId)
      delete uploadControllersRef.current[scopeKey]
      if (!materialsMountedRef.current || !isLocalMaterialAccessCurrent(access)) return
      patchMaterialFeedback(scopeKey, { cancellable: false })
      await loadBlockMaterials(blockKey, songId)
      if (!materialsMountedRef.current || !isLocalMaterialAccessCurrent(access)) return
      setActiveMaterial(scopeKey, materialId)
      patchMaterialFeedback(scopeKey, { saveState: 'saved' })
      window.setTimeout(() => {
        if (materialsMountedRef.current && isLocalMaterialAccessCurrent(access)) patchMaterialFeedback(scopeKey, { saveState: 'idle' })
      }, 2500)
    } catch (uploadError) {
      window.clearTimeout(timeoutId)
      if (uploadControllersRef.current[scopeKey] === controller) delete uploadControllersRef.current[scopeKey]
      if (!materialsMountedRef.current || !isLocalMaterialAccessCurrent(access)) return
      const stoppedBy = uploadError instanceof DOMException && controller.signal.aborted ? uploadError.name : null
      if (stoppedBy) {
        // A commit that won the race against the stop is shown rather than hidden.
        void saving.then(() => {
          if (!materialsMountedRef.current || !isLocalMaterialAccessCurrent(access)) return
          delete retryUploadsRef.current[scopeKey]
          patchMaterialFeedback(scopeKey, { error: null, retryUpload: false })
          void loadBlockMaterials(blockKey, songId)
        }, (lateError: unknown) => {
          if (lateError instanceof Error && lateError.message === localMaterialCleanupPending && materialsMountedRef.current && isLocalMaterialAccessCurrent(access)) setMaterialCleanupPending(true)
        })
      }
      if (uploadError instanceof Error && uploadError.message === localMaterialCleanupPending) setMaterialCleanupPending(true)
      const isQuotaError = uploadError instanceof DOMException && uploadError.name === 'QuotaExceededError'
      retryUploadsRef.current[scopeKey] = file
      patchMaterialFeedback(scopeKey, {
        error: stoppedBy === 'TimeoutError' ? t('materials.saveTimedOut')
          : stoppedBy ? t('materials.saveCancelled')
          : isQuotaError ? t('The browser storage quota was reached. Remove local materials or use another device.') : t('Could not save the local material.'),
        saveState: 'idle',
        cancellable: false,
        retryUpload: true,
      })
    }
  }

  function cancelMaterialUpload(scopeKey: string) {
    uploadControllersRef.current[scopeKey]?.abort(new DOMException('Local material save cancelled.', 'AbortError'))
  }

  function retryMaterialUpload(blockKey: string, songId?: string) {
    const file = retryUploadsRef.current[localMaterialScopeKey(blockKey, songId)]
    if (file) void handleLocalMaterialUpload(blockKey, file, songId)
  }

  async function addMaterialUrl(blockKey: string, songId?: string, input?: string) {
    let access: LocalMaterialAccess
    try { access = captureMaterialAccess() } catch { return }
    const scopeKey = localMaterialScopeKey(blockKey, songId)
    if (urlSavesRef.current.has(scopeKey) || uploadControllersRef.current[scopeKey]) return
    const value = (input ?? materialUrlInputs[scopeKey] ?? '').trim()
    if (!value) return
    const navigation = materialNavigationRef.current
    urlSavesRef.current.add(scopeKey)
    patchMaterialFeedback(scopeKey, { error: null, saveState: 'saving' })
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
      const name = youTubeEmbedUrl ? await lookupYouTubeTitle(youTubeEmbedUrl) ?? youTubeTitleFallback(youTubeEmbedUrl) : url.hostname
      if (!materialsMountedRef.current || !isLocalMaterialAccessCurrent(access) || navigation !== materialNavigationRef.current) return
      await saveLocalMaterial(access, {
        id: materialId,
        blockKey,
        songId,
        name,
        type: 'text/uri-list',
        size: 0,
        source: 'url',
        url: url.toString(),
        createdAt: new Date().toISOString(),
      })
      if (!materialsMountedRef.current || !isLocalMaterialAccessCurrent(access)) return
      setMaterialUrlInputs((current) => ({ ...current, [scopeKey]: '' }))
      setManualYouTubeScopes((current) => ({ ...current, [scopeKey]: false }))
      patchMaterialFeedback(scopeKey, { error: null, notice: null, saveState: 'idle' })
      await loadBlockMaterials(blockKey, songId)
      if (materialsMountedRef.current && isLocalMaterialAccessCurrent(access) && navigation === materialNavigationRef.current) setActiveMaterial(scopeKey, materialId)
    } catch (urlError) {
      if (materialsMountedRef.current && isLocalMaterialAccessCurrent(access)) patchMaterialFeedback(scopeKey, { error: urlError instanceof Error && [t('This YouTube link is not valid.'), t('Enter a valid web URL.'), t('Only HTTP and HTTPS URLs are supported.')].includes(urlError.message) ? urlError.message : t('Could not save the local material.'), saveState: 'idle' })
    } finally {
      urlSavesRef.current.delete(scopeKey)
      if (materialsMountedRef.current && isLocalMaterialAccessCurrent(access)) patchMaterialFeedback(scopeKey, { saveState: 'idle' })
    }
  }

  async function saveMaterialName() {
    if (!materialRename || materialRename.saving) return
    let access: LocalMaterialAccess
    try { access = captureMaterialAccess() } catch { return }
    const { id, blockKey, draft, songId } = materialRename
    const scopeKey = localMaterialScopeKey(blockKey, songId)
    if (!draft.trim()) {
      setMaterialRename((current) => current?.id === id ? { ...current, error: t('Enter a material name.') } : current)
      return
    }
    setMaterialRename((current) => current?.id === id ? { ...current, saving: true, error: null } : current)
    materialsRequestTrackerRef.current.begin(scopeKey)
    try {
      const updated = await patchLocalMaterialMetadata(access, { id, blockKey, songId }, { name: draft })
      if (!materialsMountedRef.current || !isLocalMaterialAccessCurrent(access)) return
      materialsRequestTrackerRef.current.begin(scopeKey)
      setMaterialsByBlock((current) => updateBlockMaterial(current, scopeKey, id, { name: updated.name }))
      setMaterialRename((current) => current?.id === id ? null : current)
    } catch {
      if (materialsMountedRef.current && isLocalMaterialAccessCurrent(access)) setMaterialRename((current) => current?.id === id ? { ...current, saving: false, error: t('Could not save material changes.') } : current)
    }
  }

  async function removeLearningMaterial(blockKey: string, id: string, songId?: string) {
    let access: LocalMaterialAccess
    try { access = captureMaterialAccess() } catch { return }
    const scopeKey = localMaterialScopeKey(blockKey, songId)
    const commitDeletion = materialsRequestTrackerRef.current.beginDeletion(scopeKey)
    const closeRemoved = () => {
      commitDeletion()
      setMaterialsByBlock((current) => removeBlockMaterial(current, scopeKey, id))
      setMaterialRename((current) => current?.id === id ? null : current)
      setActiveMaterialState((current) => closeDeletedMaterial(current, scopeKey, id))
    }
    try {
      await deleteLocalMaterial(access, { id, blockKey, songId })
      if (!materialsMountedRef.current || !isLocalMaterialAccessCurrent(access)) return
      closeRemoved()
      const estimate = await estimateLocalStorage()
      if (materialsMountedRef.current && isLocalMaterialAccessCurrent(access)) setLocalStorageEstimate(estimate)
    } catch (removeError) {
      if (!materialsMountedRef.current || !isLocalMaterialAccessCurrent(access)) return
      // The row is already hidden; only its stored bytes still need clearing.
      if (removeError instanceof Error && removeError.message === localMaterialCleanupPending) {
        closeRemoved()
        setMaterialCleanupPending(true)
        patchMaterialFeedback(scopeKey, { error: t('materials.cleanupPending') })
        return
      }
      patchMaterialFeedback(scopeKey, { error: t('Could not remove the local material.') })
    }
  }

  async function saveMaterialBookmarks(blockKey: string, id: string, next: PlaybackBookmark[], songId?: string) {
    const access = captureMaterialAccess()
    const scopeKey = localMaterialScopeKey(blockKey, songId)
    materialsRequestTrackerRef.current.begin(scopeKey)
    const updated = await patchLocalMaterialMetadata(access, { id, blockKey, songId }, { bookmarks: next })
    if (!materialsMountedRef.current || !isLocalMaterialAccessCurrent(access)) return
    materialsRequestTrackerRef.current.begin(scopeKey)
    setMaterialsByBlock((current) => updateBlockMaterial(current, scopeKey, id, { bookmarks: updated.bookmarks }))
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

  function renderUploadActions(feedback: MaterialFeedback, blockKey: string, songId?: string) {
    if (feedback.saveState === 'saving' && feedback.cancellable) {
      return <button type="button" onClick={() => cancelMaterialUpload(localMaterialScopeKey(blockKey, songId))} className="min-h-11 rounded border border-slate-600 px-3 text-sm text-slate-200">{t('materials.cancelSave')}</button>
    }
    if (feedback.saveState === 'idle' && feedback.retryUpload && feedback.error) {
      return <button type="button" onClick={() => retryMaterialUpload(blockKey, songId)} className="min-h-11 rounded border border-sky-500/60 px-3 text-sm text-sky-200">{t('materials.retrySave')}</button>
    }
    return null
  }

  function addYouTubeMaterial(blockKey: string, value: string, songId?: string) {
    const scopeKey = localMaterialScopeKey(blockKey, songId)
    if (clipboardReadsRef.current.has(scopeKey) || urlSavesRef.current.has(scopeKey) || uploadControllersRef.current[scopeKey]) return
    const trimmed = value.trim()
    if (!toYouTubeEmbedUrl(trimmed)) {
      patchMaterialFeedback(scopeKey, { error: t('materials.youtubeRequired'), notice: null, saveState: 'idle' })
      return
    }
    void addMaterialUrl(blockKey, songId, trimmed)
  }

  async function pasteYouTubeMaterial(blockKey: string, songId?: string) {
    const scopeKey = localMaterialScopeKey(blockKey, songId)
    if (clipboardReadsRef.current.has(scopeKey) || urlSavesRef.current.has(scopeKey) || uploadControllersRef.current[scopeKey]) return
    let access: LocalMaterialAccess
    try { access = captureMaterialAccess() } catch { return }
    const navigation = materialNavigationRef.current
    const isCurrent = () => materialsMountedRef.current && isLocalMaterialAccessCurrent(access) && navigation === materialNavigationRef.current
    clipboardReadsRef.current.add(scopeKey)
    setMaterialAddScope(null)
    patchMaterialFeedback(scopeKey, { error: null, notice: null, saveState: 'saving' })
    let value: string
    try {
      // Keep this read in the click's user activation; do not await anything first.
      if (!navigator.clipboard?.readText) throw new Error('Clipboard unavailable')
      value = await navigator.clipboard.readText()
    } catch {
      if (isCurrent()) {
        setManualYouTubeScopes((current) => ({ ...current, [scopeKey]: true }))
        patchMaterialFeedback(scopeKey, { error: null, notice: t('materials.pasteManually'), saveState: 'idle' })
      }
      return
    } finally {
      clipboardReadsRef.current.delete(scopeKey)
      if (materialsMountedRef.current && isLocalMaterialAccessCurrent(access)) patchMaterialFeedback(scopeKey, { saveState: 'idle' })
    }
    if (!isCurrent()) return
    addYouTubeMaterial(blockKey, value, songId)
  }

  function renderMaterialAddControls(blockKey: string, songId?: string, compact = false, instanceKey?: string) {
    const scopeKey = localMaterialScopeKey(blockKey, songId)
    const busy = materialFeedback[scopeKey]?.saveState === 'saving'
    const menuKey = instanceKey ?? scopeKey
    const menuId = `material-add-${menuKey}`
    return (
      <div ref={(element) => { materialAddMenuRefs.current[menuKey] = element }} className={`${compact ? 'relative inline-flex' : 'flex'} min-w-0 flex-wrap items-center gap-2 text-sm normal-case tracking-normal`}>
        <button ref={(element) => { materialAddButtonRefs.current[menuKey] = element }} type="button" aria-label={t('materials.addLearning')} title={t('materials.addLearning')} aria-expanded={materialAddScope === menuKey} aria-controls={menuId} disabled={busy} onClick={() => { if (compact) { songViewerRowRef.current = menuKey; setSongViewerRow(menuKey); setSongMaterialFilters((current) => ({ ...current, [menuKey]: 'all' })) } setMaterialAddScope((current) => current === menuKey ? null : menuKey) }} className={compact ? 'flex min-h-11 min-w-11 items-center justify-center rounded text-sky-300 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-sky-400 disabled:opacity-50' : 'min-h-11 rounded border border-slate-700 px-3 text-sky-300 hover:border-slate-500 disabled:opacity-50'}>
          {compact ? <SongToolIcon kind="plus" /> : t('materials.addLearning')}
        </button>
        {materialAddScope === menuKey && <div id={menuId} role={compact ? 'group' : undefined} aria-label={compact ? t('materials.addLearning') : undefined} className={compact ? 'absolute right-0 top-full z-30 flex w-56 max-w-[80vw] flex-col rounded-lg border border-slate-600 bg-slate-950 p-1 shadow-xl' : 'flex flex-wrap items-center gap-1 rounded border border-slate-700 bg-slate-950 p-1'}>
          <button type="button" disabled={busy} onClick={() => { setMaterialAddScope(null); materialFileInputRefs.current[menuKey]?.click() }} className="min-h-11 rounded px-3 text-slate-100 hover:bg-slate-800 disabled:opacity-50">{t('Choose file')}</button>
          <button type="button" disabled={busy} onClick={() => { void pasteYouTubeMaterial(blockKey, songId) }} className="min-h-11 rounded px-3 text-slate-100 hover:bg-slate-800 disabled:opacity-50">{t('materials.pasteYouTube')}</button>
        </div>}
        <input ref={(element) => { materialFileInputRefs.current[menuKey] = element }} type="file" accept={materialFileAccept} onChange={(event) => { void handleLocalMaterialUpload(blockKey, event.target.files?.[0], songId); event.currentTarget.value = '' }} hidden />
        {manualYouTubeScopes[scopeKey] && <div className="flex w-full min-w-0 flex-wrap items-center gap-2">
          <input type="url" aria-label={t('materials.youTubeLink')} placeholder={t('materials.youTubeLink')} value={materialUrlInputs[scopeKey] ?? ''} disabled={busy} onChange={(event) => setMaterialUrlInputs((current) => ({ ...current, [scopeKey]: event.target.value }))} onPaste={(event) => { event.preventDefault(); const value = event.clipboardData.getData('text'); setMaterialUrlInputs((current) => ({ ...current, [scopeKey]: value })); addYouTubeMaterial(blockKey, value, songId) }} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addYouTubeMaterial(blockKey, materialUrlInputs[scopeKey] ?? '', songId) } }} className="h-11 min-w-0 flex-1 rounded border border-slate-700 bg-slate-950 px-2 text-base text-slate-200" />
          <button type="button" disabled={busy} onClick={() => addYouTubeMaterial(blockKey, materialUrlInputs[scopeKey] ?? '', songId)} className="min-h-11 rounded border border-slate-700 px-3 text-sky-300 disabled:opacity-50">{t('materials.addYouTube')}</button>
        </div>}
      </div>
    )
  }

  function renderMaterialViewer(scopeKey: string, blockKey: string, songId?: string, standalone = false, songRowKey?: string) {
    if (activeMaterial?.blockKey !== scopeKey || !activeMaterialUrl) return null
    const templateId = templates.find((template) => template.key === blockKey)?.id
    if (!templateId && !standalone) return null

    const viewingMaterial = activeMaterialRecord
    if (!viewingMaterial) return null
    const uploadedMediaKind = practiceMediaKind(viewingMaterial.type)
    const isImage = viewingMaterial.type.startsWith('image/')
    const externalMediaKind = getExternalMediaKind(viewingMaterial)
    const isExternalPage = externalMediaKind === 'page'

    return (
      <div className="mt-3 overflow-hidden bg-slate-950">
        <div className="flex items-center justify-between gap-2 px-2">
          <span className="min-w-0 truncate text-sm text-slate-300">{viewingMaterial.name}</span>
          <button
            type="button"
            onClick={() => setActiveMaterial(scopeKey, null)}
            className="min-h-11 min-w-11 shrink-0 px-2 text-sm text-slate-300 hover:text-slate-100"
          >
            {t('Close')}
          </button>
        </div>
        {externalMediaKind === 'embed' && viewingMaterial.url ? (
          <YouTubePracticePlayer
            key={viewingMaterial.id}
            materialId={viewingMaterial.id}
            url={viewingMaterial.url}
            name={viewingMaterial.name}
            bookmarks={bookmarks}
            onBookmarksChange={(next) => saveMaterialBookmarks(blockKey, viewingMaterial.id, next, songId)}
            onPlaybackConfirmed={(intent) => { if (templateId && !standalone && (!songRowKey || songViewerRowRef.current === songRowKey)) confirmMaterialPlayback(date, planWeek?.id ?? null, templateId, blockKey, viewingMaterial.id, intent, scopeKey, songId) }}
          />
        ) : isExternalPage && viewingMaterial.url ? (
          <div className="space-y-3 p-4 text-sm text-slate-300">
            <p>{t('This web page does not provide an embeddable media format, or it blocks inline viewing.')}</p>
            <a
              href={viewingMaterial.url}
              target="_blank"
              rel="noreferrer"
              className="inline-block rounded border border-slate-700 px-3 py-2 text-sky-300 hover:border-sky-500 hover:text-sky-200"
            >
              {t('Open in browser')}
            </a>
          </div>
        ) : uploadedMediaKind || externalMediaKind === 'video' ? (
          <LocalVideoPracticePlayer key={`${date}:${viewingMaterial.id}:${activeMaterialUrl}`} kind={uploadedMediaKind ?? 'video'} url={activeMaterialUrl} name={viewingMaterial.name} bookmarks={bookmarks}
            onBookmarksChange={(next) => saveMaterialBookmarks(blockKey, viewingMaterial.id, next, songId)}
            onPlaybackConfirmed={(intent) => { if (templateId && !standalone && (!songRowKey || songViewerRowRef.current === songRowKey)) confirmMaterialPlayback(date, planWeek?.id ?? null, templateId, blockKey, viewingMaterial.id, intent, scopeKey, songId) }} />
        ) : isImage || externalMediaKind === 'image' ? (
          <img src={activeMaterialUrl} alt={viewingMaterial.name} className="max-h-[420px] w-full object-contain" />
        ) : viewingMaterial.type === 'application/pdf' || externalMediaKind === 'pdf' ? (
          <div>
            <object data={activeMaterialUrl} type="application/pdf" aria-label={viewingMaterial.name} className="h-[420px] w-full bg-white">
              <p className="p-3 text-xs text-slate-700">{t('If the PDF does not appear, your browser cannot show it inline.')}</p>
            </object>
            <a href={activeMaterialUrl} target="_blank" rel="noreferrer" className="flex min-h-11 items-center text-sm text-sky-300 hover:text-sky-200">
              {t('Open in new tab')}
            </a>
          </div>
        ) : (
          <iframe
            src={activeMaterialUrl}
            title={viewingMaterial.name}
            className="h-[420px] w-full bg-white"
          />
        )}
        {mediaError && <p className="py-2 text-sm text-rose-300">{mediaError}</p>}
      </div>
    )

  }

  function songNotesValue(song: PracticeSong) {
    return Object.hasOwn(songNotesSaved, song.id) ? songNotesSaved[song.id] : song.notes
  }

  function closeSongViewer() {
    songViewerRowRef.current = null
    setSongViewerRow(null)
    if (activeMaterial?.blockKey.startsWith('song:')) setActiveMaterial(activeMaterial.blockKey, null)
  }

  function toggleSongRow(song: PracticeSong, blockKey: string) {
    const rowKey = `${blockKey}:${song.id}`
    const open = openSongRows.has(rowKey)
    setOpenSongRows((current) => {
      const next = new Set([...current].filter((key) => !key.endsWith(`:${song.id}`)))
      if (!open) next.add(rowKey)
      return next
    })
    if (songViewerRow?.endsWith(`:${song.id}`)) closeSongViewer()
    if (!open) void loadBlockMaterials(blockKey, song.id)
  }

  async function saveSongNotes(song: PracticeSong) {
    if (songNotesOperationsRef.current.has(song.id)) return
    const draft = songNotesDrafts[song.id] ?? songNotesValue(song) ?? ''
    let access: LocalMaterialAccess
    try { access = captureMaterialAccess() } catch { return }
    songNotesOperationsRef.current.add(song.id)
    setSongNotesSaving((current) => new Set([...current, song.id]))
    setSongNotesErrors((current) => ({ ...current, [song.id]: '' }))
    try {
      const saved = await savePracticeSongNotes(song.id, draft)
      if (!materialsMountedRef.current || !isLocalMaterialAccessCurrent(access)) return
      setSongNotesSaved((current) => ({ ...current, [song.id]: saved.notes }))
      setSongLibrary((current) => current.map((entry) => entry.id === song.id ? { ...entry, notes: saved.notes } : entry))
      setDaySongs((current) => current.map((entry) => entry.song_id === song.id ? { ...entry, songs: { ...entry.songs, notes: saved.notes } } : entry))
      setSongNotesDrafts((current) => { const next = { ...current }; delete next[song.id]; return next })
      setSongNotesRow((current) => current?.endsWith(`:${song.id}`) ? null : current)
      setAnnouncement(t('songTools.notesSaved'))
    } catch {
      if (materialsMountedRef.current && isLocalMaterialAccessCurrent(access)) setSongNotesErrors((current) => ({ ...current, [song.id]: t('songTools.notesError') }))
    } finally {
      songNotesOperationsRef.current.delete(song.id)
      if (materialsMountedRef.current && isLocalMaterialAccessCurrent(access)) setSongNotesSaving((current) => { const next = new Set(current); next.delete(song.id); return next })
    }
  }

  async function removeSongFromDay(song: PracticeSong, blockKey: SongBlockKey) {
    if (songOperationRef.current) return
    const selectedDate = date
    const access = captureMaterialAccess()
    songOperationRef.current = true
    songRequestRef.current++
    setSongsLoading(false)
    setSongBusy(true)
    setSongsError(null)
    try {
      await selectDaySong(selectedDate, blockKey, song.id, false)
      const choices = await fetchDaySongs(selectedDate)
      if (!materialsMountedRef.current || !isLocalMaterialAccessCurrent(access) || songDateRef.current !== selectedDate) return
      applyDaySongs(choices)
      if (songViewerRow === `${blockKey}:${song.id}`) closeSongViewer()
    } catch {
      if (materialsMountedRef.current && isLocalMaterialAccessCurrent(access) && songDateRef.current === selectedDate) setSongsError(songsUnavailable())
    } finally {
      songOperationRef.current = false
      if (materialsMountedRef.current && isLocalMaterialAccessCurrent(access)) setSongBusy(false)
    }
  }

  function renderSongMaterials(song: PracticeSong, blockKey: string, libraryActions?: ReactNode) {
    const scopeKey = localMaterialScopeKey(blockKey, song.id)
    const rowKey = blockKey + ':' + song.id
    const songMaterials = materialsByBlock[scopeKey] ?? []
    const songFeedback = materialFeedback[scopeKey] ?? emptyMaterialFeedback
    const open = openSongRows.has(rowKey)
    const filter = songMaterialFilters[rowKey] ?? 'all'
    const notes = songNotesValue(song) ?? ''
    const notesOpen = songNotesRow === rowKey
    const notesSaving = songNotesSaving.has(song.id)
    const notesDraft = songNotesDrafts[song.id] ?? notes
    const filteredMaterials = songMaterials.filter((material) => matchesSongMaterialFilter(material, filter))
    const changeFilter = (nextFilter: 'video' | 'pdf') => {
      const next = filter === nextFilter ? 'all' : nextFilter
      setSongMaterialFilters((current) => ({ ...current, [rowKey]: next }))
      if (songViewerRow === rowKey && activeMaterialRecord && !matchesSongMaterialFilter(activeMaterialRecord, next)) closeSongViewer()
    }
    return <article key={song.id} className="min-w-0 border-b border-slate-800 py-1 last:border-0">
      <div className="flex min-h-11 items-center gap-2">
        <h4 className="min-w-0 flex-1"><button type="button" aria-expanded={open} aria-controls={`song-materials-${rowKey}`} onClick={() => toggleSongRow(song, blockKey)} className="min-h-11 w-full break-words rounded text-left text-base font-semibold text-slate-100 underline decoration-slate-600 underline-offset-4 hover:text-sky-200 focus-visible:outline-2 focus-visible:outline-sky-400">{song.name}</button></h4>
        {libraryActions ?? (isSongBlock(blockKey) && !(blockKey === 'repertoire' && inheritedSongs.some((entry) => entry.id === song.id)) && <button type="button" disabled={songBusy || songsLoading} aria-label={t('songTools.removeFromDay', { song: song.name })} title={t('songTools.removeFromDay', { song: song.name })} onClick={() => { void removeSongFromDay(song, blockKey) }} className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full disabled:opacity-40"><span aria-hidden="true" className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-500 text-slate-950 hover:bg-slate-400"><svg viewBox="0 0 20 20" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.8"><path d="m5 5 10 10M15 5 5 15" /></svg></span></button>)}
      </div>
      {open && <div className="space-y-2 pb-2">
        <div id={`song-materials-${rowKey}`}>
        <SongMaterialTools filter={filter} hasVideo={songMaterials.some((material) => songMaterialKind(material) === 'video')} hasPdf={songMaterials.some((material) => songMaterialKind(material) === 'pdf')} hasTab={songMaterials.some((material) => songMaterialKind(material) === 'tab')} hasNotes={notes.length > 0} notesOpen={notesOpen} onFilter={changeFilter} onTab={() => setTabNoticeRow((current) => current === rowKey ? null : rowKey)} onNotes={() => setSongNotesRow((current) => current === rowKey ? null : rowKey)} label={t} addControl={renderMaterialAddControls(blockKey, song.id, true, rowKey)} />
        {tabNoticeRow === rowKey && <div role="status" className="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-900 p-3 text-sm text-slate-300"><p className="flex-1">{t('songTools.tabRoadmap')}</p><button type="button" onClick={() => setTabNoticeRow(null)} className="min-h-11 px-2 text-sky-300">{t('Close')}</button></div>}
        {notesOpen && <div className="space-y-2 rounded-lg border border-slate-600 bg-slate-950 p-3">
          <label className="block text-sm text-slate-300"><span className="label">{t('songTools.notesFor', { song: song.name })}</span><textarea autoFocus value={notesDraft} maxLength={10_000} rows={4} disabled={notesSaving} onChange={(event) => setSongNotesDrafts((current) => ({ ...current, [song.id]: event.target.value }))} className="field resize-y" /></label>
          <div className="flex flex-wrap gap-2"><button type="button" disabled={notesSaving || notesDraft === notes} onClick={() => { void saveSongNotes(song) }} className="btn btn-secondary">{t(notesSaving ? 'Saving…' : 'songTools.saveNotes')}</button><button type="button" disabled={notesSaving} onClick={() => { setSongNotesDrafts((current) => { const next = { ...current }; delete next[song.id]; return next }); setSongNotesErrors((current) => ({ ...current, [song.id]: '' })); setSongNotesRow(null) }} className="btn btn-ghost">{t('Cancel')}</button></div>
          {songNotesErrors[song.id] && <p role="alert" className="msg-error">{songNotesErrors[song.id]}</p>}
        </div>}
        <div className="flex flex-wrap items-center gap-2"><MaterialSaveStatus saveState={songFeedback.saveState} savingLabel={t('Saving locally…')} savedLabel={t('Saved on this device')} />{renderUploadActions(songFeedback, blockKey, song.id)}</div>
        {materialCleanupPending && <p role="status" className="meta">{t('materials.cleanupPendingNote')}</p>}
        {filteredMaterials.map((material) => <div key={material.id} className="flex min-h-11 flex-wrap items-center gap-2 text-sm">
          {materialRename?.id === material.id && materialRename.songId === song.id ? <div className="flex w-full flex-wrap gap-2"><input aria-label={t('Material name')} value={materialRename.draft} onChange={(event) => setMaterialRename((current) => current ? { ...current, draft: event.target.value } : current)} className="field" /><button type="button" disabled={materialRename.saving} onClick={() => void saveMaterialName()} className="btn btn-secondary">{t('Save name')}</button><button type="button" onClick={() => setMaterialRename(null)} className="btn btn-ghost">{t('Cancel')}</button>{materialRename.error && <p role="alert" className="msg-error">{materialRename.error}</p>}</div> : <>
            <button type="button" onClick={() => { songViewerRowRef.current = rowKey; setSongViewerRow(rowKey); setActiveMaterial(scopeKey, material.id) }} className="min-h-11 min-w-0 flex-1 break-words text-left text-sky-300">{material.name}</button>
            <button type="button" aria-label={t('Rename {name}', { name: material.name })} onClick={() => setMaterialRename({ id: material.id, blockKey, songId: song.id, draft: material.name, saving: false, error: null })} className="min-h-11 px-2 text-slate-300">{t('Rename')}</button>
            <button type="button" onClick={() => void removeLearningMaterial(blockKey, material.id, song.id)} className="min-h-11 px-2 text-rose-300">{t('Remove')}</button>
          </>}
        </div>)}
        {songViewerRow === rowKey && activeMaterialRecord && matchesSongMaterialFilter(activeMaterialRecord, filter) && renderMaterialViewer(scopeKey, blockKey, song.id, blockKey === 'song', rowKey)}
        {songFeedback.error && <p role="alert" className="msg-error">{songFeedback.error}</p>}
        {songFeedback.notice && <p role="status" className="meta">{songFeedback.notice}</p>}
        </div>
      </div>}
    </article>
  }

  useEffect(() => {
    function refreshTimers() {
      const nowMs = Date.now()
      setTimers((current) => snapshotBlockTimers(current, nowMs))
    }
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') refreshTimers()
    }
    const intervalId = window.setInterval(refreshTimers, 1000)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
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

  async function loadData(keep?: { date: string; weekId: string | null; cleared?: boolean }, linkedWeekId?: string | null) {
    const requestId = ++dataRequestRef.current
    const navigation = editorNavigationRef.current
    const revision = editorRevisionRef.current
    if (!keep) setLoading(true)
    setError(null)
    setCatalogLoading(true)
    setCatalogError(null)

    const today = toLocalIsoDate()

    const [weeksResult, planResult, templatesResult, sessionsResult, programsResult] = await Promise.all([
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
      loadSessionRestorationCatalog()
        .then((data) => ({ data, error: null as Error | null }))
        .catch((loadError: unknown) => ({ data: null, error: loadError instanceof Error ? loadError : new Error(t('Could not load the block catalog.')) })),
      supabase
        .from('sessions')
        .select('*, session_blocks(*)')
        .order('session_date', { ascending: false }),
      supabase.from('programs').select('*'),
    ])
    if (requestId !== dataRequestRef.current) return
    setCatalogLoading(false)
    if (navigation !== editorNavigationRef.current) return

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
      setCatalogError(t('Could not load the block catalog.'))
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

    const allWeeks = ((weeksResult.data ?? []) as PlanWeek[]).filter(isScheduledWeek)
    const linked = keep ? null : resolvePracticeDeepLink(allWeeks, linkedWeekId ?? null, today)
    const keptWeek = keep?.weekId ? allWeeks.find((entry) => entry.id === keep.weekId) : linked?.week
    const currentWeek = keptWeek ?? allWeeks.find((entry) => entry.start_date <= today && entry.end_date >= today) ?? allWeeks[0] ?? null
    const currentWeekIndex = currentWeek ? allWeeks.findIndex((item) => item.id === currentWeek.id) : 0
    const allTemplates = (templatesResult.data ?? []) as BlockTemplate[]

    const dedupedTemplates = allTemplates.filter((template, index, array) => {
      return index === array.findIndex((candidate) => candidate.key === template.key)
    }).map((template) => ({ ...template, label: catalogBlockLabel(template, t) }))

    const defaultDate = keep?.date ?? linked?.date ?? getDefaultDateForWeek(currentWeek ?? allWeeks[0] ?? null)
    const loadedSessions = (sessionsResult.data as SessionWithBlocks[]) ?? []
    const editorState = getSessionEditorState(defaultDate, dedupedTemplates, loadedSessions, !keep?.cleared && membership && currentWeek && membership.weekId === currentWeek.id && membership.status === 'ready' ? membership.keys : [])
    if (keep && revision !== editorRevisionRef.current) {
      setTemplates(dedupedTemplates)
      setSessions(loadedSessions)
      setEditorBaseline(editorState)
      return
    }

    setWeeks(allWeeks)
    setPlanWeek(currentWeek)
    setProgramName((programsResult.data as Program[] | null)?.find((program) => program.id === currentWeek?.program_id)?.name ?? null)
    setPrograms((programsResult.data ?? []) as Program[])
    setSelectedWeekIndex(currentWeekIndex >= 0 ? currentWeekIndex : 0)
    setDate(defaultDate)
    setTemplates(dedupedTemplates)
    setComment(editorState.comment)
    setSelectedBlocks(editorState.selectedBlocks)
    setExpandedBlockIds(new Set())
    setRemovedBlock(null)
    setTimers(editorState.timers)
    setEditorBaseline(editorState)
    setIsBlockPickerOpen(false)
    setSessions(loadedSessions)
    setLoading(false)
  }

  function getWeekDates(week: PlanWeek | null) {
    if (!week?.start_date) return []

    const result: string[] = []
    const cursor = new Date(`${week.start_date}T00:00:00`)
    const lastDate = week.end_date && week.end_date >= week.start_date ? week.end_date : week.start_date

    while (result.length < 14) {
      result.push(formatLocalDate(cursor))
      if (result[result.length - 1] >= lastDate) break
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

  function handleSelectWeek(week: ScheduledPlanWeek) {
    editorNavigationRef.current++
    defaultsSuppressedDateRef.current = null
    setPlanWeek(week)
    setProgramName(programs.find((program) => program.id === week.program_id)?.name ?? null)
    const nextDate = getDefaultDateForWeek(week)
    const editorState = getSessionEditorState(nextDate, templates, sessions, membership?.weekId === week.id && membership.status === 'ready' ? membership.keys : [])
    setDate(nextDate)
    setComment(editorState.comment)
    setSelectedBlocks(editorState.selectedBlocks)
    setTimers(editorState.timers)
    setEditorBaseline(editorState)
    setIsBlockPickerOpen(false)
    setExpandedBlockIds(new Set())
    setRemovedBlock(null)
    setSelectedWeekIndex(weeks.findIndex((item) => item.id === week.id))
  }

  function handleSelectDay(nextDate: string) {
    editorNavigationRef.current++
    defaultsSuppressedDateRef.current = null
    setDate(nextDate)
    const editorState = getSessionEditorState(nextDate, templates, sessions, membership && membership.weekId === planWeek?.id && membership.status === 'ready' ? membership.keys : [])
    setComment(editorState.comment)
    setSelectedBlocks(editorState.selectedBlocks)
    setExpandedBlockIds(new Set())
    setRemovedBlock(null)
    setTimers(editorState.timers)
    setEditorBaseline(editorState)
    setIsBlockPickerOpen(false)
  }

  function handleOpenRecentSession(session: SessionWithBlocks) {
    editorNavigationRef.current++
    defaultsSuppressedDateRef.current = null
    const sessionWeekIndex = session.week_id
      ? weeks.findIndex((weekItem) => weekItem.id === session.week_id)
      : weeks.findIndex((weekItem) => weekItem.start_date <= session.session_date && weekItem.end_date >= session.session_date)
    const nextWeek = sessionWeekIndex >= 0 ? weeks[sessionWeekIndex] : null
    const editorState = getSessionEditorState(session.session_date, templates, sessions)

    if (nextWeek) {
      setPlanWeek(nextWeek)
      setProgramName(programs.find((program) => program.id === nextWeek.program_id)?.name ?? null)
      setSelectedWeekIndex(sessionWeekIndex)
    } else {
      setPlanWeek(null)
      setProgramName(null)
    }
    setDate(session.session_date)
    setComment(editorState.comment)
    setSelectedBlocks(editorState.selectedBlocks)
    setTimers(editorState.timers)
    setEditorBaseline(editorState)
    setIsBlockPickerOpen(false)
    setExpandedBlockIds(new Set())
    setRemovedBlock(null)
  }

  function toggleBlock(templateId: string, done: boolean) {
    const current = latestEditorRef.current
    const block = current.selectedBlocks.find((item) => item.id === templateId)
    if (!block) return
    editorRevisionRef.current++
    if (!block.done && done) {
      const nowMs = Date.now()
      playbackBlockedRef.current.add(`${date}:${templateId}`)
      const nextTimers = completeBlockTimer(current.timers, templateId, done, nowMs)
      commitPracticeProgress(current.selectedBlocks.map((entry) => entry.id === templateId ? { ...entry, done } : entry), nextTimers, true)
      return
    }
    commitPracticeProgress(current.selectedBlocks.map((entry) => entry.id === templateId ? { ...entry, done } : entry), current.timers, true)
  }

  function commitPracticeProgress(blocks: SelectedBlock[], nextTimers: Record<string, BlockTimerState>, checkpoint: boolean) {
    const current = latestEditorRef.current
    const next = { ...current, selectedBlocks: blocks, timers: nextTimers }
    latestEditorRef.current = next
    setSelectedBlocks(blocks)
    setTimers(nextTimers)
    if (checkpoint) void queueSessionSave(next)
  }

  function toggleBlockDetails(templateId: string, blockKey: string) {
    materialNavigationRef.current++
    const isOpening = !expandedBlockIds.has(templateId)
    setExpandedBlockIds(isOpening ? new Set([templateId]) : new Set())
    if (isOpening) {
      if (activeMaterial && activeMaterial.blockKey !== blockKey) setActiveMaterialState(null)
      if (activeDefaultMaterial && activeDefaultMaterial.blockKey !== blockKey) setActiveDefaultMaterial(null)
      void loadBlockMaterials(blockKey)
      if (isSongBlock(blockKey)) selectedDaySongs.filter((row) => row.block_key === blockKey).forEach((row) => { void loadBlockMaterials(blockKey, row.song_id) })
    }
  }

  const songsUnavailable = () => t('songs.unavailable')
  const songLoadError = useEffectEvent(() => t('songs.unavailable'))

  async function reloadSongLibrary() {
    const access = captureMaterialAccess()
    const songs = await fetchPracticeSongs()
    if (materialsMountedRef.current && isLocalMaterialAccessCurrent(access)) setSongLibrary(songs)
    return songs
  }

  useEffect(() => {
    if (!templates.length || loading) return
    let cancelled = false
    const request = ++songRequestRef.current
    const selectedDate = date
    const access = materialAccess
    setSongsLoading(true)
    setSongsError(null)
    setDaySongs([])
    setSongsDate('')
    const selectedWeekId = planWeek?.id ?? null
    Promise.all([fetchPracticeSongs(), fetchDaySongs(selectedDate), selectedWeekId ? fetchWeekPracticeSongs(selectedWeekId) : Promise.resolve([])]).then(([songs, choices, plannedSongs]) => {
      if (cancelled || request !== songRequestRef.current || songDateRef.current !== selectedDate || !materialsMountedRef.current || !isLocalMaterialAccessCurrent(access)) return
      setSongLibrary(songs)
      setWeeklySongs(selectedWeekId ? { weekId: selectedWeekId, songs: plannedSongs } : null)
      setDaySongs(choices)
      setSongsDate(selectedDate)
      const effective = withWeekPracticeSongs(selectedDate, plannedSongs, choices)
      setEditorBaseline((current) => withDaySongBlocks(current, effective, templates))
      setSelectedBlocks((current) => withDaySongBlocks({ comment: '', timers: {}, selectedBlocks: current }, effective, templates).selectedBlocks)
    }).catch(() => {
      if (!cancelled && request === songRequestRef.current && songDateRef.current === selectedDate && materialsMountedRef.current && isLocalMaterialAccessCurrent(access)) setSongsError(songLoadError())
    }).finally(() => {
      if (!cancelled && request === songRequestRef.current && songDateRef.current === selectedDate && materialsMountedRef.current && isLocalMaterialAccessCurrent(access)) setSongsLoading(false)
    })
    return () => { cancelled = true }
  }, [date, planWeek?.id, templates, materialAccess, loading])

  function applyDaySongs(choices: DaySong[], key?: SongBlockKey) {
    setDaySongs(choices)
    setSongsDate(date)
    const effective = withWeekPracticeSongs(date, inheritedSongs, choices)
    setEditorBaseline((current) => withDaySongBlocks(current, effective, templates))
    setSelectedBlocks((current) => withDaySongBlocks({ comment: '', timers: {}, selectedBlocks: current }, effective, templates).selectedBlocks)
    const template = templates.find((item) => item.key === key)
    if (template) {
      setExpandedBlockIds(new Set([template.id]))
      void loadBlockMaterials(key!)
    }
  }

  async function practiceSong(song: PracticeSong, key: SongBlockKey = 'repertoire') {
    if (songOperationRef.current || !templates.some((template) => template.key === key)) return
    const selectedDate = date
    const access = captureMaterialAccess()
    songRequestRef.current++
    setSongsLoading(false)
    songOperationRef.current = true
    setSongBusy(true)
    setSongsError(null)
    try {
      await selectDaySong(selectedDate, key, song.id, true)
      const choices = await fetchDaySongs(selectedDate)
      if (!materialsMountedRef.current || !isLocalMaterialAccessCurrent(access) || songDateRef.current !== selectedDate) return
      applyDaySongs(choices, key)
    } catch { if (isLocalMaterialAccessCurrent(access)) setSongsError(songsUnavailable()) }
    finally { songOperationRef.current = false; if (isLocalMaterialAccessCurrent(access)) setSongBusy(false) }
  }

  async function addLibrarySong(key?: SongBlockKey) {
    const name = (key ? learnSongName : newSongName).trim()
    if (!name || songOperationRef.current) return
    const selectedDate = date
    const access = captureMaterialAccess()
    songRequestRef.current++
    setSongsLoading(false)
    songOperationRef.current = true
    setSongBusy(true)
    setSongsError(null)
    try {
      const songId = await createPracticeSong(name, key ? selectedDate : undefined, key)
      await reloadSongLibrary()
      if (!materialsMountedRef.current || !isLocalMaterialAccessCurrent(access)) return
      const choices = await fetchDaySongs(selectedDate)
      if (songDateRef.current !== selectedDate || !isLocalMaterialAccessCurrent(access)) return
      applyDaySongs(choices, key)
      if (key) {
        setLearnSongName('')
        setOpenSongRows((current) => new Set([...current, `${key}:${songId}`]))
        void loadBlockMaterials(key, songId)
      } else setNewSongName('')
    } catch { if (isLocalMaterialAccessCurrent(access)) setSongsError(songsUnavailable()) }
    finally { songOperationRef.current = false; if (isLocalMaterialAccessCurrent(access)) setSongBusy(false) }
  }

  async function removeLibrarySong(id: string) {
    if (songOperationRef.current) return
    const song = songLibrary.find((entry) => entry.id === id)
    if (songNotesOperationsRef.current.has(id) || (song && Object.hasOwn(songNotesDrafts, id) && songNotesDrafts[id] !== (songNotesValue(song) ?? ''))) {
      setSongsError(t('songTools.saveBeforeRemove'))
      return
    }
    const access = captureMaterialAccess()
    const selectedDate = date
    songRequestRef.current++
    setSongsLoading(false)
    songOperationRef.current = true
    setSongBusy(true)
    try {
      await archivePracticeSong(id)
      if (!isLocalMaterialAccessCurrent(access)) return
      setSongLibrary((current) => current.filter((song) => song.id !== id))
      setSongToRemove(null)
      const choices = await fetchDaySongs(selectedDate)
      if (songDateRef.current === selectedDate && isLocalMaterialAccessCurrent(access)) applyDaySongs(choices)
    } catch { if (isLocalMaterialAccessCurrent(access)) setSongsError(songsUnavailable()) }
    finally { songOperationRef.current = false; if (isLocalMaterialAccessCurrent(access)) setSongBusy(false) }
  }

  async function moveLegacyMaterial(blockKey: string, material: LocalMaterial) {
    const songId = legacySongChoices[material.id]
    if (!songId) return
    const access = captureMaterialAccess()
    try {
      await assignLocalMaterialToSong(access, { id: material.id, blockKey }, songId)
      if (!isLocalMaterialAccessCurrent(access)) return
      await loadBlockMaterials(blockKey)
      await loadBlockMaterials('song', songId)
    } catch { if (isLocalMaterialAccessCurrent(access)) patchMaterialFeedback(blockKey, { error: t('Could not save material changes.') }) }
  }

  function addBlock(template: BlockTemplate) {
    if (!isSelectableCatalogBlock(template) || selectedBlocks.some((block) => block.id === template.id)) return
    editorRevisionRef.current++

    setTemplates((current) => current.some((item) => item.id === template.id) ? current : [...current, template])
    setSelectedBlocks((current) => current.some((block) => block.key === template.key) ? current : [
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
    setAnnouncement(t('{label} added', { label: template.label }))
    if (!isBlockPickerOpen) pendingFocusBlockIdRef.current = template.id
  }

  function clearRemovedBlockTimeout() {
    if (removedBlockTimeoutRef.current !== null) {
      window.clearTimeout(removedBlockTimeoutRef.current)
      removedBlockTimeoutRef.current = null
    }
  }

  async function updateRemovedSongChoices(choices: DaySong[], selectedDate: string, selected: boolean, access: LocalMaterialAccess) {
    const results = await Promise.allSettled(choices.map((row) => selectDaySong(selectedDate, row.block_key as SongBlockKey, row.song_id, selected)))
    if (results.every((result) => result.status === 'fulfilled')) return
    // Reconcile partial network failures only after every write settles.
    try {
      const actual = await fetchDaySongs(selectedDate)
      if (songDateRef.current === selectedDate && isLocalMaterialAccessCurrent(access)) applyDaySongs(actual)
    } catch { /* Keep the current editor and surface the failed save below. */ }
    throw new Error('Song selection could not be saved')
  }

  async function removeBlock(templateId: string) {
    const block = selectedBlocks.find((item) => item.id === templateId)
    const choices = (songsDate === date ? daySongs : []).filter((row) => row.block_key === block?.key)
    if (choices.length) {
      if (songOperationRef.current) return
      const selectedDate = date
      const access = captureMaterialAccess()
      songRequestRef.current++
      setSongsLoading(false)
      songOperationRef.current = true
      setSongBusy(true)
      try {
        await updateRemovedSongChoices(choices, selectedDate, false, access)
        if (songDateRef.current !== selectedDate || !isLocalMaterialAccessCurrent(access)) return
        setDaySongs((current) => current.filter((row) => row.block_key !== block?.key))
        removedDaySongsRef.current = choices
      } catch { if (isLocalMaterialAccessCurrent(access)) setSongsError(songsUnavailable()); return }
      finally { songOperationRef.current = false; if (isLocalMaterialAccessCurrent(access)) setSongBusy(false) }
    } else removedDaySongsRef.current = []
    removeBlockLocally(templateId)
  }

  function removeBlockLocally(templateId: string) {
    const index = selectedBlocks.findIndex((block) => block.id === templateId)
    if (index < 0) return
    editorRevisionRef.current++
    const block = selectedBlocks[index]
    const timer = timers[templateId] ? pauseBlockTimer(timers[templateId], Date.now()) : undefined

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

  async function undoRemoveBlock() {
    if (!removedBlock) return
    const choices = removedDaySongsRef.current
    if (choices.length) {
      const selectedDate = date
      const access = captureMaterialAccess()
      if (songOperationRef.current) return
      songRequestRef.current++
      setSongsLoading(false)
      songOperationRef.current = true
      setSongBusy(true)
      try {
        await updateRemovedSongChoices(choices, selectedDate, true, access)
        if (songDateRef.current !== selectedDate || !isLocalMaterialAccessCurrent(access)) return
        setDaySongs((current) => [...current.filter((row) => !choices.some((choice) => choice.song_id === row.song_id && choice.block_key === row.block_key)), ...choices])
      } catch { if (isLocalMaterialAccessCurrent(access)) setSongsError(songsUnavailable()); return }
      finally { songOperationRef.current = false; if (isLocalMaterialAccessCurrent(access)) setSongBusy(false) }
    }
    undoRemoveBlockLocally()
  }

  function undoRemoveBlockLocally() {
    if (!removedBlock) return
    editorRevisionRef.current++
    const { block, timer, index } = removedBlock
    clearRemovedBlockTimeout()
    setRemovedBlock(null)
    setSelectedBlocks((current) => {
      if (current.some((item) => item.id === block.id)) return current
      const next = [...current]
      next.splice(Math.min(index, next.length), 0, block)
      return next
    })
    if (timer) setTimers((current) => ({ ...current, [block.id]: timer }))
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
    gainNode.gain.exponentialRampToValueAtTime(0.25, context.currentTime + 0.35)
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
    function prepareTour() {
      setIsMetronomeSettingsOpen(false)
      setIsTunerOpen(false)
      setIsBlockPickerOpen(false)
      if (metronomeHoldTimerRef.current !== null) window.clearTimeout(metronomeHoldTimerRef.current)
      if (tunerHoldTimerRef.current !== null) window.clearTimeout(tunerHoldTimerRef.current)
    }
    window.addEventListener('practice-tour-start', prepareTour)
    return () => window.removeEventListener('practice-tour-start', prepareTour)
  }, [])

  useEffect(() => {
    if (!isToolPanelOpen) return

    toolPanelRef.current?.focus({ preventScroll: true })

    function closePanels() {
      setIsMetronomeSettingsOpen(false)
      setIsTunerOpen(false)
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node
      const popup = target instanceof Element ? target.closest<HTMLElement>('[data-app-select-trigger]') : null
      const openerId = popup?.dataset.appSelectTrigger
      if (openerId && toolPanelRef.current?.contains(document.getElementById(openerId))) return
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
    // Read per click so volume changes apply to the next scheduled beat without restarting the scheduler.
    const volume = metronomeClickGain(metronomeVolumeRef.current, accent)

    if (volume > 0.0001) {
      const oscillator = context.createOscillator()
      const gainNode = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(accent ? 880 : 620, time)
      gainNode.gain.setValueAtTime(0.0001, time)
      gainNode.gain.exponentialRampToValueAtTime(volume, time + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.16)

      oscillator.connect(gainNode)
      gainNode.connect(context.destination)
      oscillator.start(time)
      oscillator.stop(time + 0.18)
    }

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
          nextNoteTimeRef.current += metronomeBeatSeconds(clampBpm(bpmRef.current), metronomeBeatUnitRef.current)
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

  function handleMetronomeVolumeChange(value: string) {
    const next = parseMetronomeVolume(value)
    metronomeVolumeRef.current = next
    setMetronomeVolume(next)
    writeMetronomeVolume(next)
  }

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
      metronomeBeatUnitRef.current = normalizedMeasureValue
      return
    }

    const mappedValue = nextMode === '3/4' ? 3 : nextMode === '4/4' ? 4 : 5
    setBeatsPerMeasure(mappedValue)
    setCustomBeatCount(String(mappedValue))
    setCustomMeasureCount('4')
    metronomeBeatUnitRef.current = 4
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
      metronomeBeatUnitRef.current = normalizedValue
    }
  }

  function toggleTimer(templateId: string) {
    editorRevisionRef.current++
    const current = latestEditorRef.current
    const nowMs = Date.now()
    const next = toggleBlockTimer(current.timers, templateId, nowMs)
    const paused = Object.keys(current.timers).filter((id) => current.timers[id].isRunning && !next[id]?.isRunning)
    paused.forEach((id) => playbackBlockedRef.current.add(`${current.date}:${id}`))
    commitPracticeProgress(current.selectedBlocks, next, paused.length > 0)
  }

  function resetTimer(templateId: string) {
    editorRevisionRef.current++
    playbackBlockedRef.current.add(`${date}:${templateId}`)
    setTimers((current) => ({
      ...current,
      [templateId]: resetBlockTimer(),
    }))
    setSelectedBlocks((current) => current.map((block) => block.id === templateId ? { ...block, actualMinutes: '' } : block))
  }

  function updateTimerPart(templateId: string, part: 'minutes' | 'seconds', value: string) {
    editorRevisionRef.current++
    const parsedValue = Number(value)
    if (!Number.isFinite(parsedValue) || parsedValue < 0) return
    const nowMs = Date.now()
    setTimers((current) => {
      const edited = editBlockTimer(current[templateId], part, value, nowMs)
      return edited ? { ...current, [templateId]: edited } : current
    })
    setSelectedBlocks((current) => current.map((block) => block.id === templateId ? { ...block, actualMinutes: '' } : block))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!canSave) return
    await queueSessionSave(latestEditorRef.current, true)
  }

  function queueSessionSave(state: SessionEditorState, manual = false) {
    const access = materialAccess
    if (!isLocalMaterialAccessCurrent(access)) return Promise.resolve()
    const owner = localMaterialOwner(access)
    const origin = latestEditorRef.current
    const selectedDate = origin.date
    const weekId = origin.weekId
    const navigation = editorNavigationRef.current
    const revision = editorRevisionRef.current
    const captured: SessionEditorState = {
      comment: state.comment,
      selectedBlocks: state.selectedBlocks.map((block) => ({ ...block })),
      timers: snapshotBlockTimers(state.timers, Date.now(), true),
    }
    const catalog = [...templates]
    pendingSavesRef.current++
    setSaving(true)
    setPendingDiscardAction(null)
    setMessage(null)
    setError(null)
    const sameEditor = () => materialsMountedRef.current && isLocalMaterialAccessCurrent(access)
      && latestEditorRef.current.date === selectedDate && latestEditorRef.current.weekId === weekId
      && editorNavigationRef.current === navigation
    const assertOwner = () => {
      if (!isLocalMaterialAccessCurrent(access) || localMaterialOwner(access) !== owner) throw new Error(t('Not signed in.'))
    }
    return saveQueue.enqueue(async () => {
      assertOwner()
      const savedSession = sessionsRef.current.find((session) => session.session_date === selectedDate && session.user_id === owner)
      if (savedSession && hasUnsupportedSessionBlocks(savedSession.session_blocks, catalog)) {
        throw new Error(t('Cannot save this session because it contains unsupported legacy blocks. All saved blocks and notes have been preserved.'))
      }
      const saveTimers = captured.timers
      const saveBlocks = selectPracticedSessionBlocks(captured.selectedBlocks.map((block) => ({
        key: block.key, label: block.label, done: block.done, targetMinutes: block.targetMinutes,
        actualMinutes: block.actualMinutes, elapsedSeconds: saveTimers[block.id]?.elapsedSeconds,
      })))
      const saveTotalMinutes = saveBlocks.reduce((sum, block) => sum + (sessionBlockMinutes(block) ?? 0), 0)
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      assertOwner()
      if (authError || user?.id !== owner) throw new Error(t('Not signed in.'))
      // Detect an unapplied precision migration before modifying any parent or child row.
      const { error: precisionError } = await supabase.from('session_blocks').select('actual_seconds').limit(0)
      assertOwner()
      if (precisionError) throw new Error(t('practice.precisionUnavailable'))
      if (!savedSession && saveBlocks.length === 0 && captured.comment.trim() === '') {
        if (sameEditor()) setMessage(t('Nothing was saved. Log practice time or mark a block done first.'))
        return
      }
      let nextSession: SessionWithBlocks | null = null
      if (savedSession && shouldDeleteClearedSession(true, saveBlocks.length, captured.comment)) {
        assertOwner()
        const { error: deletionError } = await supabase.from('sessions').delete()
          .eq('id', savedSession.id).eq('user_id', owner).eq('session_date', selectedDate).select('id').single()
        assertOwner()
        if (deletionError) throw deletionError
        if (sameEditor()) defaultsSuppressedDateRef.current = selectedDate
      } else {
        assertOwner()
        const { data: sessionData, error: sessionError } = await supabase.from('sessions').upsert({
          user_id: owner, session_date: selectedDate, total_minutes: saveTotalMinutes,
          comment: captured.comment.trim() || null, week_id: weekId, source: 'app',
        }, { onConflict: 'user_id,session_date' }).select().single()
        assertOwner()
        if (sessionError || !sessionData) throw sessionError ?? new Error(t('Could not save the session.'))
        const blockSavePlan = planSessionBlockSave(sessionData.id, saveBlocks)
        const removal = supabase.from('session_blocks').delete().eq('session_id', sessionData.id)
        const { error: removalError } = blockSavePlan.blockKeysToKeep.length
          ? await removal.not('block_key', 'in', '(' + blockSavePlan.blockKeysToKeep.join(',') + ')') : await removal
        assertOwner()
        if (removalError) throw removalError
        let rows: SessionBlock[] = []
        if (blockSavePlan.upserts.length) {
          const { data, error: blocksError } = await supabase.from('session_blocks')
            .upsert(blockSavePlan.upserts, { onConflict: 'session_id,block_key' }).select()
          assertOwner()
          if (blocksError) throw blocksError
          rows = data ?? []
        }
        nextSession = { ...sessionData, session_blocks: rows }
      }
      assertOwner()
      const updated = sessionsRef.current.filter((session) => session.id !== savedSession?.id && !(session.user_id === owner && session.session_date === selectedDate))
      if (nextSession) updated.push(nextSession)
      sessionsRef.current = updated
      if (materialsMountedRef.current) setSessions(updated)
      if (sameEditor() && editorRevisionRef.current === revision) {
        // The live timer/expansion/drafts remain untouched. Only acknowledge the saved revision.
        setEditorBaseline(captured)
        setError(null)
        setMessage(t(!nextSession ? 'Empty session deleted successfully.' : manual ? 'Session saved successfully.' : 'practice.progressSaved'))
      }
    }).catch((problem: unknown) => {
      if (sameEditor()) setError(problem instanceof Error && [t('practice.precisionUnavailable'), t('Not signed in.'), t('Cannot save this session because it contains unsupported legacy blocks. All saved blocks and notes have been preserved.')].includes(problem.message)
        ? problem.message : t('practice.autosaveFailed'))
    }).finally(() => {
      pendingSavesRef.current--
      if (materialsMountedRef.current && isLocalMaterialAccessCurrent(access)) setSaving(pendingSavesRef.current > 0)
    })
  }

  const displayTimers = snapshotBlockTimers(timers, Date.now())
  const totalBlockMinutes = selectedBlocks.reduce((sum, block) => {
    return sum + (sessionBlockMinutes({
      elapsedSeconds: displayTimers[block.id]?.elapsedSeconds,
      actualMinutes: block.actualMinutes,
    }) ?? 0)
  }, 0)

  const selectedWeekDates = getWeekDates(planWeek ?? weeks[selectedWeekIndex] ?? null)
  const adjacentWeeks = adjacentPracticeWeeks(weeks, planWeek?.id)
  const todayDate = toLocalIsoDate()
  const actualCurrentWeek = weeks.find((week) => week.start_date <= todayDate && week.end_date >= todayDate)
  const isConfiguredProgram = readProgramBlockMode(programs.find((program) => program.id === planWeek?.program_id)?.block_set_mode) !== 'legacy_unconfigured'
  const membershipPending = isConfiguredProgram && (!membership || membership.weekId !== planWeek?.id || membership.status === 'pending')
  const practicedDates = getPracticedDates(sessions)
  const isPastDay = date < todayDate
  const savedForDate = hasSavedSession(date, sessions)
  const hasUnsavedSongNotes = Object.entries(songNotesDrafts).some(([songId, draft]) => {
    const song = songLibrary.find((entry) => entry.id === songId) ?? selectedDaySongs.find((entry) => entry.song_id === songId)?.songs
    return song ? draft !== (songNotesValue(song) ?? '') : draft !== ''
  })
  const isDirty = isSessionEditorDirty(editorBaseline, { comment, timers: displayTimers, selectedBlocks }) || hasUnsavedSongNotes
  const canSave = selectedBlocks.length > 0 || savedForDate
  const selectableTemplates = templates.filter(isSelectableCatalogBlock)

  function confirmDiscard(action: () => void, leavesPractice = false) {
    if (saving || (leavesPractice && songNotesSaving.size > 0)) return
    const currentTimers = snapshotBlockTimers(timers, Date.now())
    setTimers(currentTimers)
    const dirty = isSessionEditorDirty(editorBaseline, { comment, timers: currentTimers, selectedBlocks }) || (leavesPractice && hasUnsavedSongNotes)
    if (dirty) setPendingDiscardAction({ run: () => { if (leavesPractice) setSongNotesDrafts({}); action() } })
    else action()
  }

  function renderBlockPicker(options: BlockTemplate[], layout: 'gallery' | 'dialog' = 'gallery') {
    const navigation = editorNavigationRef.current
    return (
      <BlockGallery
        layout={layout}
        blocks={options}
        selectedKeys={selectedBlocks.map((block) => block.key)}
        selectionBehavior="add"
        loading={catalogLoading}
        error={catalogError}
        onRetry={() => {
          setCatalogLoading(true)
          setCatalogError(null)
          void loadSessionRestorationCatalog().then((blocks) => setTemplates(blocks.map((block) => ({ ...block, label: catalogBlockLabel(block, t) })))).catch((loadError: unknown) => {
            setCatalogError(loadError instanceof Error ? loadError.message : t('Could not load the block catalog.'))
          }).finally(() => setCatalogLoading(false))
        }}
        onSelect={(block) => { if (navigation === editorNavigationRef.current) addBlock({ ...block, label: catalogBlockLabel(block, t) }) }}
        onCreateOther={async (label) => {
          const block = await createOtherBlock(label)
          const localized = { ...block, label: catalogBlockLabel(block, t) }
          setTemplates((current) => current.some((item) => item.key === localized.key) ? current : [...current, localized])
          return localized
        }}
      />
    )
  }

  function closeBlockPicker() {
    setIsBlockPickerOpen(false)
  }

  useEffect(() => {
    setIsBlockPickerOpen(false)
  }, [date, planWeek?.id, planWeek?.program_id])

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
                  <AppSelect
                    value={timeSignatureMode}
                    onValueChange={(value) => handleTimeSignatureChange(value as '3/4' | '4/4' | '5/4' | 'custom')}
                    options={[{ value: '3/4', label: '3/4' }, { value: '4/4', label: '4/4' }, { value: '5/4', label: '5/4' }, { value: 'custom', label: t('Custom') }]}
                    aria-label={t('Time')}
                    className="mt-1 h-11 rounded border border-slate-700 bg-slate-950 px-2 text-base text-slate-200"
                  />
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

                <label className="text-xs text-slate-400">
                  {t('metronome.volume')}
                  <span className="mt-1 flex h-11 items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={metronomeVolume}
                      onChange={(event) => handleMetronomeVolumeChange(event.target.value)}
                      aria-valuetext={t('metronome.volumeValue', { value: metronomeVolume })}
                      className="h-11 w-32 accent-sky-400"
                    />
                    <span aria-hidden="true" className="min-w-10 text-right text-sm text-slate-200">{t('metronome.volumeValue', { value: metronomeVolume })}</span>
                  </span>
                </label>

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
                  <AppSelect
                    value={tuningKey}
                    onValueChange={(value) => {
                      stopReferenceTone()
                      setTuningKey(value as TuningKey)
                    }}
                    options={Object.entries(tuningPresets).map(([key, tuning]) => ({ value: key, label: t(tuning.label) }))}
                    className="h-11 w-full rounded border border-slate-700 bg-slate-950 px-2 text-base text-slate-200"
                    aria-label={t('Guitar tuning')}
                  />
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
        <div>
          {actualCurrentWeek && planWeek?.id !== actualCurrentWeek.id && <div className="flex items-center gap-2 text-xs text-slate-400">
            <label htmlFor="practice-week-select">{t('Jump to')}</label>
            <button type="button" disabled={saving} onClick={() => confirmDiscard(() => handleSelectWeek(actualCurrentWeek))} className="min-h-11 rounded text-xs text-slate-400 underline underline-offset-4 hover:text-slate-200 focus-visible:outline-2 focus-visible:outline-sky-400 disabled:opacity-40">{t('Current week')}</button>
          </div>}
          <div className="practice-week-navigation mt-1 items-center">
          <button
            type="button"
            disabled={saving || !adjacentWeeks.previous}
            onClick={() => { const target = adjacentWeeks.previous; if (target) confirmDiscard(() => handleSelectWeek(target)) }}
            aria-label={adjacentWeeks.previous ? t('practice.previousWeekLabel', { week: adjacentWeeks.previous.week_number }) : t('practice.previousWeek')}
            title={t('practice.previousWeek')}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded border border-slate-700 text-slate-200 hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5l-5 5 5 5" /></svg>
          </button>
          <AppSelect
            id="practice-week-select"
            aria-label={t('Jump to')}
            value={planWeek?.id ?? ''}
            disabled={saving || weeks.length === 0}
            onValueChange={(value) => {
              const targetWeek = weeks.find((weekItem) => weekItem.id === value)
              if (targetWeek) confirmDiscard(() => handleSelectWeek(targetWeek))
            }}
            options={weeks.map((weekItem) => ({
              value: weekItem.id,
              label: t('Week {week}', { week: weekItem.week_number }) + (weekItem.focus ? ' - ' + weekItem.focus : '') + (weekItem.id === actualCurrentWeek?.id ? ' - ' + t('Current week') : ''),
              className: weekItem.id === actualCurrentWeek?.id ? 'font-semibold text-sky-300 bg-sky-500/10' : undefined,
            }))}
            className="h-11 min-w-0 flex-1 rounded border border-slate-700 bg-slate-950 px-3 text-base text-slate-200 focus:border-slate-500"
          />
          <button
            type="button"
            disabled={saving || !adjacentWeeks.next}
            onClick={() => { const target = adjacentWeeks.next; if (target) confirmDiscard(() => handleSelectWeek(target)) }}
            aria-label={adjacentWeeks.next ? t('practice.nextWeekLabel', { week: adjacentWeeks.next.week_number }) : t('practice.nextWeek')}
            title={t('practice.nextWeek')}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded border border-slate-700 text-slate-200 hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 5l5 5-5 5" /></svg>
          </button>
          </div>
        </div>

      </section>

      <section className="pb-4">
        <div className="flex items-center gap-3">
          <h1 id="practice-session-heading" className="min-w-0 text-xl font-semibold">{t('Session {date}', { date: formatHeadingDate(date, language) })}</h1>
          <span aria-label={t('Practice time')} className="shrink-0 rounded-lg border border-slate-600 bg-slate-900 px-3 py-1 text-xl font-semibold tabular-nums text-slate-100">{t('{minutes} min', { minutes: totalBlockMinutes })}</span>
        </div>

        <div className="mt-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0">
          <h2 className="min-w-0 flex-1 text-base font-semibold text-slate-100">
            <button
              type="button"
              onClick={() => setIsWeekDetailsOpen((current) => !current)}
              aria-expanded={isWeekDetailsOpen}
              aria-controls="practice-week-details"
              className="flex min-h-11 w-full items-center justify-between gap-2 rounded text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
            >
              <span className="min-w-0 [overflow-wrap:anywhere]">{planWeek?.focus ?? t('No week selected')}</span>
              <svg aria-hidden="true" viewBox="0 0 20 20" className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${isWeekDetailsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 7.5l5 5 5-5" /></svg>
            </button>
          </h2>
          </div>
          <div id="practice-week-details" hidden={!isWeekDetailsOpen} className="pb-2">
            <p className="text-sm text-slate-400">
              {programName ?? '—'} · {planWeek ? formatDateRange(planWeek.start_date, planWeek.end_date, language) : '—'}
            </p>
            <button type="button" disabled={!planWeek || saving || songNotesSaving.size > 0} onClick={() => { if (planWeek) confirmDiscard(() => navigate(`/plan?week=${encodeURIComponent(planWeek.id)}`), true) }} className="inline-flex min-h-11 items-center gap-1 rounded text-xs text-sky-300 underline underline-offset-4 hover:text-sky-100 focus-visible:outline-2 focus-visible:outline-sky-400 disabled:text-slate-500">{t('Week description')}<span aria-hidden="true">↗</span></button>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">
              {planWeek?.tasks?.trim() || t('No description recorded for this week yet.')}
            </p>
          </div>
        </div>

        <div data-tour="practice-days" role="group" aria-label={t('Days in selected week')} className="mt-2">
          <div ref={dayStripRef} className="relative flex snap-x gap-2 overflow-x-auto pb-1">
            {selectedWeekDates.map((day) => {
              const isSelectedDay = day === date
              const isToday = day === todayDate
              const isCompleted = day < todayDate && practicedDates.has(day)
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
        aria-labelledby="practice-session-heading"
        className="border-t border-slate-800 py-4 focus:outline-none"
      >
        {selectedBlocks.length === 0 && (
          <div data-tour="practice-block-picker" className="mt-3">
            <p className="text-base font-medium text-slate-100">{t('No blocks yet')}</p>
            <p className="mt-1 text-sm text-slate-400">
              {isPastDay && !savedForDate ? t('No practice was logged for this day.') : t('Choose what to practice first.')}
            </p>
          </div>
        )}
        {membershipPending && <p role="status" className="mt-3 text-sm text-slate-400">{t('Loading blocks…')}</p>}
        {isConfiguredProgram && membership && membership.weekId === planWeek?.id && membership.status === 'error' && (
          <div role="alert" className="mt-3 flex flex-wrap items-center gap-3">
            <p className="msg-error">{membership.error}</p>
            <button type="button" onClick={() => setMembershipRetry((value) => value + 1)} className="btn btn-secondary">{t('Retry')}</button>
          </div>
        )}

        <div className="mt-3">
            {selectedBlocks.map((selected) => {
              const template = templates.find((item) => item.id === selected.id)

              if (!template) return null

              const elapsedSeconds = Math.floor(displayTimers[template.id]?.elapsedSeconds ?? 0)
              const timerMinutes = Math.floor(elapsedSeconds / 60)
              const timerSeconds = elapsedSeconds % 60
              const isExpanded = expandedBlockIds.has(template.id)
              const defaultMaterials = getDefaultMaterials(language, template.key, isPracticeKeyBlock(template.key) ? practiceKeys[template.key] : undefined).filter((material) => material.filePath)
              const isTimerRunning = timers[template.id]?.isRunning ?? false
              const timerActionLabel = `${t(isTimerRunning ? 'Pause' : 'Start')}: ${template.label}`
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
                          onChange={(event) => toggleBlock(template.id, event.target.checked)}
                          aria-label={template.label}
                          className="h-5 w-5 rounded border-slate-700 bg-slate-950"
                        />
                      </label>
                      <h3 className="min-w-0 flex-1">
                        <button
                          type="button"
                          id={`block-header-${template.id}`}
                          data-tour="practice-details"
                          aria-expanded={isExpanded}
                          onClick={() => toggleBlockDetails(template.id, template.key)}
                          className="flex min-h-14 w-full min-w-0 scroll-mt-32 items-center justify-between gap-2 rounded-lg px-2 text-left transition hover:bg-slate-800/60 active:bg-slate-800"
                        >
                          <span className="min-w-0 break-words text-base font-semibold text-slate-100">{template.label}</span>
                        </button>
                      </h3>
                      {!isExpanded && (
                        <div className="flex shrink-0 items-center gap-1 whitespace-nowrap text-sm text-slate-300">
                          <span aria-hidden="true" className="h-6 border-l border-slate-700" />
                          <span className="font-mono" aria-label={t('Timer')}>{String(timerMinutes).padStart(2, '0')}:{String(timerSeconds).padStart(2, '0')}</span>
                          <button
                            type="button"
                            onClick={() => toggleTimer(template.id)}
                            aria-label={timerActionLabel}
                            title={timerActionLabel}
                            className="flex min-h-11 min-w-11 items-center justify-center rounded text-sky-300 hover:bg-slate-800/60 hover:text-sky-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
                          >
                            <PracticeTimerIcon isRunning={isTimerRunning} />
                          </button>
                          <span aria-hidden="true" className="h-6 border-l border-slate-700" />
                        </div>
                      )}
                      <button
                        type="button"
                        disabled={isSongBlock(template.key) && (songBusy || songsLoading)}
                        onClick={() => { void removeBlock(template.id) }}
                        aria-label={t('Remove block')}
                        title={t('Remove block')}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                      >
                        <RemoveBlockIcon />
                      </button>
                    </div>
                    {isPracticeKeyBlock(template.key) && (() => {
                      const blockKey = template.key
                      return (
                        <div className="flex min-h-11 flex-wrap items-center gap-x-3 pl-11 text-sm">
                          <span role="status" aria-live="polite" className="font-semibold text-sky-200">
                            {t(blockKey === 'major_scales' ? 'practice.keyMajor' : 'practice.keyMinor', { key: formatPracticeKey(practiceKeys[blockKey], language) })}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const nextKey = pickPracticeKey(blockKey, practiceKeys[blockKey])
                              setPracticeKeys((current) => ({ ...current, [blockKey]: nextKey }))
                              setActiveDefaultMaterial((current) => {
                                if (current?.blockKey !== blockKey) return current
                                const nextMaterial = getDefaultMaterials(language, blockKey, nextKey)[0]
                                return nextMaterial?.filePath ? { blockKey, title: nextMaterial.title, url: nextMaterial.filePath } : null
                              })
                            }}
                            aria-label={t('practice.rerollKeyLabel', { block: template.label })}
                            className="min-h-11 min-w-11 rounded px-3 text-sm font-medium text-sky-300 hover:text-sky-100"
                          >
                            {t('practice.rerollKey')}
                          </button>
                        </div>
                      )
                    })()}
                    {!isExpanded && showTargetPracticeTime && <div className="flex min-h-11 items-center pl-11 text-sm text-slate-300">
                      <span>{t('Target: {minutes} min', { minutes: template.target_minutes ?? 0 })}</span>
                    </div>}

                    {isExpanded && (
                      <div className="ml-3 min-w-0 pb-3">
                        <p className="text-sm text-slate-300">
                          {template.description?.trim() || t('No description available for this practice block.')}
                        </p>
                        {showTargetPracticeTime && <p className="mt-1 text-sm text-slate-400">{t('Target: {minutes} min', { minutes: template.target_minutes ?? 0 })}</p>}
                        <fieldset className="mt-3 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-300">
                          <legend className="sr-only">{t('Timer')}</legend>
                          {!isSongBlock(template.key) && renderMaterialAddControls(template.key)}
                          <button
                            type="button"
                            onClick={() => toggleTimer(template.id)}
                            aria-label={timerActionLabel}
                            title={timerActionLabel}
                            className="flex min-h-11 min-w-11 items-center justify-center rounded bg-slate-800 text-sky-300 hover:bg-slate-700 hover:text-sky-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
                          >
                            <PracticeTimerIcon isRunning={isTimerRunning} />
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
                        {isSongBlock(template.key) && <section className="mt-3 space-y-2 border-t border-slate-800 pt-3" aria-label={t('Songs')}>
                          {template.key === 'learn_song' && <div className="flex flex-wrap gap-2"><input aria-label={t('Song name')} placeholder={t('Song name')} value={learnSongName} onChange={(event) => setLearnSongName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void addLibrarySong('learn_song') } }} className="field min-w-0 flex-1" /><button type="button" disabled={songBusy || !learnSongName.trim()} onClick={() => void addLibrarySong('learn_song')} className="btn btn-secondary">{t('Add song')}</button></div>}
                          {songsError && <p role="alert" className="msg-error">{songsError}</p>}
                          {blockFeedback.error && <p role="alert" className="msg-error">{blockFeedback.error}</p>}
                          {selectedDaySongs.filter((row) => row.block_key === template.key).map((row) => renderSongMaterials(row.songs, template.key))}
                          {!selectedDaySongs.some((row) => row.block_key === template.key) && <p className="meta">{t('songs.chooseForDay')}</p>}
                          {blockMaterials.length > 0 && <details><summary className="min-h-11 cursor-pointer py-3 text-sm text-slate-300">{t('songs.unassigned')}</summary>{blockMaterials.map((material) => <div key={material.id} className="flex flex-wrap items-center gap-2 py-1"><span className="min-w-0 flex-1 break-words text-sm">{material.name}</span><AppSelect aria-label={t('Song name')} value={legacySongChoices[material.id] ?? ''} options={[{ value: '', label: t('songs.chooseSong') }, ...songLibrary.map((song) => ({ value: song.id, label: song.name }))]} onValueChange={(value) => setLegacySongChoices((current) => ({ ...current, [material.id]: value }))} className="field min-w-0 max-w-full" /><button type="button" disabled={!legacySongChoices[material.id]} onClick={() => void moveLegacyMaterial(template.key, material)} className="btn btn-secondary">{t('songs.move')}</button></div>)}</details>}
                        </section>}
                        {!isSongBlock(template.key) && includeDefaultExercises && defaultMaterials.length > 0 && (
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
                                    <object data={material.filePath} type="application/pdf" aria-label={material.title} className="h-[420px] w-full bg-white">
                                      <p className="p-3 text-sm text-slate-700">{t('If the PDF does not appear, your browser cannot show it inline.')}</p>
                                    </object>
                                    <a href={material.filePath} target="_blank" rel="noreferrer" className="flex min-h-11 items-center text-sm text-sky-300 hover:text-sky-200">
                                      {t('Open in new tab')}
                                    </a>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {!isSongBlock(template.key) && (
                          <div className="mt-3 min-w-0 space-y-2 border-t border-slate-800 pt-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <MaterialSaveStatus saveState={blockFeedback.saveState} savingLabel={t('Saving locally…')} savedLabel={t('Saved on this device')} />
                              {renderUploadActions(blockFeedback, template.key)}
                            </div>
                            {materialCleanupPending && <p role="status" className="text-xs text-amber-300">{t('materials.cleanupPendingNote')}</p>}
                            {blockMaterials.length > 0 && (
                              <div>
                                {blockMaterials.map((material) => (
                                  <div key={material.id} className="flex min-h-11 flex-wrap items-center justify-between gap-2 text-sm">
                                    {materialRename?.id === material.id && materialRename.blockKey === template.key ? (
                                      <form className="flex w-full flex-wrap items-center gap-2" onSubmit={(event) => { event.preventDefault(); void saveMaterialName() }}>
                                        <input autoFocus aria-label={t('Material name')} value={materialRename.draft} disabled={materialRename.saving} onChange={(event) => setMaterialRename((current) => current ? { ...current, draft: event.target.value, error: null } : current)} className="min-h-11 w-full rounded border border-slate-600 bg-slate-950 px-3 text-slate-200" />
                                        <button type="submit" disabled={materialRename.saving} className="min-h-11 rounded border border-slate-600 px-3 text-sky-300 disabled:opacity-40">{t('Save name')}</button>
                                        <button type="button" disabled={materialRename.saving} onClick={() => setMaterialRename(null)} className="min-h-11 px-3 text-slate-300 disabled:opacity-40">{t('Cancel')}</button>
                                        {materialRename.error && <p role="alert" className="w-full text-rose-300">{materialRename.error}</p>}
                                      </form>
                                    ) : (<>
                                    <button
                                      type="button"
                                      onClick={() => setActiveMaterial(template.key, material.id)}
                                      className={`min-h-11 min-w-0 flex-1 truncate text-left hover:text-sky-200 ${activeMaterial?.blockKey === template.key && activeMaterial.id === material.id ? 'text-sky-200' : 'text-sky-300'}`}
                                    >
                                      {material.name}
                                    </button>
                                    <button type="button" aria-label={t('Rename {name}', { name: material.name })} onClick={() => setMaterialRename({ id: material.id, blockKey: template.key, draft: material.name, saving: false, error: null })} className="min-h-11 min-w-11 shrink-0 px-2 text-slate-300">{t('Rename')}</button>
                                    <button
                                      type="button"
                                      onClick={() => { void removeLearningMaterial(template.key, material.id) }}
                                      className="min-h-11 min-w-11 shrink-0 px-2 text-rose-300"
                                    >
                                      {t('Remove')}
                                    </button>
                                    </>)}
                                  </div>
                                ))}
                              </div>
                            )}
                            {renderMaterialViewer(template.key, template.key)}
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

        {(
          <div data-tour="practice-block-picker" className="mt-3">
            <>
              <button
                ref={addBlockButtonRef}
                type="button"
                aria-haspopup="dialog"
                onClick={() => setIsBlockPickerOpen(true)}
                className="flex h-12 w-full items-center justify-center rounded-lg border border-dashed border-slate-600 text-sm font-medium text-slate-200 hover:border-sky-500"
              >
                + {t(selectedBlocks.length > 0 ? 'Add another block' : 'Add a block')}
              </button>
            </>
          </div>
        )}

        {isBlockPickerOpen && (
          <PickerDialog key={`${planWeek?.id}:${planWeek?.program_id}:${date}`} title={t('Add a block')} onClose={closeBlockPicker}>
            {renderBlockPicker(selectableTemplates, 'dialog')}
          </PickerDialog>
        )}
      </section>

      <form onSubmit={handleSubmit} className="space-y-4 border-t border-slate-800 py-4">
        <label className="block space-y-1 text-sm">
          <span className="block text-slate-300">{t('Notes')}</span>
          <textarea
            rows={3}
            value={comment}
            onChange={(event) => { editorRevisionRef.current++; setComment(event.target.value) }}
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

      <section data-tour="practice-songs" className="border-t border-slate-800 py-4">
        <h2><button type="button" aria-expanded={isSongsOpen} aria-controls="practice-songs" onClick={() => setIsSongsOpen((current) => !current)} className="flex min-h-11 w-full items-center justify-between gap-2 text-left text-base font-semibold"><span>{t('Songs')} ({songLibrary.length})</span><span className="text-sm font-normal text-slate-400">{t(isSongsOpen ? 'Hide' : 'Show')}</span></button></h2>
        {isSongsOpen && <div id="practice-songs" className="mt-2 space-y-2">
          <div className="flex flex-wrap gap-2"><input aria-label={t('Song name')} placeholder={t('Song name')} value={newSongName} onChange={(event) => setNewSongName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void addLibrarySong() } }} className="field min-w-0 flex-1" /><button type="button" disabled={songBusy || !newSongName.trim()} onClick={() => void addLibrarySong()} className="btn btn-secondary">{t('Add song')}</button></div>
          {songsLoading && <p role="status" className="meta">{t('Loading songs…')}</p>}
          {songsError && <p role="alert" className="msg-error">{songsError}</p>}
          {!songsLoading && !songsError && songLibrary.length === 0 && <p className="meta">{t('songs.empty')}</p>}
          {songLibrary.map((song) => {
            const selected = selectedDaySongs.some((row) => row.block_key === 'repertoire' && row.song_id === song.id)
            return <div key={song.id} className="border-b border-slate-800 py-1">
              {renderSongMaterials(song, 'song', <div className="flex shrink-0 flex-wrap items-center gap-1"><button type="button" disabled={songBusy || selected || songsLoading} onClick={() => void practiceSong(song)} className="min-h-11 px-2 text-sky-300 disabled:text-slate-400">{t(selected ? 'songs.added' : 'Practice')}</button><button type="button" disabled={songBusy} onClick={() => setSongToRemove(song.id)} className="min-h-11 px-2 text-rose-300">{t('Remove')}</button></div>)}
              {songToRemove === song.id && <div className="flex flex-wrap items-center gap-2 text-sm"><span>{t('songs.removeConfirm')}</span><button type="button" disabled={songBusy} onClick={() => void removeLibrarySong(song.id)} className="min-h-11 px-3 text-rose-300">{t('Remove')}</button><button type="button" onClick={() => setSongToRemove(null)} className="min-h-11 px-3">{t('Cancel')}</button></div>}
            </div>
          })}
        </div>}
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
                        {normalizeBlockLabel(block.label)} {block.done ? '✓' : '—'}
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
