import { useEffect, useRef, useState } from 'react'
import PlaybackSpeedThumbwheel from './PlaybackSpeedThumbwheel'
import PracticeLoopControls from './PracticeLoopControls'
import { useI18n } from '../lib/i18n'
import { bookmarkNameMaxLength, normalizeBookmarkName, normalizeBookmarks, type PlaybackBookmark } from '../lib/localMaterials'
import { bookmarkSeek, formatPracticeTime } from '../lib/youtubePractice'
import type { LoopPlaybackState, LoopRegion } from '../lib/loopRegions'

type Props = {
  kind?: 'video' | 'audio'
  usable: boolean
  playing: boolean
  duration: number
  position: number
  rates: number[]
  rate: number
  rateMode?: 'supported' | 'continuous'
  bookmarks: PlaybackBookmark[]
  shortcuts?: string
  getPosition: () => number
  onToggle: () => void
  onSeek: (position: number) => void
  onRate: (rate: number) => void
  loops: LoopRegion[]
  loopState: LoopPlaybackState
  onLoopStateChange: (state: LoopPlaybackState) => void
  onLoopsChange: (loops: LoopRegion[]) => Promise<void>
  onPlayFrom: (position: number) => void
  onBookmarksChange: (bookmarks: PlaybackBookmark[]) => Promise<void>
}

export const videoControlClass = 'min-h-11 min-w-11 rounded border border-slate-600 px-3 text-sm text-slate-200 disabled:opacity-40'
export default function VideoPracticeControls({ kind = 'video', usable, playing, duration, position, rates, rate, rateMode = 'supported', bookmarks, shortcuts, getPosition, onToggle, onSeek, onRate, loops, loopState, onLoopStateChange, onLoopsChange, onPlayFrom, onBookmarksChange }: Props) {
  const { t } = useI18n()
  const isAudio = kind === 'audio'
  const toggleLabel = isAudio ? t(playing ? 'Pause audio' : 'Play audio') : t(playing ? 'Pause video' : 'Play video')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [renaming, setRenaming] = useState<{ seconds: number; draft: string } | null>(null)
  const mountedRef = useRef(false)
  const listRef = useRef<HTMLDivElement>(null)
  const restoreFocusRef = useRef<number | null>(null)
  const list = normalizeBookmarks(bookmarks)
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])
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

  return (
    <div className="px-2">
      <PracticeLoopControls usable={usable} playing={playing} duration={duration} position={position} regions={loops} state={loopState}
        onStateChange={onLoopStateChange} onRegionsChange={onLoopsChange} onSeek={onSeek} onPlayFrom={onPlayFrom}
        renderControls={(loopToggle) => <div className="flex flex-wrap items-end gap-2 py-2">
        <button type="button" disabled={!usable} onClick={onToggle} title={toggleLabel} aria-label={toggleLabel} aria-description={shortcuts} className={videoControlClass}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">{playing ? <path d="M6 4h4v16H6zM14 4h4v16h-4z" /> : <path d="m7 3 15 9-15 9z" />}</svg>
        </button>
        <span className="py-3 text-sm tabular-nums text-slate-300">{formatPracticeTime(position)}</span>
        <PlaybackSpeedThumbwheel rate={rate} rates={rateMode === 'supported' ? rates : undefined} disabled={!usable} onRate={onRate} />
        {loopToggle}
      </div>} />
      <div className="flex flex-wrap items-center justify-between gap-2 py-2"><p className="text-sm text-slate-300">{t('Bookmarks')}</p><button type="button" disabled={!usable || saving} onClick={() => { const time = getPosition(); if (bookmarkSeek(time, duration, playing ? 1 : 2)) void save([...list, { seconds: time }]) }} className={videoControlClass}>{t('Save position')}</button></div>
      <div ref={listRef} className="flex flex-wrap gap-2">
        {list.map((bookmark) => {
          const time = formatPracticeTime(bookmark.seconds)
          const label = bookmark.name ?? time
          if (renaming?.seconds === bookmark.seconds) return (
            <div key={bookmark.seconds} className="flex w-full flex-col items-stretch gap-2 text-sm">
              <input autoFocus type="text" aria-label={t('Bookmark name at {time}', { time })} placeholder={time} maxLength={bookmarkNameMaxLength} value={renaming.draft} disabled={saving}
                onChange={(event) => setRenaming({ seconds: bookmark.seconds, draft: event.target.value })}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') { event.preventDefault(); void commitRename() }
                  else if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeRename(bookmark.seconds) }
                }}
                className={`${videoControlClass} w-full min-w-0 bg-slate-950`} />
              <div className="flex gap-2">
                <button type="button" disabled={saving} aria-label={t('Save name')} title={t('Save name')} onClick={() => { void commitRename() }} className={`${videoControlClass} inline-flex items-center justify-center text-sky-300 hover:bg-slate-800 hover:text-sky-200 focus-visible:outline-2 focus-visible:outline-sky-400`}><svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h12l3 3v13H4V4h1Z" /><path d="M8 4v6h8V4M8 20v-6h8v6" /></svg></button>
                <button type="button" disabled={saving} aria-label={t('Cancel')} title={t('Cancel')} onClick={() => closeRename(bookmark.seconds)} className={`${videoControlClass} inline-flex items-center justify-center hover:bg-slate-800 hover:text-slate-100 focus-visible:outline-2 focus-visible:outline-sky-400`}><svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18" /></svg></button>
              </div>
              <p className="w-full text-xs text-slate-400">{t('Leave the name empty to show the time.')}</p>
            </div>
          )
          return <span key={bookmark.seconds} className="inline-flex flex-wrap items-center text-sm"><button type="button" disabled={!usable || !bookmarkSeek(bookmark.seconds, duration, playing ? 1 : 2)} onClick={() => onSeek(bookmark.seconds)} className="min-h-11 max-w-60 truncate px-3 text-sky-300 disabled:opacity-40">{label}</button>{bookmark.name !== undefined && <span className="pr-2 text-xs tabular-nums text-slate-400">{time}</span>}<button type="button" data-bookmark-rename={bookmark.seconds} disabled={saving || renaming !== null} aria-label={t('Rename bookmark {name}', { name: label })} onClick={() => setRenaming({ seconds: bookmark.seconds, draft: bookmark.name ?? '' })} className="min-h-11 min-w-11 inline-flex items-center justify-center rounded px-2 text-slate-300 transition-colors hover:bg-slate-800 hover:text-sky-200 focus-visible:outline-2 focus-visible:outline-sky-400 disabled:opacity-40"><svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 5 4 4M4 20l4.25-.75L20 7.5 16.5 4 4.75 15.75 4 20Z" /></svg></button><button type="button" disabled={saving} aria-label={t('Remove bookmark at {time}', { time })} onClick={() => { void save(list.filter((value) => value.seconds !== bookmark.seconds)) }} className="min-h-11 min-w-11 inline-flex items-center justify-center rounded text-slate-300 transition-colors hover:bg-slate-800 hover:text-rose-300 focus-visible:outline-2 focus-visible:outline-sky-400 disabled:opacity-40"><svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18" /></svg></button></span>
        })}
      </div>
      {list.length === 0 && <p className="py-2 text-sm text-slate-400">{t('No bookmarks yet')}</p>}
      {saveError && <p role="alert" className="py-2 text-sm text-rose-300">{t('Could not save material changes.')}</p>}
    </div>
  )
}
