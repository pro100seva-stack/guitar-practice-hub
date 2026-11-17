import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react'
import { useI18n } from '../lib/i18n'
import { editLoopBoundary, formatLoopTimestamp, layoutLoopRegions, loopNameMaxLength, loopPalette, normalizeLoopRegions, orderedLoopRegions, parseLoopTimestamp, type LoopPlaybackState, type LoopRegion } from '../lib/loopRegions'

type Props = {
  usable: boolean
  playing: boolean
  duration: number
  position: number
  regions: LoopRegion[]
  state: LoopPlaybackState
  onStateChange: (next: LoopPlaybackState) => void
  onRegionsChange: (next: LoopRegion[]) => Promise<void>
  onSeek: (seconds: number) => void
  onPlayFrom: (seconds: number) => void
  renderControls: (loopToggle: ReactNode) => ReactNode
}
type Boundary = 'start' | 'end'
type Editor = { kind: 'add' | 'rename' | 'boundary'; id?: string; side?: Boundary; name: string; start: string; end: string; error: boolean }
type Gesture = { pointer: number; kind: 'handle' | 'region' | 'playhead'; id?: string; side?: Boundary; x: number; width: number; initial: LoopRegion[]; moved: boolean; held: boolean; wasDirty: boolean; snapOffset?: number; timer?: ReturnType<typeof setTimeout> }
const buttonClass = 'loop-region-action'

export default function PracticeLoopControls({ usable, duration, position, regions, state, onStateChange, onRegionsChange, onSeek, onPlayFrom, renderControls }: Props) {
  const { t } = useI18n()
  const headingId = useId()
  const [draft, setDraft] = useState(() => normalizeLoopRegions(regions))
  const incomingKey = useMemo(() => JSON.stringify(normalizeLoopRegions(regions)), [regions])
  const draftRef = useRef(draft)
  const dirtyRef = useRef(false)
  const pendingRef = useRef<LoopRegion[] | null>(null)
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const [saveError, setSaveError] = useState(false)
  const [editor, setEditor] = useState<Editor | null>(null)
  const [setupOpen, setSetupOpen] = useState(false)
  const [overflowOpen, setOverflowOpen] = useState(false)
  const [dragLabel, setDragLabel] = useState<string | null>(null)
  const mounted = useRef(false)
  const timeline = useRef<HTMLDivElement>(null)
  const gesture = useRef<Gesture | null>(null)
  const editorField = useRef<HTMLInputElement>(null)
  const latest = useRef({ onRegionsChange, onStateChange, state, usable, duration })
  latest.current = { onRegionsChange, onStateChange, state, usable, duration }
  const ready = usable && Number.isFinite(duration) && duration >= 0.01
  const locked = !ready || busy
  const playbackLocked = locked || saveError
  const loopsVisible = state.mode !== 'off' || setupOpen || saveError
  const repeatEnabled = state.mode === 'repeat' || setupOpen
  const suppressRegionClick = useRef(false)
  const selected = draft.find((region) => region.id === state.selectedId)
  const valid = (region: LoopRegion) => region.start >= 0 && region.end > region.start && region.end <= duration
  const playable = useMemo(() => orderedLoopRegions(draft.filter((region) => region.start >= 0 && region.end > region.start && region.end <= duration)), [draft, duration])
  const layout = useMemo(() => {
    // Keep the captured element in its lane during a drag; reassign lanes on release.
    const initial = gesture.current?.initial
    const assigned = layoutLoopRegions(initial?.length ? initial : draft, state.selectedId)
    const current = new Map(draft.map((region) => [region.id, region]))
    return { ...assigned, lanes: assigned.lanes.map((lane) => lane.map((region) => current.get(region.id) ?? region)) }
  }, [draft, state.selectedId])
  const percentage = (seconds: number) => `${Math.max(0, Math.min(100, duration > 0 ? seconds / duration * 100 : 0))}%`
  const regionName = (region: LoopRegion) => region.name || t('loops.unnamed')

  function preview(next: LoopRegion[], dirty = true) {
    draftRef.current = next
    dirtyRef.current = dirty
    setDraft(next)
  }

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; if (gesture.current?.timer) clearTimeout(gesture.current.timer) }
  }, [])
  useEffect(() => {
    if (!dirtyRef.current && !busyRef.current && !gesture.current) {
      const next = normalizeLoopRegions(JSON.parse(incomingKey))
      draftRef.current = next
      setDraft(next)
    }
  }, [incomingKey])
  useEffect(() => { editorField.current?.focus({ preventScroll: true }) }, [editor?.kind, editor?.id, editor?.side])

  async function commit(next: LoopRegion[]): Promise<boolean> {
    if (busyRef.current || !mounted.current) return false
    const normalized = normalizeLoopRegions(next)
    preview(normalized)
    pendingRef.current = normalized
    busyRef.current = true
    setBusy(true)
    setSaveError(false)
    try {
      await latest.current.onRegionsChange(normalized)
      if (!mounted.current) return false
      dirtyRef.current = false
      pendingRef.current = null
      return true
    } catch {
      if (mounted.current) setSaveError(true)
      return false
    } finally {
      busyRef.current = false
      if (mounted.current) setBusy(false)
    }
  }

  function select(region: LoopRegion) {
    if (playbackLocked || !valid(region)) return
    const nextMode = state.mode === 'sequence' ? 'off' : state.mode
    onStateChange({ mode: nextMode, selectedId: region.id })
    if (nextMode === 'repeat') onSeek(region.start)
  }

  function openAdd() {
    if (locked) return
    const start = Math.max(0, Math.min(Math.floor(duration * 100) / 100 - 0.01, Number.isFinite(position) ? position : 0))
    const end = Math.max(start + 0.01, Math.min(Math.floor(duration * 100) / 100, start + 5))
    setEditor({ kind: 'add', name: t('loops.defaultName', { number: draft.length + 1 }), start: formatLoopTimestamp(start), end: formatLoopTimestamp(end), error: false })
  }
  function openBoundary(region: LoopRegion, side?: Boundary) {
    if (busyRef.current || !latest.current.usable) return
    setEditor({ kind: 'boundary', id: region.id, side, name: region.name, start: formatLoopTimestamp(region.start), end: formatLoopTimestamp(region.end), error: false })
  }
  async function saveEditor() {
    if (!editor || locked) return
    const current = editor
    const start = parseLoopTimestamp(current.start)
    const end = parseLoopTimestamp(current.end)
    if (start === null || end === null || start < 0 || end <= start || (current.kind !== 'rename' && end > duration)) { setEditor({ ...current, error: true }); return }
    const id = current.id ?? crypto.randomUUID()
    const previous = draftRef.current.find((region) => region.id === id)
    if (current.kind !== 'add' && !previous) { setEditor(null); return }
    const nextRegion: LoopRegion = {
      id, name: current.name.trim(), start, end,
      color: previous?.color ?? draftRef.current.length % loopPalette.length,
      order: previous?.order ?? Math.max(-1, ...draftRef.current.map((region) => region.order)) + 1,
    }
    const next = previous ? draftRef.current.map((region) => region.id === id ? nextRegion : region) : [...draftRef.current, nextRegion]
    if (await commit(next) && mounted.current) {
      setEditor(null)
      if (!latest.current.state.selectedId || current.kind === 'add') latest.current.onStateChange({ mode: setupOpen ? 'repeat' : latest.current.state.mode === 'sequence' ? 'off' : latest.current.state.mode, selectedId: id })
      setSetupOpen(false)
    }
  }
  async function remove(region: LoopRegion) {
    if (locked) return
    if (await commit(draftRef.current.filter((entry) => entry.id !== region.id)) && mounted.current && latest.current.state.selectedId === region.id) {
      latest.current.onStateChange({ mode: 'off', selectedId: null })
    }
  }
  async function retrySave() {
    const pending = pendingRef.current
    if (!pending || !await commit(pending) || !mounted.current) return
    setEditor(null)
    const current = latest.current.state
    if (setupOpen && pending.length) {
      latest.current.onStateChange({ mode: 'repeat', selectedId: pending[pending.length - 1].id })
      setSetupOpen(false)
    } else if (current.selectedId && !pending.some((region) => region.id === current.selectedId)) latest.current.onStateChange({ mode: 'off', selectedId: null })
  }

  function capture(event: PointerEvent<HTMLElement>, next: Gesture) {
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    gesture.current = next
  }
  function startPlayhead(event: PointerEvent<HTMLElement>) {
    if (locked || event.button !== 0 || event.isPrimary === false || gesture.current) return
    const bounds = timeline.current?.getBoundingClientRect()
    if (!bounds?.width) return
    capture(event, { pointer: event.pointerId, kind: 'playhead', x: event.clientX, width: bounds.width, initial: [], moved: true, held: false, wasDirty: dirtyRef.current })
    onSeek(Math.max(0, Math.min(duration, (event.clientX - bounds.left) / bounds.width * duration)))
  }
  function startHandle(event: PointerEvent<HTMLButtonElement>, region: LoopRegion, side: Boundary) {
    if (locked || event.button !== 0 || event.isPrimary === false || gesture.current || !valid(region)) return
    const width = timeline.current?.getBoundingClientRect().width ?? 0
    if (width <= 0) return
    const next: Gesture = { pointer: event.pointerId, kind: 'handle', id: region.id, side, x: event.clientX, width, initial: draftRef.current, moved: false, held: false, wasDirty: dirtyRef.current }
    next.timer = setTimeout(() => {
      if (gesture.current !== next || next.moved) return
      next.held = true
      openBoundary(region, side)
    }, 500)
    capture(event, next)
  }
  function startRegion(event: PointerEvent<HTMLButtonElement>, region: LoopRegion) {
    suppressRegionClick.current = false
    if (playbackLocked || event.button !== 0 || event.isPrimary === false || gesture.current || !valid(region)) return
    const width = timeline.current?.getBoundingClientRect().width ?? 0
    if (width <= 0) return
    capture(event, { pointer: event.pointerId, kind: 'region', id: region.id, x: event.clientX, width, initial: draftRef.current, moved: false, held: false, wasDirty: dirtyRef.current })
  }
  function snapOffset(current: Gesture, requested: number, minimum: number, maximum: number, movingEdges: number[]) {
    const offset = Math.max(minimum, Math.min(maximum, requested))
    const pixels = (difference: number) => Math.abs(difference) / 100 / duration * current.width
    // Capture within 3 CSS pixels; release only beyond 6, independently of video length.
    if (current.snapOffset !== undefined && current.snapOffset >= minimum && current.snapOffset <= maximum && pixels(offset - current.snapOffset) <= 6) return current.snapOffset
    current.snapOffset = undefined
    let nearest = offset
    let distance = Infinity
    for (const other of current.initial) {
      if (other.id === current.id || !valid(other)) continue
      for (const edge of [other.start, other.end]) {
        for (const moving of movingEdges) {
          const candidate = Math.round(edge * 100) - moving
          const separation = pixels(offset - candidate)
          if (candidate >= minimum && candidate <= maximum && separation <= 3 && separation < distance) {
            nearest = candidate
            distance = separation
          }
        }
      }
    }
    if (distance !== Infinity) current.snapOffset = nearest
    return nearest
  }
  function move(event: PointerEvent<HTMLElement>) {
    const current = gesture.current
    if (!current || current.pointer !== event.pointerId || current.held) return
    event.preventDefault()
    event.stopPropagation()
    const distance = event.clientX - current.x
    if (current.kind === 'playhead') {
      const bounds = timeline.current?.getBoundingClientRect()
      if (bounds?.width) onSeek(Math.max(0, Math.min(duration, (event.clientX - bounds.left) / bounds.width * duration)))
      return
    }
    if (!current.moved && Math.abs(distance) < 5) return
    current.moved = true
    if (current.timer) { clearTimeout(current.timer); current.timer = undefined }
    const region = current.initial.find((entry) => entry.id === current.id)
    if (!region) return
    if (current.kind === 'region') {
      // Shift integer centiseconds so both boundaries move by exactly the same amount.
      const start = Math.round(region.start * 100), end = Math.round(region.end * 100)
      const offset = snapOffset(current, Math.round(distance / current.width * duration * 100), -start, Math.floor(duration * 100) - end, [start, end])
      const edited = { ...region, start: (start + offset) / 100, end: (end + offset) / 100 }
      preview(current.initial.map((entry) => entry.id === region.id ? edited : entry))
      setDragLabel(`${formatLoopTimestamp(edited.start)} – ${formatLoopTimestamp(edited.end)}`)
      return
    }
    if (!current.side) return
    const edge = Math.round(region[current.side] * 100)
    const minimum = current.side === 'start' ? -edge : Math.round(region.start * 100) + 1 - edge
    const maximum = current.side === 'start' ? Math.round(region.end * 100) - 1 - edge : Math.floor(duration * 100) - edge
    const offset = snapOffset(current, Math.round(distance / current.width * duration * 100), minimum, maximum, [edge])
    const edited = editLoopBoundary(region, current.side, (edge + offset) / 100, duration)
    if (!edited) return
    preview(current.initial.map((entry) => entry.id === region.id ? edited : entry))
    setDragLabel(formatLoopTimestamp(edited[current.side]))
  }
  function finish(event: PointerEvent<HTMLElement>, cancelled = false) {
    const current = gesture.current
    if (!current || current.pointer !== event.pointerId) return
    event.preventDefault()
    event.stopPropagation()
    if (current.timer) clearTimeout(current.timer)
    gesture.current = null
    setDragLabel(null)
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (current.kind === 'region') suppressRegionClick.current = current.moved || cancelled
    if ((current.kind === 'handle' || current.kind === 'region') && current.moved) {
      if (cancelled) preview(current.initial, current.wasDirty)
      else void commit(draftRef.current)
    }
  }
  function handleKey(region: LoopRegion, side: Boundary, key: string, shift: boolean) {
    if (locked) return false
    if (key === 'Enter' || key === ' ') { openBoundary(region, side); return true }
    const amount = shift ? 0.01 : 0.1
    const target = key === 'ArrowLeft' || key === 'ArrowDown' ? region[side] - amount
      : key === 'ArrowRight' || key === 'ArrowUp' ? region[side] + amount
        : key === 'Home' ? 0 : key === 'End' ? duration : null
    if (target === null) return false
    const next = editLoopBoundary(region, side, target, duration)
    if (next) void commit(draftRef.current.map((entry) => entry.id === region.id ? next : entry))
    return true
  }

  const loopToggle = <button type="button" disabled={playbackLocked} aria-pressed={repeatEnabled} aria-label={t(repeatEnabled ? 'loops.disableRepeat' : 'loops.enableRepeat')} title={t(repeatEnabled ? 'loops.disableRepeat' : 'loops.enableRepeat')}
    className={`loop-toggle${repeatEnabled ? ' is-active' : ''}`} onClick={() => {
      if (repeatEnabled) { setSetupOpen(false); setEditor(null); onStateChange({ ...state, mode: 'off' }) }
      else {
        const region = selected && valid(selected) ? selected : playable[0]
        if (!region) { setSetupOpen(true); openAdd() }
        else { onStateChange({ mode: 'repeat', selectedId: region.id }); onSeek(region.start) }
      }
    }}><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h14l-3-3M20 16H6l3 3M20 8v4M4 16v-4" /></svg>{repeatEnabled && <span aria-hidden="true">A–B</span>}</button>

  const editorForm = editor && <form className="loop-position-editor" aria-label={t(editor.kind === 'add' ? 'loops.add' : editor.kind === 'rename' ? 'loops.rename' : 'loops.precise')} onSubmit={(event) => { event.preventDefault(); void saveEditor() }} onKeyDown={(event) => { if (event.key === 'Escape' && !busy) { event.preventDefault(); event.stopPropagation(); setEditor(null); setSetupOpen(false) } }}>
        {editor.kind !== 'boundary' && <label>{t('loops.name')}<input ref={editorField} type="text" maxLength={loopNameMaxLength} value={editor.name} disabled={busy} onChange={(event) => setEditor({ ...editor, name: event.target.value, error: false })} /></label>}
        {editor.kind !== 'rename' && <div className="loop-editor-bounds">{(['start', 'end'] as const).filter((side) => editor.kind !== 'boundary' || !editor.side || side === editor.side).map((side) => <label key={side}>{t(side === 'start' ? 'loops.start' : 'loops.end')}<span><input ref={editor.kind === 'boundary' && (editor.side === side || (!editor.side && side === 'start')) ? editorField : undefined} type="text" inputMode="decimal" placeholder="01:24.50" value={editor[side]} disabled={busy} onChange={(event) => setEditor({ ...editor, [side]: event.target.value, error: false })} /><button type="button" className={buttonClass} disabled={busy} onClick={() => setEditor({ ...editor, [side]: formatLoopTimestamp(Math.max(0, Math.min(duration, position))), error: false })}>{t('Now')}</button></span></label>)}</div>}
        {editor.error && <p role="alert" className="msg-error">{t('loops.invalidBounds')}</p>}
        <div><button type="submit" className={buttonClass} disabled={busy}>{t('loops.save')}</button><button type="button" className={buttonClass} disabled={busy} onClick={() => { setEditor(null); setSetupOpen(false) }}>{t('Cancel')}</button></div>
      </form>

  return <>
    {loopsVisible && <section className="loop-timeline-section" aria-label={t('loops.timeline')}>
      <div className="loop-timeline-times"><span>{formatLoopTimestamp(position)}</span><span>{formatLoopTimestamp(duration)}</span></div>
      <div ref={timeline} className="loop-timeline" onPointerDown={(event) => {
        if (locked || event.button !== 0 || event.isPrimary === false || event.target !== event.currentTarget) return
        const bounds = event.currentTarget.getBoundingClientRect()
        if (bounds.width) onSeek(Math.max(0, Math.min(duration, (event.clientX - bounds.left) / bounds.width * duration)))
      }}>
        <div className="loop-time-markers" aria-hidden="true">{[0, 0.25, 0.5, 0.75, 1].map((fraction) => <span key={fraction} style={{ left: `${fraction * 100}%` }}>{formatLoopTimestamp(duration * fraction)}</span>)}</div>
        {layout.lanes.map((lane, index) => <div key={index} className="loop-region-lane" data-loop-lane={index}>
          {lane.map((region) => <div key={region.id} className={`loop-region${state.selectedId === region.id ? ' is-selected' : ''}${!valid(region) ? ' is-unavailable' : ''}`} style={{ left: percentage(region.start), width: percentage(region.end - region.start), '--loop-color': loopPalette[region.color] } as CSSProperties}>
            <button type="button" className="loop-region-name" disabled={playbackLocked || !valid(region)} aria-pressed={state.selectedId === region.id} title={`${regionName(region)} · ${formatLoopTimestamp(region.start)} – ${formatLoopTimestamp(region.end)}`}
              onPointerDown={(event) => startRegion(event, region)} onPointerMove={move} onPointerUp={(event) => finish(event)} onPointerCancel={(event) => finish(event, true)} onLostPointerCapture={(event) => finish(event, true)}
              onClick={(event) => { if (event.detail !== 0 && suppressRegionClick.current) { suppressRegionClick.current = false; return }; select(region) }}>{regionName(region)}</button>
            {(['start', 'end'] as const).map((side) => <button key={side} type="button" className={`loop-boundary loop-boundary-${side}`} disabled={playbackLocked || !valid(region)} aria-label={t(side === 'start' ? 'loops.startHandle' : 'loops.endHandle', { name: regionName(region) })} aria-description={t('loops.handleHint')} title={formatLoopTimestamp(region[side])}
              onPointerDown={(event) => startHandle(event, region, side)} onPointerMove={move} onPointerUp={(event) => finish(event)} onPointerCancel={(event) => finish(event, true)} onLostPointerCapture={(event) => finish(event, true)}
              onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); if (gesture.current?.moved) return; if (gesture.current?.timer) clearTimeout(gesture.current.timer); gesture.current = null; openBoundary(region, side) }}
              onKeyDown={(event) => { if (handleKey(region, side, event.key, event.shiftKey)) { event.preventDefault(); event.stopPropagation() } }}><span aria-hidden="true" /></button>)}
          </div>)}
        </div>)}
        <div className="loop-seek-track" role="slider" tabIndex={locked ? -1 : 0} aria-label={t('loops.seek')} aria-valuemin={0} aria-valuemax={Number.isFinite(duration) ? duration : 0} aria-valuenow={Math.max(0, Math.min(duration || 0, position || 0))} aria-valuetext={formatLoopTimestamp(position)} aria-disabled={locked}
          onPointerDown={startPlayhead} onPointerMove={move} onPointerUp={(event) => finish(event)} onPointerCancel={(event) => finish(event, true)} onLostPointerCapture={(event) => finish(event, true)}
          onKeyDown={(event) => {
            if (locked) return
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? duration : event.key === 'ArrowLeft' ? position - (event.shiftKey ? 0.1 : 1) : event.key === 'ArrowRight' ? position + (event.shiftKey ? 0.1 : 1) : null
            if (next !== null) { event.preventDefault(); event.stopPropagation(); onSeek(Math.max(0, Math.min(duration, next))) }
          }} />
        <div className="loop-playhead" style={{ left: percentage(position) }} aria-hidden="true"><span className="loop-playhead-grip" onPointerDown={startPlayhead} onPointerMove={move} onPointerUp={(event) => finish(event)} onPointerCancel={(event) => finish(event, true)} onLostPointerCapture={(event) => finish(event, true)}><i /></span></div>
      </div>
      {dragLabel && <output className="loop-drag-time" aria-live="off">{dragLabel}</output>}
      {layout.overflow.length > 0 && <div className="loop-overflow"><button type="button" className={buttonClass} aria-expanded={overflowOpen} onClick={() => setOverflowOpen((open) => !open)}>{t('loops.overlapCount', { count: layout.overflow.length })}</button>{overflowOpen && <div className="loop-overflow-options">{layout.overflow.map((region) => <button key={region.id} type="button" className={buttonClass} disabled={playbackLocked || !valid(region)} onClick={() => { select(region); setOverflowOpen(false) }}>{regionName(region)}</button>)}</div>}</div>}
    </section>}
    {loopsVisible && editor?.kind === 'boundary' && editorForm}
    {renderControls(loopToggle)}
    {loopsVisible && <section className="loop-library" aria-labelledby={headingId}>
      <div className="loop-library-heading"><h3 id={headingId}>{t('loops.title')}</h3><div><button type="button" className={buttonClass} disabled={locked} onClick={openAdd}>{t('loops.add')}</button><button type="button" className={buttonClass} disabled={playbackLocked || playable.length === 0} aria-pressed={state.mode === 'sequence'} onClick={() => {
        if (state.mode === 'sequence') { onStateChange({ ...state, mode: 'off' }); return }
        const first = playable[0]
        if (first) { onStateChange({ mode: 'sequence', selectedId: first.id }); onPlayFrom(first.start) }
      }}>{t(state.mode === 'sequence' ? 'loops.stopSequence' : 'loops.playAll')}</button></div></div>
      {draft.length === 0 && <p className="meta">{t('loops.empty')}</p>}
      {orderedLoopRegions(draft).map((region) => <div key={region.id} className={`loop-library-row${state.selectedId === region.id ? ' is-selected' : ''}`}>
        <span className="loop-color" aria-hidden="true" style={{ backgroundColor: loopPalette[region.color] }} />
        <button type="button" className="loop-library-select" disabled={playbackLocked || !valid(region)} aria-pressed={state.selectedId === region.id} onClick={() => select(region)}><span>{regionName(region)}</span><small>{formatLoopTimestamp(region.start)} – {formatLoopTimestamp(region.end)} · {formatLoopTimestamp(region.end - region.start)}</small></button>
        <button type="button" className={buttonClass} disabled={playbackLocked || !valid(region)} aria-label={t('loops.playNamed', { name: regionName(region) })} onClick={() => { onStateChange({ mode: state.mode === 'repeat' ? 'repeat' : 'off', selectedId: region.id }); onPlayFrom(region.start) }}><svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="m7 4 14 8-14 8Z" /></svg></button>
        <button type="button" className={buttonClass} disabled={locked} aria-label={t('loops.editNamed', { name: regionName(region) })} onClick={() => openBoundary(region)}><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M8 5H5v14h3M16 5h3v14h-3M9 12h6" /></svg></button>
        <button type="button" className={buttonClass} disabled={locked} aria-label={t('loops.renameNamed', { name: regionName(region) })} onClick={() => setEditor({ kind: 'rename', id: region.id, name: region.name, start: formatLoopTimestamp(region.start), end: formatLoopTimestamp(region.end), error: false })}><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="m15 5 4 4M4 20l4.25-.75L20 7.5 16.5 4 4.75 15.75Z" /></svg></button>
        <button type="button" className={buttonClass} disabled={locked} aria-label={t('loops.deleteNamed', { name: regionName(region) })} onClick={() => { void remove(region) }}><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="m6 6 12 12M18 6 6 18" /></svg></button>
      </div>)}
      {draft.some((region) => !valid(region)) && <p className="meta">{t('loops.outsideDuration')}</p>}
      {editor?.kind !== 'boundary' && editorForm}
      {saveError && <div role="alert" className="msg-error">{t('Could not save material changes.')}<button type="button" className={buttonClass} disabled={busy} onClick={() => { void retrySave() }}>{t('Retry')}</button></div>}
    </section>}
  </>
}
