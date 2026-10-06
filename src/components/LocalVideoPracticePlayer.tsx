import { useEffect, useRef, useState, type SyntheticEvent } from 'react'
import { useI18n } from '../lib/i18n'
import { clampVideoPosition, createPlaybackTransition, loopSeekTarget, validDuration, videoShortcut, type LoopRange, type PlaybackIntent } from '../lib/youtubePractice'
import VideoPracticeControls from './VideoPracticeControls'

type Props = {
  kind?: 'video' | 'audio'
  url: string
  name: string
  bookmarks: number[]
  onBookmarksChange: (bookmarks: number[]) => Promise<void>
  onPlaybackConfirmed: (intent: PlaybackIntent) => void
}

type MediaEvent = SyntheticEvent<HTMLMediaElement>

export default function LocalVideoPracticePlayer({ kind = 'video', url, name, bookmarks, onBookmarksChange, onPlaybackConfirmed }: Props) {
  const { t } = useI18n()
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
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
  const shortcuts = kind === 'audio'
    ? t('Audio shortcuts: Space play/pause; Left/Right seek 5 seconds; Shift+Left/Right seek 15 seconds. Native audio controls keep their own shortcuts.')
    : t('Video shortcuts: Space play/pause; Left/Right seek 5 seconds; Shift+Left/Right seek 15 seconds. Native video controls keep their own shortcuts.')
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])
  useEffect(() => { playbackCallbackRef.current = onPlaybackConfirmed }, [onPlaybackConfirmed])

  function mediaElement(): HTMLMediaElement | null {
    return videoRef.current ?? audioRef.current
  }

  function play(explicit: boolean) {
    const media = mediaElement()
    if (!media) return
    automaticRestartRef.current = !explicit
    if (explicit) transitionRef.current.requestPlay()
    else transitionRef.current.automaticPlay()
    void media.play().catch(() => { transitionRef.current.cancelPlay(); automaticRestartRef.current = false; if (mountedRef.current) setPlaying(false) })
  }

  function toggle() {
    const media = mediaElement()
    if (!media) return
    if (media.paused || media.ended) play(true)
    else media.pause()
  }

  function seek(position: number) {
    const media = mediaElement()
    if (!media) return
    const target = clampVideoPosition(position, media.duration)
    if (target === null) return
    seekingRef.current = true
    media.currentTime = target
    setPosition(target)
  }

  function sample(media: HTMLMediaElement, state: number) {
    setPosition(Number.isFinite(media.currentTime) ? media.currentTime : 0)
    const range = rangeRef.current
    const target = loopSeekTarget(range && range.end <= media.duration ? range : null, media.currentTime, state, seekingRef.current)
    if (target === null) return
    seek(target)
    if (state === 0) play(false)
  }

  const mediaProps = {
    src: url,
    'aria-label': name,
    controls: true,
    preload: 'metadata',
    onLoadedMetadata: (event: MediaEvent) => setDuration(event.currentTarget.duration),
    onDurationChange: (event: MediaEvent) => setDuration(event.currentTarget.duration),
    onPlay: () => { if (!automaticRestartRef.current) transitionRef.current.requestPlay() },
    onPlaying: () => {
      if (!mountedRef.current) return
      setPlaying(true)
      const intent = transitionRef.current.observe(1)
      automaticRestartRef.current = false
      if (intent) playbackCallbackRef.current(intent)
    },
    onPause: (event: MediaEvent) => { setPlaying(false); if (!event.currentTarget.ended) transitionRef.current.observe(2) },
    onWaiting: () => { transitionRef.current.observe(3) },
    onEnded: (event: MediaEvent) => { setPlaying(false); transitionRef.current.observe(0); sample(event.currentTarget, 0) },
    onTimeUpdate: (event: MediaEvent) => sample(event.currentTarget, event.currentTarget.paused ? 2 : 1),
    onSeeked: () => { seekingRef.current = false },
    onRateChange: (event: MediaEvent) => setRate(event.currentTarget.playbackRate),
    onError: () => setError(true),
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
      <VideoPracticeControls kind={kind} usable={validDuration(duration) && !error} playing={playing} duration={duration} position={position} rates={[0.25, 0.5, 1, 1.5, 2]} rate={rate} bookmarks={bookmarks} shortcuts={shortcuts}
        getPosition={() => mediaElement()?.currentTime ?? NaN} onToggle={toggle} onSeek={seek}
        onRate={(value) => { const media = mediaElement(); if (!media) return; try { media.playbackRate = value; setRate(media.playbackRate) } catch { setRate(media.playbackRate) } }}
        onLoopRange={(range) => { rangeRef.current = range }} onBookmarksChange={onBookmarksChange} />
    </div>
  )
}