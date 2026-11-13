import type { ReactNode } from 'react'
import type { SongMaterialFilter } from '../lib/songMaterialTypes'

type IconKind = 'video' | 'pdf' | 'tab' | 'notes' | 'plus'

export function SongToolIcon({ kind }: { kind: IconKind }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    {kind === 'video' ? <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m10 9 5 3-5 3Z" /></>
      : kind === 'pdf' ? <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" /><path d="M14 3v6h6" /><text x="6" y="17" fill="currentColor" stroke="none" fontFamily="sans-serif" fontSize="6" fontWeight="700">PDF</text></>
        : kind === 'tab' ? <path d="M12 3C7 3 3.8 5.2 4.2 9c.6 4.7 5.7 12 7.8 12s7.2-7.3 7.8-12C20.2 5.2 17 3 12 3Z" />
          : kind === 'notes' ? <><path d="M10 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" /><path d="m17 3 4 4-10 10-5 1 1-5ZM14 6l4 4" /></>
            : <path d="M12 4v16M4 12h16" />}
  </svg>
}

type Props = {
  filter: SongMaterialFilter
  hasVideo: boolean
  hasPdf: boolean
  hasTab: boolean
  hasNotes: boolean
  notesOpen: boolean
  onFilter: (filter: 'video' | 'pdf') => void
  onTab: () => void
  onNotes: () => void
  label: (key: string) => string
  addControl: ReactNode
}

export default function SongMaterialTools({ filter, hasVideo, hasPdf, hasTab, hasNotes, notesOpen, onFilter, onTab, onNotes, label, addControl }: Props) {
  const buttonClass = 'relative flex min-h-11 min-w-11 items-center justify-center rounded hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-sky-400 disabled:cursor-default disabled:text-slate-600 disabled:hover:bg-transparent'
  return <div className="flex flex-wrap items-center gap-1" role="group" aria-label={label('songTools.materials')}>
    {(['video', 'pdf'] as const).map((kind) => <button key={kind} type="button" disabled={filter !== kind && (kind === 'video' ? !hasVideo : !hasPdf)} aria-label={label(filter === kind ? 'songTools.showAll' : `songTools.${kind}`)} title={label(filter === kind ? 'songTools.showAll' : `songTools.${kind}`)} aria-pressed={filter === kind} onClick={() => onFilter(kind)} className={`${buttonClass} ${filter === kind ? 'bg-sky-500/15 text-sky-200' : 'text-sky-300'}`}><SongToolIcon kind={kind} /></button>)}
    <button type="button" aria-label={label('songTools.tab')} title={label('songTools.tab')} onClick={onTab} className={`${buttonClass} ${hasTab ? 'text-sky-300' : 'text-slate-500'}`}><SongToolIcon kind="tab" /></button>
    <button type="button" aria-label={label(hasNotes ? 'songTools.notesPresent' : 'songTools.notes')} title={label(hasNotes ? 'songTools.notesPresent' : 'songTools.notes')} aria-expanded={notesOpen} onClick={onNotes} className={`${buttonClass} ${hasNotes ? 'bg-amber-500/10 text-amber-200' : 'text-slate-300'}`}><SongToolIcon kind="notes" />{hasNotes && <span aria-hidden="true" className="absolute right-1 top-0 text-sm">*</span>}</button>
    {addControl}
  </div>
}
