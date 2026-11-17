import { useMemo, useEffect, useRef, useState, type SyntheticEvent } from 'react'
import { useI18n } from '../lib/i18n'
import { clampVideoPosition, createPlaybackTransition, validDuration, videoShortcut, type PlaybackIntent } from '../lib/youtubePractice'
import { loopPlaybackDecision, normalizeLoopRegions, type LoopPlaybackState, type LoopRegion } from '../lib/loopRegions'
import VideoPracticeControls from './VideoPracticeControls'
import { isLocalMaterialIdentityReady, onLocalMaterialInvalidation, onLocalMaterialVerification } from '../lib/localMaterialAccess'
import type { PlaybackBookmark } from '../lib/localMaterials'

type Props = {
  kind?: 'video' | 'audio'
  url: string
  name: string
  bookmarks: PlaybackBookmark[]
  loops?: LoopRegion[]
  onLoopsChange?: (loops: LoopRegion[]) => Promise<void>
  onBookmarksChange: (bookmarks: PlaybackBookmark[]) => Promise<void>
  onPlaybackConfirmed: (intent: PlaybackIntent) => void
}

type MediaEvent = SyntheticEvent<HTMLMediaElement>

export default function LocalVideoPracticePlayer({ kind = 'video', url, name, bookmarks, loops = [], onLoopsChange, onBookmarksChange, onPlaybackConfirmed }: Props) {
  const { t } = useI18n()
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const transitionRef = useRef(createPlaybackTransition())
  const [loopState, setLoopState] = useState<LoopPlaybackState>({ mode: 'off', selectedId: null })
  const loopStateRef = useRef<LoopPlaybackState>(loopState)
  const regionsRef = useRef<LoopRegion[]>([])
  const regions = useMemo(() => normalizeLoopRegions(loops), [loops])
  regionsRef.current = regions
  const seekingRef = useRef(false)
  const automaticRestartRef = useRef(false)
  const mountedRef = useRef(false)
  const source = useMemo(() => ({ url, kind }), [url, kind])
  const activeSourceRef = useRef<typeof source | null>(null)
  const bufferingRef = useRef(false)
  const [duration, setDuration] = useState(0)
  const [position, setPosition] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [rate, setRate] = useState(1)
  const [error, setError] = useState(false)
  const playbackCallbackRef = useRef(onPlaybackConfirmed)
  const shortcuts = kind === 'audio'
    ? t('Audio shortcuts: Space play/pause; Left/Right seek 5 seconds; Shift+Left/Right seek 15 seconds. Native audio controls keep their own shortcuts.')
    : t('Video shortcuts: Space play/pause; Left/Right seek 5 seconds; Shift+Left/Right seek 15 seconds. Native video controls keep their own shortcuts.')
  function changeLoopState(next: LoopPlaybackState) {
    loopStateRef.current = next
    setLoopState(next)
  }
  useEffect(() => {
    if (loopStateRef.current.selectedId && !regionsRef.current.some((region) => region.id === loopStateRef.current.selectedId)) {
      changeLoopState({ mode: 'off', selectedId: null })
    }
  }, [loops])
  useEffect(() => {
    mountedRef.current = true
    activeSourceRef.current = source
    const media = videoRef.current ?? audioRef.current
    if (media) media.src = url
    setDuration(0)
    setPosition(0)
    setPlaying(false)
    setRate(1)
    setError(false)
    transitionRef.current = createPlaybackTransition()
    bufferingRef.current = false
    automaticRestartRef.current = false
    changeLoopState({ mode: 'off', selectedId: null })
    seekingRef.current = false
    const detach = () => {
      mountedRef.current = false
      activeSourceRef.current = null
      transitionRef.current.cancelPlay()
      loopStateRef.current = { mode: 'off', selectedId: null }
      if (media) { media.pause(); media.removeAttribute('src'); media.load() }
    }
    const unsubscribe = onLocalMaterialInvalidation(detach)
    const stopVerification = onLocalMaterialVerification((ready) => { if (!ready) media?.pause() })
    return () => { unsubscribe(); stopVerification(); detach() }
  }, [url, kind, source])
  useEffect(() => { playbackCallbackRef.current = onPlaybackConfirmed }, [onPlaybackConfirmed])

  function mediaElement(): HTMLMediaElement | null {
    return videoRef.current ?? audioRef.current
  }

  function play(explicit: boolean) {
    const media = mediaElement()
    if (!media || !mountedRef.current || !isLocalMaterialIdentityReady()) return
    automaticRestartRef.current = !explicit
    if (explicit) transitionRef.current.requestPlay()
    else transitionRef.current.automaticPlay()
    void media.play().catch(() => {
      if (activeSourceRef.current !== source) return
      transitionRef.current.cancelPlay(); automaticRestartRef.current = false; if (mountedRef.current) setPlaying(false)
    })
  }

  function toggle() {
    const media = mediaElement()
    if (!media) return
    if (media.paused || media.ended) play(true)
    else media.pause()
  }

  function seek(position: number) {
    const media = mediaElement()
    if (!media) return false
    const target = clampVideoPosition(position, media.duration)
    if (target === null) return false
    seekingRef.current = true
    media.currentTime = target
    setPosition(target)
    return true
  }

  function playFrom(position: number) {
    if (!mountedRef.current || !isLocalMaterialIdentityReady()) return
    if (seek(position)) play(true)
  }

  function sample(media: HTMLMediaElement, state: number) {
    if (!mountedRef.current || !isLocalMaterialIdentityReady()) return
    setPosition(Number.isFinite(media.currentTime) ? media.currentTime : 0)
    const decision = loopPlaybackDecision({ ...loopStateRef.current,
      regions: regionsRef.current.filter((region) => region.end <= media.duration), time: media.currentTime,
      state, seeking: seekingRef.current,
    })
    if (decision?.kind === 'seek') {
      if (decision.regionId !== loopStateRef.current.selectedId) changeLoopState({ ...loopStateRef.current, selectedId: decision.regionId })
      seek(decision.time)
      if (state === 0) play(false)
    } else if (decision?.kind === 'stop') {
      const last = regionsRef.current.find((region) => region.id === loopStateRef.current.selectedId)
      changeLoopState({ mode: 'off', selectedId: loopStateRef.current.selectedId })
      if (last && media.currentTime > last.end) seek(last.end)
      media.pause()
      setPlaying(false)
    }
  }
  const sampleRef = useRef(sample)
  sampleRef.current = sample

  useEffect(() => {
    if (!playing) return
    const timer = setInterval(() => {
      const media = mediaElement()
      if (media) sampleRef.current(media, bufferingRef.current ? 3 : media.paused ? 2 : 1)
    }, 125)
    return () => clearInterval(timer)
  }, [playing, url, kind])

  const currentSource = () => mountedRef.current && activeSourceRef.current === source

  const mediaProps = {
    src: url,
    'aria-label': name,
    controls: true,
    preload: 'metadata',
    onLoadedMetadata: (event: MediaEvent) => { if (currentSource()) setDuration(event.currentTarget.duration) },
    onDurationChange: (event: MediaEvent) => { if (currentSource()) setDuration(event.currentTarget.duration) },
    onPlay: () => { if (currentSource() && !automaticRestartRef.current) transitionRef.current.requestPlay() },
    onPlaying: () => {
      if (!currentSource()) return
      if (!isLocalMaterialIdentityReady()) { mediaElement()?.pause(); return }
      setPlaying(true)
      bufferingRef.current = false
      const intent = transitionRef.current.observe(1)
      automaticRestartRef.current = false
      if (intent) playbackCallbackRef.current(intent)
    },
    onPause: (event: MediaEvent) => { if (!currentSource()) return; setPlaying(false); if (!event.currentTarget.ended) transitionRef.current.observe(2) },
    onWaiting: () => { if (currentSource()) { bufferingRef.current = true; transitionRef.current.observe(3) } },
    onEnded: (event: MediaEvent) => { if (currentSource()) { setPlaying(false); transitionRef.current.observe(0); sample(event.currentTarget, 0) } },
    onTimeUpdate: (event: MediaEvent) => { if (currentSource()) sample(event.currentTarget, bufferingRef.current ? 3 : event.currentTarget.paused ? 2 : 1) },
    onSeeked: () => { if (currentSource()) seekingRef.current = false },
    onSeeking: () => { if (currentSource()) seekingRef.current = true },
    onRateChange: (event: MediaEvent) => { if (currentSource()) setRate(event.currentTarget.playbackRate) },
    onError: () => { if (currentSource()) setError(true) },
  } as const

  return (
    <div tabIndex={0} role="group" aria-label={kind === 'audio' ? t('Audio practice: {name}', { name }) : t('Video practice: {name}', { name })} aria-description={shortcuts}
      className="bg-slate-950 p-2 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400"
      onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.focus() }}
      onKeyDown={(event) => {
        const action = videoShortcut({ ...event, isComposing: event.nativeEvent.isComposing })
        if (action === null || !validDuration(duration) || error) return
        event.preventDefault()
        if (action === 'toggle') toggle()
        else seek((mediaElement()?.currentTime ?? 0) + action)
      }}>
      {kind === 'audio'
        ? <audio ref={audioRef} {...mediaProps} className="w-full" />
        : <video ref={videoRef} {...mediaProps} playsInline className="max-h-[420px] w-full" />}
      {error && <p role="alert" className="py-2 text-sm text-rose-300">{kind === 'audio' ? t('The audio codec is not supported by this browser.') : t('This video codec or container is not fully supported by this browser.')}</p>}
      {!validDuration(duration) && !error && <p role="status" className="py-2 text-sm text-slate-300">{kind === 'audio' ? t('Loading audio...') : t('Loading video...')}</p>}
      <VideoPracticeControls kind={kind} usable={validDuration(duration) && !error} playing={playing} duration={duration} position={position} rates={[0.25, 0.5, 1, 1.5, 2]} rate={rate} rateMode="continuous" bookmarks={bookmarks} shortcuts={shortcuts}
        getPosition={() => mediaElement()?.currentTime ?? NaN} onToggle={toggle} onSeek={seek}
        onRate={(value) => { const media = mediaElement(); if (!media) return; try { media.playbackRate = value; setRate(media.playbackRate) } catch { setRate(media.playbackRate) } }}
        loops={regionsRef.current} loopState={loopState} onLoopStateChange={changeLoopState}
        onLoopsChange={onLoopsChange ?? (() => Promise.reject(new Error('LOOP_PERSISTENCE_UNAVAILABLE')))} onPlayFrom={playFrom}
        onBookmarksChange={onBookmarksChange} />
    </div>
  )
}
