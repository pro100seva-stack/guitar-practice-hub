import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../lib/i18n'
import { clampVideoPosition, createPlaybackTransition, loopSeekTarget, validDuration, videoShortcut, type LoopRange, type PlaybackIntent } from '../lib/youtubePractice'
import VideoPracticeControls from './VideoPracticeControls'

type Props = {
  url: string
  name: string
  bookmarks: number[]
  onBookmarksChange: (bookmarks: number[]) => Promise<void>
  onPlaybackConfirmed: (intent: PlaybackIntent) => void
}

export default function LocalVideoPracticePlayer({ url, name, bookmarks, onBookmarksChange, onPlaybackConfirmed }: Props) {
  const { t } = useI18n()
  const videoRef = useRef<HTMLVideoElement>(null)
  const transitionRef = useRef(createPlaybackTransition())
  const rangeRef = useRef<LoopRange | null>(null)
  const seekingRef = useRef(false)
  const automaticRestartRef = useRef(false)
  const mountedRef = useRef(false)
  const [duration, setDuration] = useState(0)
  const [position, setPosition] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [rate, setRate] = useState(1)
  const [error, setError] = useState(false)
  const playbackCallbackRef = useRef(onPlaybackConfirmed)
  const shortcuts = t('Video shortcuts: Space play/pause; Left/Right seek 5 seconds; Shift+Left/Right seek 15 seconds. Native video controls keep their own shortcuts.')
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])
  useEffect(() => { playbackCallbackRef.current = onPlaybackConfirmed }, [onPlaybackConfirmed])

  function play(explicit: boolean) {
    const video = videoRef.current
    if (!video) return
    automaticRestartRef.current = !explicit
    if (explicit) transitionRef.current.requestPlay()
    else transitionRef.current.automaticPlay()
    void video.play().catch(() => { transitionRef.current.cancelPlay(); automaticRestartRef.current = false; if (mountedRef.current) setPlaying(false) })
  }

  function toggle() {
    const video = videoRef.current
    if (!video) return
    if (video.paused || video.ended) play(true)
    else video.pause()
  }

  function seek(position: number) {
    const video = videoRef.current
    if (!video) return
    const target = clampVideoPosition(position, video.duration)
    if (target === null) return
    seekingRef.current = true
    video.currentTime = target
    setPosition(target)
  }

  function sample(video: HTMLVideoElement, state: number) {
    setPosition(Number.isFinite(video.currentTime) ? video.currentTime : 0)
    const range = rangeRef.current
    const target = loopSeekTarget(range && range.end <= video.duration ? range : null, video.currentTime, state, seekingRef.current)
    if (target === null) return
    seek(target)
    if (state === 0) play(false)
  }

  return (
    <div tabIndex={0} role="group" aria-label={t('Video practice: {name}', { name })} aria-description={shortcuts}
      className="bg-slate-950 p-2 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400"
      onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.focus() }}
      onKeyDown={(event) => {
        const action = videoShortcut({ ...event, isComposing: event.nativeEvent.isComposing })
        if (action === null || !validDuration(duration) || error) return
        event.preventDefault()
        if (action === 'toggle') toggle()
        else seek((videoRef.current?.currentTime ?? 0) + action)
      }}>
      <video ref={videoRef} src={url} aria-label={name} controls playsInline preload="metadata" className="max-h-[420px] w-full"
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onDurationChange={(event) => setDuration(event.currentTarget.duration)}
        onPlay={() => { if (!automaticRestartRef.current) transitionRef.current.requestPlay() }}
        onPlaying={() => {
          if (!mountedRef.current) return
          setPlaying(true)
          const intent = transitionRef.current.observe(1)
          automaticRestartRef.current = false
          if (intent) playbackCallbackRef.current(intent)
        }}
        onPause={(event) => { setPlaying(false); if (!event.currentTarget.ended) transitionRef.current.observe(2) }}
        onWaiting={() => { transitionRef.current.observe(3) }}
        onEnded={(event) => { setPlaying(false); transitionRef.current.observe(0); sample(event.currentTarget, 0) }}
        onTimeUpdate={(event) => sample(event.currentTarget, event.currentTarget.paused ? 2 : 1)}
        onSeeked={() => { seekingRef.current = false }}
        onRateChange={(event) => setRate(event.currentTarget.playbackRate)}
        onError={() => setError(true)} />
      {error && <p role="alert" className="py-2 text-sm text-rose-300">{t('This video codec or container is not fully supported by this browser.')}</p>}
      {!validDuration(duration) && !error && <p role="status" className="py-2 text-sm text-slate-300">{t('Loading video...')}</p>}
      <VideoPracticeControls usable={validDuration(duration) && !error} playing={playing} duration={duration} position={position} rates={[0.25, 0.5, 1, 1.5, 2]} rate={rate} bookmarks={bookmarks} shortcuts={shortcuts}
        getPosition={() => videoRef.current?.currentTime ?? NaN} onToggle={toggle} onSeek={seek}
        onRate={(value) => { const video = videoRef.current; if (!video) return; try { video.playbackRate = value; setRate(video.playbackRate) } catch { setRate(video.playbackRate) } }}
        onLoopRange={(range) => { rangeRef.current = range }} onBookmarksChange={onBookmarksChange} />
    </div>
  )
}