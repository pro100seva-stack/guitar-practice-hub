import { useMemo, useEffect, useEffectEvent, useRef, useState } from 'react'
import { isLocalMaterialIdentityReady, onLocalMaterialInvalidation, onLocalMaterialVerification } from '../lib/localMaterialAccess'
import { useI18n } from '../lib/i18n'
import { loadYouTubeApi, type YouTubePlayer } from '../lib/youtubeApi'
import { toYouTubeApiSrc, toYouTubeWatchUrl } from '../lib/youtube'
import { bookmarkSeek, clampVideoPosition, createPlaybackTransition, supportedPlaybackRates, validDuration, videoShortcut, type PlaybackIntent } from '../lib/youtubePractice'
import { loopPlaybackDecision, normalizeLoopRegions, type LoopPlaybackState, type LoopRegion } from '../lib/loopRegions'
import VideoPracticeControls, { videoControlClass as controlClass } from './VideoPracticeControls'
import type { PlaybackBookmark } from '../lib/localMaterials'

type Props = {
  materialId: string
  url: string
  name: string
  bookmarks: PlaybackBookmark[]
  loops?: LoopRegion[]
  onLoopsChange?: (loops: LoopRegion[]) => Promise<void>
  looperOpen?: boolean
  onLooperOpenChange?: (open: boolean) => Promise<void>
  onBookmarksChange: (bookmarks: PlaybackBookmark[]) => Promise<void>
  onPlaybackConfirmed: (intent: PlaybackIntent) => void
}

export default function YouTubePracticePlayer({ materialId, url, name, bookmarks, loops = [], onLoopsChange, looperOpen, onLooperOpenChange, onBookmarksChange, onPlaybackConfirmed }: Props) {
  const { t } = useI18n()
  const hostRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YouTubePlayer | null>(null)
  const seekingRef = useRef<{ target: number; from: number; until: number } | null>(null)
  const [loopState, setLoopState] = useState<LoopPlaybackState>({ mode: 'off', selectedId: null })
  const loopStateRef = useRef<LoopPlaybackState>(loopState)
  const regionsRef = useRef<LoopRegion[]>([])
  const regions = useMemo(() => normalizeLoopRegions(loops), [loops])
  regionsRef.current = regions
  const transitionRef = useRef(createPlaybackTransition())
  const [retry, setRetry] = useState(0)
  const [ready, setReady] = useState(false)
  const [state, setState] = useState(-1)
  const [duration, setDuration] = useState(0)
  const [position, setPosition] = useState(0)
  const [seekPending, setSeekPending] = useState(false)
  const [rates, setRates] = useState<number[]>([])
  const [rate, setRate] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(!navigator.onLine)
  const usable = ready && !offline && validDuration(duration)
  const labelFrame = useEffectEvent((frame: HTMLIFrameElement) => { frame.title = name })
  const reportPlayback = useEffectEvent(onPlaybackConfirmed)
  const shortcuts = t('Video shortcuts: Space play/pause; Left/Right seek 5 seconds; Shift+Left/Right seek 15 seconds. Native video controls keep their own shortcuts.')

  function changeLoopState(next: LoopPlaybackState) {
    loopStateRef.current = next
    setLoopState(next)
  }

  useEffect(() => {
    if (loopStateRef.current.selectedId && !regionsRef.current.some((region) => region.id === loopStateRef.current.selectedId)) {
      changeLoopState({ mode: 'off', selectedId: null })
    }
  }, [loops])

  function readPlaybackRate(player: YouTubePlayer) {
    const actual = player.getPlaybackRate()
    if (Number.isFinite(actual) && actual > 0) setRate(actual)
  }

  function changePlaybackRate(value: number) {
    const player = playerRef.current
    if (!usable || !player || !Number.isFinite(value) || value < 0.25 || value > 2 || !rates.includes(value)) return
    player.setPlaybackRate(value)
    // A request is only a suggestion. Retain the applied rate until the player acknowledges it.
    readPlaybackRate(player)
  }

  useEffect(() => {
    const online = () => setOffline(!navigator.onLine)
    window.addEventListener('online', online)
    window.addEventListener('offline', online)
    return () => {
      window.removeEventListener('online', online)
      window.removeEventListener('offline', online)
    }
  }, [])

  function seek(target: number, play: boolean) {
    const player = playerRef.current
    if (!player) return
    seekingRef.current = { target, from: player.getCurrentTime(), until: Date.now() + 1500 }
    setSeekPending(true)
    setPosition(target)
    player.seekTo(target, true)
    if (play) player.playVideo()
    else player.pauseVideo()
  }

  function toggle() {
    const player = playerRef.current
    if (!player) return
    if (player.getPlayerState() === 1) player.pauseVideo()
    else { transitionRef.current.requestPlay(); player.playVideo() }
  }

  function playFrom(position: number) {
    const player = playerRef.current
    if (!player || !usable || !isLocalMaterialIdentityReady()) return
    const target = clampVideoPosition(position, player.getDuration())
    if (target === null) return
    transitionRef.current.requestPlay()
    seek(target, true)
  }

  function seekPosition(position: number) {
    const player = playerRef.current
    if (!player) return
    const decision = bookmarkSeek(position, player.getDuration(), player.getPlayerState())
    if (decision) {
      if (decision.play) transitionRef.current.automaticPlay()
      seek(decision.position, decision.play)
    }
  }

  const sample = useEffectEvent((player: YouTubePlayer, playbackState: number) => {
    if (!isLocalMaterialIdentityReady()) return
    const time = player.getCurrentTime()
    const length = player.getDuration()
    setDuration(length)
    readPlaybackRate(player)
    const seeking = seekingRef.current
    const movedAfterSeek = seeking && Math.abs(time - seeking.from) >= Math.min(0.01, Math.abs(seeking.target - seeking.from) / 2)
    if (seeking && ((movedAfterSeek && Math.abs(time - seeking.target) < 0.4) || Date.now() >= seeking.until)) {
      seekingRef.current = null
      setSeekPending(false)
      transitionRef.current.settleAutomatic()
    }
    // A paused seek can be asynchronous: retain its preview until the provider settles.
    setPosition(seekingRef.current?.target ?? (Number.isFinite(time) ? time : 0))
    const decision = loopPlaybackDecision({ ...loopStateRef.current,
      regions: regionsRef.current.filter((region) => region.end <= length), time, state: playbackState,
      seeking: seekingRef.current !== null,
    })
    if (!offline && decision?.kind === 'seek') {
      if (decision.regionId !== loopStateRef.current.selectedId || decision.iteration !== undefined || loopStateRef.current.iteration !== undefined) changeLoopState({ ...loopStateRef.current, selectedId: decision.regionId, iteration: decision.iteration ?? 1 })
      transitionRef.current.automaticPlay()
      seek(decision.time, true)
    } else if (!offline && decision?.kind === 'stop') {
      const last = regionsRef.current.find((region) => region.id === loopStateRef.current.selectedId)
      changeLoopState({ mode: 'off', selectedId: loopStateRef.current.selectedId })
      if (last && time > last.end) seek(last.end, false)
      else player.pauseVideo()
    }
  })

  useEffect(() => {
    let cancelled = false
    let failed = false
    let player: YouTubePlayer | null = null
    let readyTimer: ReturnType<typeof setTimeout> | undefined
    const host = hostRef.current
    const src = toYouTubeApiSrc(url, window.location.origin)
    setReady(false)
    setState(-1)
    setDuration(0)
    setPosition(0)
    setSeekPending(false)
    setRates([])
    setRate(1)
    changeLoopState({ mode: 'off', selectedId: null })
    transitionRef.current = createPlaybackTransition()
    seekingRef.current = null
    setError(src ? null : 'YouTube requires a valid HTTP or HTTPS origin.')
    if (!src || !host) return
    const fail = (message: string) => {
      if (cancelled) return
      failed = true
      clearTimeout(readyTimer)
      setReady(false)
      setState(-1)
      setError(message)
    }
    const detach = () => {
      cancelled = true
      clearTimeout(readyTimer)
      playerRef.current = null
      seekingRef.current = null
      loopStateRef.current = { mode: 'off', selectedId: null }
      player?.destroy()
      player = null
      host.replaceChildren()
    }
    const unsubscribe = onLocalMaterialInvalidation(detach)
    const stopVerification = onLocalMaterialVerification((ready) => { if (!ready) player?.pauseVideo() })
    void loadYouTubeApi().then((api) => {
      if (cancelled) return
      const frame = document.createElement('iframe')
      frame.referrerPolicy = 'strict-origin-when-cross-origin'
      frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
      frame.allowFullscreen = true
      frame.className = 'aspect-video w-full bg-black'
      labelFrame(frame)
      frame.src = src
      host.replaceChildren(frame)
      readyTimer = setTimeout(() => fail('YouTube could not load. Check your connection or open on YouTube.'), 12000)
      player = new api.Player(frame, {
        playerVars: { controls: 0, rel: 0, playsinline: 1, enablejsapi: 1, origin: window.location.origin },
        events: {
          onReady: ({ target }) => {
            if (cancelled || failed) return
            clearTimeout(readyTimer)
            playerRef.current = target
            setReady(true)
            setRates(supportedPlaybackRates(target.getAvailablePlaybackRates()).filter((value) => value >= 0.25 && value <= 2))
            if (target.getPlaybackRate() !== 1) target.setPlaybackRate(1)
            readPlaybackRate(target)
            const playbackState = target.getPlayerState()
            transitionRef.current.observe(playbackState)
            setState(playbackState)
            sample(target, playbackState)
          },
          onStateChange: ({ target, data }) => {
            if (cancelled || failed) return
            if (!isLocalMaterialIdentityReady()) { if (data === 1) target.pauseVideo(); return }
            setState(data)
            const intent = transitionRef.current.observe(data)
            if (intent) reportPlayback(intent)
            setRates(supportedPlaybackRates(target.getAvailablePlaybackRates()).filter((value) => value >= 0.25 && value <= 2))
            sample(target, data)
          },
          onPlaybackRateChange: ({ target }) => { if (!cancelled && !failed) readPlaybackRate(target) },
          onError: ({ data }) => fail(data === 153 ? 'YouTube could not verify this embed origin.' : 'This video is unavailable or cannot be embedded. Open on YouTube.'),
        },
      })
      playerRef.current = player
    }).catch(() => fail('YouTube could not load. Check your connection or open on YouTube.'))
    return () => {
      unsubscribe()
      stopVerification()
      detach()
    }
  }, [materialId, url, retry])

  useEffect(() => {
    const frame = hostRef.current?.querySelector('iframe')
    if (frame) frame.title = name
  }, [name, ready])

  useEffect(() => {
    if (!ready || (state !== 1 && !seekPending) || offline) return
    const timer = setInterval(() => {
      const player = playerRef.current
      if (!player) return
      const playbackState = player.getPlayerState()
      if (playbackState !== 1 && !seekingRef.current) return
      if (playbackState !== state) setState(playbackState)
      sample(player, playbackState)
    }, 125)
    return () => clearInterval(timer)
  }, [ready, state, seekPending, offline, materialId, url, retry])

  return (
    <div tabIndex={0} role="group" aria-label={t('Video practice: {name}', { name })} aria-description={shortcuts}
      className="outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400"
      onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.focus() }}
      onKeyDown={(event) => {
        const action = videoShortcut({ ...event, isComposing: event.nativeEvent.isComposing })
        const player = playerRef.current
        if (action === null || !usable || !player) return
        event.preventDefault()
        if (action === 'toggle') toggle()
        else {
          const target = clampVideoPosition(player.getCurrentTime() + action, player.getDuration())
          if (target !== null) seekPosition(target)
        }
      }}>
      <div ref={hostRef} className="aspect-video w-full bg-black" />
      {!ready && !error && !offline && <p role="status" className="py-2 text-sm text-slate-300">{t('Loading YouTube player...')}</p>}
      {(error || offline) && <div className="flex flex-wrap items-center gap-2 py-2"><p role="alert" className="min-w-0 flex-1 text-sm text-amber-300">{t(offline ? 'YouTube is unavailable offline.' : error!)}</p><button type="button" disabled={offline} onClick={() => setRetry((value) => value + 1)} className={controlClass}>{t('Retry player')}</button></div>}
      <VideoPracticeControls key={`${materialId}:${url}:${retry}`} usable={usable} playing={state === 1} duration={duration} position={position} rates={rates} rate={rate} rateMode="supported" bookmarks={bookmarks} shortcuts={shortcuts}
        getPosition={() => seekingRef.current?.target ?? playerRef.current?.getCurrentTime() ?? NaN}
        onToggle={toggle}
        onSeek={seekPosition}
        onRate={changePlaybackRate}
        loops={regionsRef.current} loopState={loopState} onLoopStateChange={changeLoopState}
        looperOpen={looperOpen} onLooperOpenChange={onLooperOpenChange}
        onLoopsChange={onLoopsChange ?? (() => Promise.reject(new Error('LOOP_PERSISTENCE_UNAVAILABLE')))} onPlayFrom={playFrom}
        onBookmarksChange={onBookmarksChange} />
      <a href={toYouTubeWatchUrl(url) ?? url} target="_blank" rel="noreferrer" className="flex min-h-11 items-center py-2 text-sm text-sky-300">{t('Playback trouble? Open on YouTube')}</a>
    </div>
  )
}
