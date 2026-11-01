import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { useI18n } from '../lib/i18n'
import { bookmarkNameMaxLength, normalizeBookmarkName, normalizeBookmarks, type PlaybackBookmark } from '../lib/localMaterials'
import { bookmarkSeek, formatPracticeTime, loopRange, validDuration, type LoopMode, type LoopRange } from '../lib/youtubePractice'

type Props = {
  kind?: 'video' | 'audio'
  usable: boolean
  playing: boolean
  duration: number
  position: number
  rates: number[]
  rate: number
  bookmarks: PlaybackBookmark[]
  shortcuts?: string
  getPosition: () => number
  onToggle: () => void
  onSeek: (position: number) => void
  onRate: (rate: number) => void
  onLoopRange: (range: LoopRange | null) => void
  onBookmarksChange: (bookmarks: PlaybackBookmark[]) => Promise<void>
}

export const videoControlClass = 'min-h-11 min-w-11 rounded border border-slate-600 px-3 text-sm text-slate-200 disabled:opacity-40'
// Typed loop bounds apply after a pause (or on blur) so partial input such as "4" on the way to "45" does not seek the player.
export const loopEditDelayMs = 700

function loopBound(value: string) {
  return value.trim() ? Number(value) : NaN
}

export default function VideoPracticeControls({ kind = 'video', usable, playing, duration, position, rates, rate, bookmarks, shortcuts, getPosition, onToggle, onSeek, onRate, onLoopRange, onBookmarksChange }: Props) {
  const { t } = useI18n()
  const isAudio = kind === 'audio'
  const toggleLabel = isAudio ? t(playing ? 'Pause audio' : 'Play audio') : t(playing ? 'Pause video' : 'Play video')
  const [mode, setMode] = useState<LoopMode>('off')
  const [start, setStart] = useState('0')
  const [end, setEnd] = useState('')
  const [applied, setApplied] = useState({ start: '0', end: '' })
  const [jump, setJump] = useState('0')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [renaming, setRenaming] = useState<{ seconds: number; draft: string } | null>(null)
  const mountedRef = useRef(false)
  const listRef = useRef<HTMLDivElement>(null)
  const restoreFocusRef = useRef<number | null>(null)
  const range = loopRange(mode, loopBound(applied.start), loopBound(applied.end), duration)
  const reportRange = useEffectEvent(onLoopRange)
  const list = normalizeBookmarks(bookmarks)
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])
  useEffect(() => { reportRange(loopRange(mode, loopBound(applied.start), loopBound(applied.end), duration)) }, [mode, applied, duration])
  useEffect(() => {
    if (applied.start === start && applied.end === end) return
    const timer = setTimeout(() => setApplied({ start, end }), loopEditDelayMs)
    return () => clearTimeout(timer)
  }, [start, end, applied])
  useEffect(() => {
    const seconds = restoreFocusRef.current
    if (renaming !== null || seconds === null) return
    restoreFocusRef.current = null
    listRef.current?.querySelector<HTMLButtonElement>(`[data-bookmark-rename="${seconds}"]`)?.focus()
  }, [renaming])

  async function save(next: PlaybackBookmark[]) {
    setSaving(true)
    setSaveError(false)
    try { await onBookmarksChange(normalizeBookmarks(next)); return true }
    catch { if (mountedRef.current) setSaveError(true); return false }
    finally { if (mountedRef.current) setSaving(false) }
  }

  function closeRename(seconds: number) {
    restoreFocusRef.current = seconds
    setRenaming(null)
  }

  async function commitRename() {
    if (!renaming || saving) return
    const { seconds, draft } = renaming
    const name = normalizeBookmarkName(draft)
    const current = list.find((bookmark) => bookmark.seconds === seconds)
    if (!current || current.name === name) { closeRename(seconds); return }
    const next = list.map((bookmark) => bookmark.seconds === seconds ? (name ? { seconds, name } : { seconds }) : bookmark)
    if (await save(next) && mountedRef.current) closeRename(seconds)
  }

  function capture(point: 'start' | 'end') {
    const time = getPosition()
    if (!Number.isFinite(time)) return
    const value = time.toFixed(1)
    if (point === 'start') { setStart(value); setApplied({ start: value, end }) }
    else { setEnd(value); setApplied({ start, end: value }) }
  }

  const jumpTarget = jump.trim() ? bookmarkSeek(Number(jump), duration, playing ? 1 : 2) : null
  return (
    <div className="px-2">
      <div className="flex flex-wrap items-end gap-2 py-2">
        <button type="button" disabled={!usable} onClick={onToggle} title={toggleLabel} aria-label={toggleLabel} aria-description={shortcuts} className={videoControlClass}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">{playing ? <path d="M6 4h4v16H6zM14 4h4v16h-4z" /> : <path d="m7 3 15 9-15 9z" />}</svg>
        </button>
        <span className="py-3 text-sm tabular-nums text-slate-300">{formatPracticeTime(position)}</span>
        <label className="min-w-0 text-sm text-slate-300">{t('Playback speed')}<select value={rates.includes(rate) ? rate : ''} disabled={!usable || rates.length < 2} onChange={(event) => onRate(Number(event.target.value))} className={`${videoControlClass} block max-w-full bg-slate-950`}>{!rates.includes(rate) && <option value="">{t('Speed unavailable')}</option>}{rates.map((value) => <option key={value} value={value}>{t('{rate}x', { rate: value })}</option>)}</select></label>
        <label className="min-w-0 text-sm text-slate-300">{isAudio ? t('Audio loop') : t('Video loop')}<select value={mode} disabled={!usable} onChange={(event) => setMode(event.target.value as LoopMode)} className={`${videoControlClass} block max-w-full bg-slate-950`}><option value="off">{t('Loop off')}</option><option value="whole">{isAudio ? t('Whole track') : t('Whole video')}</option><option value="section">{t('Loop A-B')}</option></select></label>
      </div>
      <div className="flex flex-wrap items-end gap-2 py-2">
        <label className="text-sm text-slate-300">{t('A (seconds)')}<input type="number" min="0" max={validDuration(duration) ? duration : undefined} step="0.1" value={start} disabled={!usable} onChange={(event) => setStart(event.target.value)} onBlur={() => setApplied({ start, end })} className={`${videoControlClass} block w-28 bg-slate-950`} /></label>
        <button type="button" disabled={!usable} aria-label={t('Set A to current position')} onClick={() => capture('start')} className={videoControlClass}>{t('Now')}</button>
        <label className="text-sm text-slate-300">{t('B (seconds)')}<input type="number" min="0" max={validDuration(duration) ? duration : undefined} step="0.1" value={end} disabled={!usable} onChange={(event) => setEnd(event.target.value)} onBlur={() => setApplied({ start, end })} className={`${videoControlClass} block w-28 bg-slate-950`} /></label>
        <button type="button" disabled={!usable} aria-label={t('Set B to current position')} onClick={() => capture('end')} className={videoControlClass}>{t('Now')}</button>
      </div>
      {mode === 'section' && !range && <p role="status" className="py-1 text-sm text-amber-300">{isAudio ? t('Loop suspended: use 0 <= A < B <= audio duration.') : t('Loop suspended: use 0 <= A < B <= video duration.')}</p>}
      <div className="flex flex-wrap items-end gap-2 py-2">
        <label className="text-sm text-slate-300">{t('Position (seconds)')}<input type="number" min="0" max={validDuration(duration) ? duration : undefined} step="0.1" value={jump} disabled={!usable} onChange={(event) => setJump(event.target.value)} className={`${videoControlClass} block w-32 bg-slate-950`} /></label>
        <button type="button" disabled={!usable || !jumpTarget} onClick={() => { if (jumpTarget) onSeek(jumpTarget.position) }} className={videoControlClass}>{t('Jump')}</button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 py-2"><p className="text-sm text-slate-300">{t('Bookmarks')}</p><button type="button" disabled={!usable || saving} onClick={() => { const time = getPosition(); if (bookmarkSeek(time, duration, playing ? 1 : 2)) void save([...list, { seconds: time }]) }} className={videoControlClass}>{t('Save position')}</button></div>
      <div ref={listRef} className="flex flex-wrap gap-2">
        {list.map((bookmark) => {
          const time = formatPracticeTime(bookmark.seconds)
          const label = bookmark.name ?? time
          if (renaming?.seconds === bookmark.seconds) return (
            <div key={bookmark.seconds} className="flex w-full flex-wrap items-center gap-2 text-sm">
              <input autoFocus type="text" aria-label={t('Bookmark name at {time}', { time })} placeholder={time} maxLength={bookmarkNameMaxLength} value={renaming.draft} disabled={saving}
                onChange={(event) => setRenaming({ seconds: bookmark.seconds, draft: event.target.value })}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') { event.preventDefault(); void commitRename() }
                  else if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeRename(bookmark.seconds) }
                }}
                className={`${videoControlClass} min-w-0 flex-1 bg-slate-950`} />
              <button type="button" disabled={saving} onClick={() => { void commitRename() }} className={`${videoControlClass} text-sky-300`}>{t('Save name')}</button>
              <button type="button" disabled={saving} onClick={() => closeRename(bookmark.seconds)} className={videoControlClass}>{t('Cancel')}</button>
              <p className="w-full text-xs text-slate-400">{t('Leave the name empty to show the time.')}</p>
            </div>
          )
          return <span key={bookmark.seconds} className="inline-flex flex-wrap items-center text-sm"><button type="button" disabled={!usable || !bookmarkSeek(bookmark.seconds, duration, playing ? 1 : 2)} onClick={() => onSeek(bookmark.seconds)} className="min-h-11 max-w-60 truncate px-3 text-sky-300 disabled:opacity-40">{label}</button>{bookmark.name !== undefined && <span className="pr-2 text-xs tabular-nums text-slate-400">{time}</span>}<button type="button" data-bookmark-rename={bookmark.seconds} disabled={saving || renaming !== null} aria-label={t('Rename bookmark {name}', { name: label })} onClick={() => setRenaming({ seconds: bookmark.seconds, draft: bookmark.name ?? '' })} className="min-h-11 min-w-11 px-2 text-slate-300 disabled:opacity-40">{t('Rename')}</button><button type="button" disabled={saving} aria-label={t('Remove bookmark at {time}', { time })} onClick={() => { void save(list.filter((value) => value.seconds !== bookmark.seconds)) }} className="min-h-11 min-w-11 text-slate-300 disabled:opacity-40">{t('Remove')}</button></span>
        })}
      </div>
      {list.length === 0 && <p className="py-2 text-sm text-slate-400">{t('No bookmarks yet')}</p>}
      {saveError && <p role="alert" className="py-2 text-sm text-rose-300">{t('Could not save material changes.')}</p>}
    </div>
  )
}