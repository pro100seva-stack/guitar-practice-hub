import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { useI18n } from '../lib/i18n'
import { normalizeBookmarks } from '../lib/localMaterials'
import { loadYouTubeApi, type YouTubePlayer } from '../lib/youtubeApi'
import { toYouTubeApiSrc, toYouTubeWatchUrl } from '../lib/youtube'
import { bookmarkSeek, formatPracticeTime, loopRange, loopSeekTarget, supportedPlaybackRates, validDuration, type LoopMode } from '../lib/youtubePractice'

type Props = {
  materialId: string
  url: string
  name: string
  bookmarks: number[]
  onBookmarksChange: (bookmarks: number[]) => Promise<void>
}

const controlClass = 'min-h-11 min-w-11 rounded border border-slate-600 px-3 text-sm text-slate-200 disabled:opacity-40'

export default function YouTubePracticePlayer({ materialId, url, name, bookmarks, onBookmarksChange }: Props) {
  const { t } = useI18n()
  const hostRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YouTubePlayer | null>(null)
  const seekingRef = useRef<{ target: number; until: number } | null>(null)
  const mountedRef = useRef(false)
  const [retry, setRetry] = useState(0)
  const [ready, setReady] = useState(false)
  const [state, setState] = useState(-1)
  const [duration, setDuration] = useState(0)
  const [position, setPosition] = useState(0)
  const [rates, setRates] = useState<number[]>([])
  const [rate, setRate] = useState(1)
  const [mode, setMode] = useState<LoopMode>('off')
  const [start, setStart] = useState('0')
  const [end, setEnd] = useState('')
  const [jump, setJump] = useState('0')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [offline, setOffline] = useState(!navigator.onLine)
  const range = loopRange(mode, start.trim() ? Number(start) : NaN, end.trim() ? Number(end) : NaN, duration)
  const usable = ready && !offline && validDuration(duration)
  const labelFrame = useEffectEvent((frame: HTMLIFrameElement) => { frame.title = name })

  useEffect(() => {
    mountedRef.current = true
    const online = () => setOffline(!navigator.onLine)
    window.addEventListener('online', online)
    window.addEventListener('offline', online)
    return () => {
      mountedRef.current = false
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

  const sample = useEffectEvent((player: YouTubePlayer, playbackState: number) => {
    const time = player.getCurrentTime()
    const length = player.getDuration()
    setPosition(Number.isFinite(time) ? time : 0)
    setDuration(length)
    const seeking = seekingRef.current
    if (seeking && (Math.abs(time - seeking.target) < 0.4 || Date.now() >= seeking.until)) seekingRef.current = null
    const currentRange = loopRange(mode, start.trim() ? Number(start) : NaN, end.trim() ? Number(end) : NaN, length)
    const target = loopSeekTarget(currentRange, time, playbackState, seekingRef.current !== null)
    if (!offline && target !== null) seek(target, true)
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
    setMode('off')
    setStart('0')
    setEnd('')
    setJump('0')
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
            setState(target.getPlayerState())
            sample(target, target.getPlayerState())
          },
          onStateChange: ({ target, data }) => {
            if (cancelled || failed) return
            setState(data)
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

  async function save(next: number[]) {
    setSaving(true)
    setSaveError(false)
    try { await onBookmarksChange(normalizeBookmarks(next)) }
    catch { if (mountedRef.current) setSaveError(true) }
    finally { if (mountedRef.current) setSaving(false) }
  }

  function capture(point: 'start' | 'end') {
    const time = playerRef.current?.getCurrentTime()
    if (time === undefined || !Number.isFinite(time)) return
    if (point === 'start') setStart(time.toFixed(1))
    else setEnd(time.toFixed(1))
  }

  const jumpTarget = jump.trim() ? bookmarkSeek(Number(jump), duration, 1) : null
  return (
    <div>
      <div ref={hostRef} className="aspect-video w-full bg-black" />
      {!ready && !error && !offline && <p role="status" className="py-2 text-sm text-slate-300">{t('Loading YouTube player...')}</p>}
      {(error || offline) && <div className="flex flex-wrap items-center gap-2 py-2"><p role="alert" className="min-w-0 flex-1 text-sm text-amber-300">{t(offline ? 'YouTube is unavailable offline.' : error!)}</p><button type="button" disabled={offline} onClick={() => setRetry((value) => value + 1)} className={controlClass}>{t('Retry player')}</button></div>}
      <div className="flex flex-wrap items-end gap-2 py-2">
        <label className="min-w-0 text-sm text-slate-300">{t('Video loop')}<select value={mode} disabled={!usable} onChange={(event) => setMode(event.target.value as LoopMode)} className={`${controlClass} block max-w-full bg-slate-950`}><option value="off">{t('Loop off')}</option><option value="whole">{t('Whole video')}</option><option value="section">{t('Loop A-B')}</option></select></label>
        <label className="min-w-0 text-sm text-slate-300">{t('Playback speed')}<select value={rates.includes(rate) ? rate : ''} disabled={!ready || offline || rates.length < 2} onChange={(event) => playerRef.current?.setPlaybackRate(Number(event.target.value))} className={`${controlClass} block max-w-full bg-slate-950`}>{!rates.includes(rate) && <option value="">{t('Speed unavailable')}</option>}{rates.map((value) => <option key={value} value={value}>{t('{rate}x', { rate: value })}</option>)}</select></label>
      </div>
      <div className="flex flex-wrap items-end gap-2 py-2">
        <label className="text-sm text-slate-300">{t('A (seconds)')}<input type="number" min="0" max={validDuration(duration) ? duration : undefined} step="0.1" value={start} disabled={!usable} onChange={(event) => setStart(event.target.value)} className={`${controlClass} block w-28 bg-slate-950`} /></label>
        <button type="button" disabled={!usable} aria-label={t('Set A to current position')} onClick={() => capture('start')} className={controlClass}>{t('Now')}</button>
        <label className="text-sm text-slate-300">{t('B (seconds)')}<input type="number" min="0" max={validDuration(duration) ? duration : undefined} step="0.1" value={end} disabled={!usable} onChange={(event) => setEnd(event.target.value)} className={`${controlClass} block w-28 bg-slate-950`} /></label>
        <button type="button" disabled={!usable} aria-label={t('Set B to current position')} onClick={() => capture('end')} className={controlClass}>{t('Now')}</button>
      </div>
      {mode === 'section' && !range && <p role="status" className="py-1 text-sm text-amber-300">{t('Loop suspended: use 0 <= A < B <= video duration.')}</p>}
      <div className="flex flex-wrap items-end gap-2 py-2">
        <label className="text-sm text-slate-300">{t('Position (seconds)')}<input type="number" min="0" max={validDuration(duration) ? duration : undefined} step="0.1" value={jump} disabled={!usable} onChange={(event) => setJump(event.target.value)} className={`${controlClass} block w-32 bg-slate-950`} /></label>
        <button type="button" disabled={!usable || !jumpTarget} onClick={() => { if (jumpTarget) seek(jumpTarget.position, true) }} className={controlClass}>{t('Jump and play')}</button>
        <span className="py-3 text-sm tabular-nums text-slate-300">{formatPracticeTime(position)}</span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 py-2"><p className="text-sm text-slate-300">{t('Bookmarks')}</p><button type="button" disabled={!usable || saving} onClick={() => { const time = playerRef.current?.getCurrentTime(); if (time !== undefined && bookmarkSeek(time, duration, state)) void save([...bookmarks, time]) }} className={controlClass}>{t('Save position')}</button></div>
      <div className="flex flex-wrap gap-2">
        {normalizeBookmarks(bookmarks).map((bookmark) => <span key={bookmark} className="inline-flex items-center text-sm"><button type="button" disabled={!usable || !bookmarkSeek(bookmark, duration, state)} onClick={() => { const player = playerRef.current; if (!player) return; const decision = bookmarkSeek(bookmark, player.getDuration(), player.getPlayerState()); if (decision) seek(decision.position, decision.play) }} className="min-h-11 px-3 text-sky-300 disabled:opacity-40">{formatPracticeTime(bookmark)}</button><button type="button" disabled={saving} aria-label={t('Remove bookmark at {time}', { time: formatPracticeTime(bookmark) })} onClick={() => { void save(bookmarks.filter((value) => value !== bookmark)) }} className="min-h-11 min-w-11 text-slate-300 disabled:opacity-40">{t('Remove')}</button></span>)}
      </div>
      {bookmarks.length === 0 && <p className="py-2 text-sm text-slate-400">{t('No bookmarks yet')}</p>}
      {saveError && <p role="alert" className="py-2 text-sm text-rose-300">{t('Could not save material changes.')}</p>}
      <a href={toYouTubeWatchUrl(url) ?? url} target="_blank" rel="noreferrer" className="flex min-h-11 items-center py-2 text-sm text-sky-300">{t('Playback trouble? Open on YouTube')}</a>
    </div>
  )
}