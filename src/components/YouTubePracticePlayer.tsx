import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { useI18n } from '../lib/i18n'
import { loadYouTubeApi, type YouTubePlayer } from '../lib/youtubeApi'
import { toYouTubeApiSrc, toYouTubeWatchUrl } from '../lib/youtube'
import { bookmarkSeek, clampVideoPosition, createPlaybackTransition, loopSeekTarget, supportedPlaybackRates, validDuration, videoShortcut, type LoopRange, type PlaybackIntent } from '../lib/youtubePractice'
import VideoPracticeControls, { videoControlClass as controlClass } from './VideoPracticeControls'

type Props = {
  materialId: string
  url: string
  name: string
  bookmarks: number[]
  onBookmarksChange: (bookmarks: number[]) => Promise<void>
  onPlaybackConfirmed: (intent: PlaybackIntent) => void
}

export default function YouTubePracticePlayer({ materialId, url, name, bookmarks, onBookmarksChange, onPlaybackConfirmed }: Props) {
  const { t } = useI18n()
  const hostRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YouTubePlayer | null>(null)
  const seekingRef = useRef<{ target: number; until: number } | null>(null)
  const rangeRef = useRef<LoopRange | null>(null)
  const transitionRef = useRef(createPlaybackTransition())
  const [retry, setRetry] = useState(0)
  const [ready, setReady] = useState(false)
  const [state, setState] = useState(-1)
  const [duration, setDuration] = useState(0)
  const [position, setPosition] = useState(0)
  const [rates, setRates] = useState<number[]>([])
  const [rate, setRate] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(!navigator.onLine)
  const usable = ready && !offline && validDuration(duration)
  const labelFrame = useEffectEvent((frame: HTMLIFrameElement) => { frame.title = name })
  const reportPlayback = useEffectEvent(onPlaybackConfirmed)
  const shortcuts = t('Video shortcuts: Space play/pause; Left/Right seek 5 seconds; Shift+Left/Right seek 15 seconds. Native video controls keep their own shortcuts.')

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
    seekingRef.current = { target, until: Date.now() + 1500 }
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
    const time = player.getCurrentTime()
    const length = player.getDuration()
    setPosition(Number.isFinite(time) ? time : 0)
    setDuration(length)
    const seeking = seekingRef.current
    if (seeking && (Math.abs(time - seeking.target) < 0.4 || Date.now() >= seeking.until)) {
      seekingRef.current = null
      transitionRef.current.settleAutomatic()
    }
    const target = loopSeekTarget(rangeRef.current && rangeRef.current.end <= length ? rangeRef.current : null, time, playbackState, seekingRef.current !== null)
    if (!offline && target !== null) {
      transitionRef.current.automaticPlay()
      seek(target, true)
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
    setRates([])
    rangeRef.current = null
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
        events: {
          onReady: ({ target }) => {
            if (cancelled || failed) return
            clearTimeout(readyTimer)
            playerRef.current = target
            setReady(true)
            setRates(supportedPlaybackRates(target.getAvailablePlaybackRates()))
            setRate(target.getPlaybackRate())
            const playbackState = target.getPlayerState()
            transitionRef.current.observe(playbackState)
            setState(playbackState)
            sample(target, playbackState)
          },
          onStateChange: ({ target, data }) => {
            if (cancelled || failed) return
            setState(data)
            const intent = transitionRef.current.observe(data)
            if (intent) reportPlayback(intent)
            setRates(supportedPlaybackRates(target.getAvailablePlaybackRates()))
            sample(target, data)
          },
          onPlaybackRateChange: ({ data }) => { if (!cancelled && !failed) setRate(data) },
          onError: ({ data }) => fail(data === 153 ? 'YouTube could not verify this embed origin.' : 'This video is unavailable or cannot be embedded. Open on YouTube.'),
        },
      })
      playerRef.current = player
    }).catch(() => fail('YouTube could not load. Check your connection or open on YouTube.'))
    return () => {
      cancelled = true
      clearTimeout(readyTimer)
      playerRef.current = null
      seekingRef.current = null
      player?.destroy()
      host.replaceChildren()
    }
  }, [materialId, url, retry])

  useEffect(() => {
    const frame = hostRef.current?.querySelector('iframe')
    if (frame) frame.title = name
  }, [name, ready])

  useEffect(() => {
    if (!ready || state !== 1 || offline) return
    const timer = setInterval(() => {
      const player = playerRef.current
      if (!player) return
      const playbackState = player.getPlayerState()
      if (playbackState !== 1) { setState(playbackState); return }
      sample(player, playbackState)
    }, 125)
    return () => clearInterval(timer)
  }, [ready, state, offline, materialId, url, retry])

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
      <VideoPracticeControls key={`${materialId}:${url}:${retry}`} usable={usable} playing={state === 1} duration={duration} position={position} rates={rates} rate={rate} bookmarks={bookmarks} shortcuts={shortcuts}
        getPosition={() => playerRef.current?.getCurrentTime() ?? NaN}
        onToggle={toggle}
        onSeek={seekPosition}
        onRate={(value) => playerRef.current?.setPlaybackRate(value)}
        onLoopRange={(range) => { rangeRef.current = range }} onBookmarksChange={onBookmarksChange} />
      <a href={toYouTubeWatchUrl(url) ?? url} target="_blank" rel="noreferrer" className="flex min-h-11 items-center py-2 text-sm text-sky-300">{t('Playback trouble? Open on YouTube')}</a>
    </div>
  )
}