import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { useI18n } from '../lib/i18n'
import { normalizeBookmarks } from '../lib/localMaterials'
import { bookmarkSeek, formatPracticeTime, loopRange, validDuration, type LoopMode, type LoopRange } from '../lib/youtubePractice'

type Props = {
  usable: boolean
  playing: boolean
  duration: number
  position: number
  rates: number[]
  rate: number
  bookmarks: number[]
  shortcuts?: string
  getPosition: () => number
  onToggle: () => void
  onSeek: (position: number) => void
  onRate: (rate: number) => void
  onLoopRange: (range: LoopRange | null) => void
  onBookmarksChange: (bookmarks: number[]) => Promise<void>
}

export const videoControlClass = 'min-h-11 min-w-11 rounded border border-slate-600 px-3 text-sm text-slate-200 disabled:opacity-40'

export default function VideoPracticeControls({ usable, playing, duration, position, rates, rate, bookmarks, shortcuts, getPosition, onToggle, onSeek, onRate, onLoopRange, onBookmarksChange }: Props) {
  const { t } = useI18n()
  const [mode, setMode] = useState<LoopMode>('off')
  const [start, setStart] = useState('0')
  const [end, setEnd] = useState('')
  const [jump, setJump] = useState('0')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const mountedRef = useRef(false)
  const range = loopRange(mode, start.trim() ? Number(start) : NaN, end.trim() ? Number(end) : NaN, duration)
  const reportRange = useEffectEvent(onLoopRange)
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])
  useEffect(() => { reportRange(loopRange(mode, start.trim() ? Number(start) : NaN, end.trim() ? Number(end) : NaN, duration)) }, [mode, start, end, duration])

  async function save(next: number[]) {
    setSaving(true)
    setSaveError(false)
    try { await onBookmarksChange(normalizeBookmarks(next)) }
    catch { if (mountedRef.current) setSaveError(true) }
    finally { if (mountedRef.current) setSaving(false) }
  }

  function capture(point: 'start' | 'end') {
    const time = getPosition()
    if (!Number.isFinite(time)) return
    if (point === 'start') setStart(time.toFixed(1))
    else setEnd(time.toFixed(1))
  }

  const jumpTarget = jump.trim() ? bookmarkSeek(Number(jump), duration, playing ? 1 : 2) : null
  return (
    <div className="px-2">
      <div className="flex flex-wrap items-end gap-2 py-2">
        <button type="button" disabled={!usable} onClick={onToggle} title={t(playing ? 'Pause video' : 'Play video')} aria-label={t(playing ? 'Pause video' : 'Play video')} aria-description={shortcuts} className={videoControlClass}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">{playing ? <path d="M6 4h4v16H6zM14 4h4v16h-4z" /> : <path d="m7 3 15 9-15 9z" />}</svg>
        </button>
        <span className="py-3 text-sm tabular-nums text-slate-300">{formatPracticeTime(position)}</span>
        <label className="min-w-0 text-sm text-slate-300">{t('Playback speed')}<select value={rates.includes(rate) ? rate : ''} disabled={!usable || rates.length < 2} onChange={(event) => onRate(Number(event.target.value))} className={`${videoControlClass} block max-w-full bg-slate-950`}>{!rates.includes(rate) && <option value="">{t('Speed unavailable')}</option>}{rates.map((value) => <option key={value} value={value}>{t('{rate}x', { rate: value })}</option>)}</select></label>
        <label className="min-w-0 text-sm text-slate-300">{t('Video loop')}<select value={mode} disabled={!usable} onChange={(event) => setMode(event.target.value as LoopMode)} className={`${videoControlClass} block max-w-full bg-slate-950`}><option value="off">{t('Loop off')}</option><option value="whole">{t('Whole video')}</option><option value="section">{t('Loop A-B')}</option></select></label>
      </div>
      <div className="flex flex-wrap items-end gap-2 py-2">
        <label className="text-sm text-slate-300">{t('A (seconds)')}<input type="number" min="0" max={validDuration(duration) ? duration : undefined} step="0.1" value={start} disabled={!usable} onChange={(event) => setStart(event.target.value)} className={`${videoControlClass} block w-28 bg-slate-950`} /></label>
        <button type="button" disabled={!usable} aria-label={t('Set A to current position')} onClick={() => capture('start')} className={videoControlClass}>{t('Now')}</button>
        <label className="text-sm text-slate-300">{t('B (seconds)')}<input type="number" min="0" max={validDuration(duration) ? duration : undefined} step="0.1" value={end} disabled={!usable} onChange={(event) => setEnd(event.target.value)} className={`${videoControlClass} block w-28 bg-slate-950`} /></label>
        <button type="button" disabled={!usable} aria-label={t('Set B to current position')} onClick={() => capture('end')} className={videoControlClass}>{t('Now')}</button>
      </div>
      {mode === 'section' && !range && <p role="status" className="py-1 text-sm text-amber-300">{t('Loop suspended: use 0 <= A < B <= video duration.')}</p>}
      <div className="flex flex-wrap items-end gap-2 py-2">
        <label className="text-sm text-slate-300">{t('Position (seconds)')}<input type="number" min="0" max={validDuration(duration) ? duration : undefined} step="0.1" value={jump} disabled={!usable} onChange={(event) => setJump(event.target.value)} className={`${videoControlClass} block w-32 bg-slate-950`} /></label>
        <button type="button" disabled={!usable || !jumpTarget} onClick={() => { if (jumpTarget) onSeek(jumpTarget.position) }} className={videoControlClass}>{t('Jump')}</button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 py-2"><p className="text-sm text-slate-300">{t('Bookmarks')}</p><button type="button" disabled={!usable || saving} onClick={() => { const time = getPosition(); if (bookmarkSeek(time, duration, playing ? 1 : 2)) void save([...bookmarks, time]) }} className={videoControlClass}>{t('Save position')}</button></div>
      <div className="flex flex-wrap gap-2">
        {normalizeBookmarks(bookmarks).map((bookmark) => <span key={bookmark} className="inline-flex items-center text-sm"><button type="button" disabled={!usable || !bookmarkSeek(bookmark, duration, playing ? 1 : 2)} onClick={() => onSeek(bookmark)} className="min-h-11 px-3 text-sky-300 disabled:opacity-40">{formatPracticeTime(bookmark)}</button><button type="button" disabled={saving} aria-label={t('Remove bookmark at {time}', { time: formatPracticeTime(bookmark) })} onClick={() => { void save(bookmarks.filter((value) => value !== bookmark)) }} className="min-h-11 min-w-11 text-slate-300 disabled:opacity-40">{t('Remove')}</button></span>)}
      </div>
      {bookmarks.length === 0 && <p className="py-2 text-sm text-slate-400">{t('No bookmarks yet')}</p>}
      {saveError && <p role="alert" className="py-2 text-sm text-rose-300">{t('Could not save material changes.')}</p>}
    </div>
  )
}