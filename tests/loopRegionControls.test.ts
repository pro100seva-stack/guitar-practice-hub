import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { transpileModule } from 'typescript'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as model from '../src/lib/loopRegions'

type Node = { type: unknown; props: Record<string, any> }
type Props = { usable: boolean; playing: boolean; duration: number; position: number; regions: model.LoopRegion[]; state: model.LoopPlaybackState; onStateChange: ReturnType<typeof vi.fn>; onRegionsChange: ReturnType<typeof vi.fn>; onSeek: ReturnType<typeof vi.fn>; onPlayFrom: ReturnType<typeof vi.fn>; renderControls: (node: Node) => Node; expanded?: boolean; onExpandedChange?: (open: boolean) => Promise<void> }
const region = (id = 'first', start = 10, end = 20): model.LoopRegion => ({ id, name: id, start, end, color: 0, order: start })
function fixture(initial: Partial<Props> = {}, expanded = true) {
  const slots: any[] = [], effects: (() => void)[] = [], cleanups: (() => void)[] = []
  let cursor = 0
  let props: Props = { usable: true, playing: false, duration: 100, position: 12, regions: [region()], state: { mode: 'repeat', selectedId: null }, onStateChange: vi.fn(), onRegionsChange: vi.fn().mockResolvedValue(undefined), onSeek: vi.fn(), onPlayFrom: vi.fn(), renderControls: (node) => node, ...initial }
  const jsx = (type: unknown, value: Record<string, any>): Node => type === 'timecode-input'
    ? { type: 'input', props: { ...value, ref: value.inputRef, onChange: (event: { target: { value: string } }) => value.onChange(event.target.value) } }
    : { type, props: value }
  const same = (a: unknown[], b: unknown[]) => a?.length === b?.length && a.every((value, index) => Object.is(value, b[index]))
  const imports: Record<string, unknown> = {
    react: {
      useId: () => 'loop-label',
      useRef: (value: unknown) => { const i = cursor++; slots[i] ??= { current: value }; return slots[i] },
      useState: (value: unknown) => { const i = cursor++; if (!(i in slots)) slots[i] = typeof value === 'function' ? (value as () => unknown)() : value; return [slots[i], (next: unknown) => { slots[i] = typeof next === 'function' ? (next as (old: unknown) => unknown)(slots[i]) : next }] },
      useMemo: (factory: () => unknown, deps: unknown[]) => { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { deps, value: factory() }; return slots[i].value },
      useEffect: (effect: () => void | (() => void), deps: unknown[]) => { const i = cursor++; if (!slots[i] || !same(slots[i], deps)) { slots[i] = deps; effects.push(() => { const cleanup = effect(); if (cleanup) cleanups.push(cleanup) }) } },
    },
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
    '../lib/i18n': { useI18n: () => ({ t: (key: string, values?: Record<string, unknown>) => key + (values?.name ? ':' + values.name : '') }) },
    '../lib/loopRegions': model,
    './TimecodeInput': { __esModule: true, default: 'timecode-input' },
  }
  const module = { exports: {} as { default?: (props: Props) => Node } }
  const compiled = transpileModule(readFileSync('src/components/PracticeLoopControls.tsx', 'utf8'), { compilerOptions: { jsx: 4, module: 1, target: 9 } }).outputText
  runInNewContext(compiled, { exports: module.exports, require: (name: string) => imports[name], setTimeout, clearTimeout, crypto: { randomUUID: () => 'new-loop' } })
  const target = { getBoundingClientRect: () => ({ left: 0, width: 100 }), querySelectorAll: () => model.orderedLoopRegions(props.regions).map((entry, index) => ({ dataset: { loopListRow: entry.id }, getBoundingClientRect: () => ({ top: index * 60, height: 60 }) })), setPointerCapture: vi.fn(), hasPointerCapture: () => true, releasePointerCapture: vi.fn(), focus: vi.fn() }
  function flatten(value: any): Node[] { if (Array.isArray(value)) return value.flatMap(flatten); if (!value || typeof value !== 'object' || !('props' in value)) return []; return [value, ...flatten(value.props.children)] }
  let tree: Node
  function render(next: Partial<Props> = {}) { cursor = 0; props = { ...props, ...next }; tree = module.exports.default!(props); for (const node of flatten(tree)) if (node.props.ref) node.props.ref.current = target; effects.splice(0).forEach((effect) => effect()); return tree }
  render(); render()
  const nodes = () => flatten(render())
  const find = (match: (node: Node) => boolean) => { const node = nodes().find(match); if (!node) throw new Error('Missing node'); return node }
  const label = (name: string) => find((node) => node.props['aria-label'] === name)
  const text = (name: string) => find((node) => node.props.children === name)
  const dispatch = (node: Node, event: string, value: any = {}) => node.props[event]({ preventDefault: vi.fn(), stopPropagation: vi.fn(), ...value })
  const click = (node: Node) => { if (!node.props.disabled) dispatch(node, 'onClick') }
  const input = (index: number, value: string) => dispatch(nodes().filter((node) => node.type === 'input')[index], 'onChange', { target: { value } })
  const submit = async () => { dispatch(find((node) => node.type === 'form'), 'onSubmit'); await flush() }
  const pointer = (x: number, y = x) => ({ currentTarget: target, clientX: x, clientY: y, pointerId: 1, button: 0, isPrimary: true })
  if (expanded) { click(text('loops.multiLooper')); render() }
  return { render, nodes, find, label, text, click, input, submit, dispatch, pointer, props: () => props, unmount: () => cleanups.forEach((cleanup) => cleanup()) }
}
async function flush() { for (let index = 0; index < 12; index++) await Promise.resolve() }
afterEach(() => vi.useRealTimers())

describe('executed loop region controls', () => {
  it('restores a saved open or closed preference without enabling a playback mode', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    const f = fixture({ expanded: true, onExpandedChange: save, state: { mode: 'off', selectedId: null } }, false)
    expect(f.text('loops.multiLooper').props['aria-expanded']).toBe(true)
    expect(f.nodes().filter((node) => node.props['data-loop-lane'] !== undefined)).toHaveLength(2)
    f.click(f.text('loops.multiLooper')); await flush()
    expect(save).toHaveBeenLastCalledWith(false)
    expect(f.props().onStateChange).not.toHaveBeenCalled()
    const reopened = fixture({ expanded: false, state: { mode: 'off', selectedId: null } }, false)
    expect(reopened.text('loops.multiLooper').props['aria-expanded']).toBe(false)
    expect(reopened.nodes().filter((node) => node.props['data-loop-lane'] !== undefined)).toHaveLength(1)
  })
  it('hydrates the stored flag once it arrives without resetting on ordinary playback renders', () => {
    const f = fixture({}, false)
    expect(f.text('loops.multiLooper').props['aria-expanded']).toBe(false)
    f.render({ expanded: true })
    expect(f.text('loops.multiLooper').props['aria-expanded']).toBe(true)
    f.render({ position: 35 })
    expect(f.text('loops.multiLooper').props['aria-expanded']).toBe(true)
    expect(f.props().onStateChange).not.toHaveBeenCalled()
  })
  it('serializes preference writes and retains a failed desired value for retry', async () => {
    let reject!: (error: Error) => void
    const first = new Promise<void>((_resolve, fail) => { reject = fail })
    const save = vi.fn().mockReturnValueOnce(first).mockResolvedValue(undefined)
    const f = fixture({ expanded: true, onExpandedChange: save }, false)
    f.click(f.text('loops.multiLooper'))
    expect(f.text('loops.multiLooper').props.disabled).toBe(true)
    f.click(f.text('loops.multiLooper'))
    expect(save).toHaveBeenCalledTimes(1)
    f.render({ position: 22, expanded: true })
    expect(f.text('loops.multiLooper').props['aria-expanded']).toBe(false)
    reject(new Error('Storage unavailable')); await flush()
    expect(f.nodes().some((node) => node.props.children?.[0] === 'loops.preferenceSaveFailed')).toBe(true)
    f.click(f.text('Retry')); await flush()
    expect(save).toHaveBeenLastCalledWith(false)
    expect(save).toHaveBeenCalledTimes(2)
    expect(f.text('loops.multiLooper').props['aria-expanded']).toBe(false)
    expect(f.text('loops.multiLooper').props.disabled).toBe(false)
    expect(f.nodes().some((node) => node.props.children?.[0] === 'loops.preferenceSaveFailed')).toBe(false)
  })
  it('saves a dragged sequence order only on release and restores cancellation', async () => {
    const f = fixture({ regions: [region('one', 10, 20), region('two', 30, 40), region('three', 60, 70)] })
    const handle = f.label('loops.reorderNamed:one')
    f.dispatch(handle, 'onPointerDown', f.pointer(0, 30)); f.dispatch(handle, 'onPointerMove', f.pointer(0, 160))
    expect(f.props().onRegionsChange).not.toHaveBeenCalled()
    expect(f.nodes().find((node) => node.props['data-loop-list-row'] === 'one')?.props.style.order).toBe(2)
    f.dispatch(handle, 'onPointerCancel', f.pointer(0, 160))
    expect(f.nodes().find((node) => node.props['data-loop-list-row'] === 'one')?.props.style.order).toBe(10)
    f.dispatch(handle, 'onPointerDown', f.pointer(0, 30)); f.dispatch(handle, 'onPointerMove', f.pointer(0, 160)); f.dispatch(handle, 'onPointerUp', f.pointer(0, 160)); await flush()
    const saved = f.props().onRegionsChange.mock.calls[0][0] as model.LoopRegion[]
    expect(model.orderedLoopRegions(saved).map((entry) => entry.id)).toEqual(['two', 'three', 'one'])
  })
  it('supports keyboard reordering and makes ALL begin with the new sequence order', async () => {
    const f = fixture({ regions: [region('one', 10, 20), region('two', 30, 40)] })
    f.dispatch(f.label('loops.reorderNamed:two'), 'onKeyDown', { key: 'Home' }); await flush()
    const saved = f.props().onRegionsChange.mock.calls[0][0] as model.LoopRegion[]
    expect(model.orderedLoopRegions(saved).map((entry) => entry.id)).toEqual(['two', 'one'])
    f.click(f.label('loops.playAll'))
    expect(f.props().onStateChange).toHaveBeenLastCalledWith({ mode: 'sequence', selectedId: 'two' })
    expect(f.props().onPlayFrom).toHaveBeenCalledWith(30)
  })
  it('shows counts only during ALL, persists edits and retains repeats through rename', async () => {
    const f = fixture({ regions: [{ ...region(), repeats: 2 }] })
    expect(f.nodes().some((node) => node.props['aria-label'] === 'loops.repeatNamed:first')).toBe(false)
    f.render({ state: { mode: 'sequence', selectedId: 'first' } })
    f.dispatch(f.label('loops.repeatNamed:first'), 'onChange', { target: { value: '4' } })
    f.dispatch(f.label('loops.repeatNamed:first'), 'onBlur'); await flush()
    expect(f.props().onRegionsChange).toHaveBeenLastCalledWith([expect.objectContaining({ repeats: 4 })])
    f.click(f.label('loops.renameNamed:first'))
    const input = f.nodes().find((node) => node.type === 'input' && node.props.maxLength === 60)!
    f.dispatch(input, 'onChange', { target: { value: 'Four runs' } }); await f.submit()
    expect(f.props().onRegionsChange).toHaveBeenLastCalledWith([expect.objectContaining({ name: 'Four runs', repeats: 4 })])
  })
  it('rejects invalid repeat counts without changing saved metadata', async () => {
    const f = fixture({ state: { mode: 'sequence', selectedId: 'first' } })
    for (const value of ['0', '-1', '1.5', '1000', '']) {
      f.dispatch(f.label('loops.repeatNamed:first'), 'onChange', { target: { value } })
      f.dispatch(f.label('loops.repeatNamed:first'), 'onBlur'); await flush()
      expect(f.label('loops.repeatNamed:first').props.value).toBe('1')
    }
    expect(f.props().onRegionsChange).not.toHaveBeenCalled()
  })
  it('enlarges only the selected overlapping circle while ordinary selected circles stay uniform', () => {
    const f = fixture({ regions: [region('one', 0, 20), region('two', 20, 40)], state: { mode: 'repeat', selectedId: 'one' } })
    expect(f.label('loops.endHandle:one').props.className).toContain('is-priority')
    expect(f.label('loops.startHandle:one').props.className).not.toContain('is-priority')
    expect(f.label('loops.startHandle:two').props.className).not.toContain('is-priority')
    f.render({ state: { mode: 'repeat', selectedId: 'two' } })
    expect(f.label('loops.startHandle:two').props.className).toContain('is-priority')
    expect(f.label('loops.endHandle:one').props.className).not.toContain('is-priority')
  })
  it('keeps selected region handles above other regions and the playhead without lane stacking traps', () => {
    const css = readFileSync('src/index.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    const declarations = (selector: string) => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter((rule) => rule[1].trim() === selector).map((rule) => rule[2]).join(';')
    const layer = (selector: string) => Number(declarations(selector).match(/z-index:\s*(\d+)/)?.[1])
    expect(layer('.loop-seek-track')).toBeLessThan(layer('.loop-region'))
    expect(layer('.loop-region')).toBeLessThan(layer('.loop-region.is-selected'))
    expect(layer('.loop-playhead')).toBeLessThan(layer('.loop-region.is-selected'))
    expect(declarations('.loop-region-lane')).not.toMatch(/z-index:\s*\d/)
    expect(declarations('.loop-timeline')).toContain('isolation: isolate')
  })
  it('drags only the selected connection at a shared join, preserving the neighboring region', async () => {
    for (const selectedId of ['one', 'two']) {
      const f = fixture({ regions: [region('one', 0, 20), region('two', 20, 40)], state: { mode: 'repeat', selectedId } })
      const handle = f.label(selectedId === 'one' ? 'loops.endHandle:one' : 'loops.startHandle:two')
      expect(handle.props.className).toContain('is-priority')
      f.dispatch(handle, 'onPointerDown', f.pointer(20))
      f.dispatch(handle, 'onPointerMove', f.pointer(30))
      f.dispatch(handle, 'onPointerUp', f.pointer(30)); await flush()
      const saved = f.props().onRegionsChange.mock.calls[0][0] as model.LoopRegion[]
      expect(saved.find((entry) => entry.id === selectedId)).toMatchObject(selectedId === 'one' ? { end: 30 } : { start: 30 })
      expect(saved.find((entry) => entry.id !== selectedId)).toEqual(selectedId === 'one' ? region('two', 20, 40) : region('one', 0, 20))
    }
  })
  it('snaps the nearest whole-region edge within 3px, holds through 6px and then releases', async () => {
    const f = fixture({ regions: [region(), region('target', 40, 90)] })
    const body = f.find((node) => node.props.className === 'loop-region-name')
    f.dispatch(body, 'onPointerDown', f.pointer(0))
    f.dispatch(body, 'onPointerMove', f.pointer(18))
    expect(f.label('loops.startHandle:first').props.title).toBe('00:30.00')
    expect(f.label('loops.endHandle:first').props.title).toBe('00:40.00')
    f.dispatch(body, 'onPointerMove', f.pointer(25))
    expect(f.label('loops.endHandle:first').props.title).toBe('00:40.00')
    f.dispatch(body, 'onPointerMove', f.pointer(26.5))
    expect(f.label('loops.startHandle:first').props.title).toBe('00:36.50')
    expect(f.label('loops.endHandle:first').props.title).toBe('00:46.50')
    expect(f.props().onRegionsChange).not.toHaveBeenCalled()
    f.dispatch(body, 'onPointerUp', f.pointer(26.5)); await flush()
    expect(f.props().onRegionsChange).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ id: 'first', start: 36.5, end: 46.5 })]))
  })
  it('snaps dragged handles to other circles without crossing boundaries and clears the snap on cancel', () => {
    const f = fixture({ regions: [region(), region('target', 30, 80)] })
    const handle = f.label('loops.endHandle:first')
    f.dispatch(handle, 'onPointerDown', f.pointer(0)); f.dispatch(handle, 'onPointerMove', f.pointer(8))
    expect(f.label('loops.endHandle:first').props.title).toBe('00:30.00')
    f.dispatch(handle, 'onPointerMove', f.pointer(15))
    expect(f.label('loops.endHandle:first').props.title).toBe('00:30.00')
    f.dispatch(handle, 'onPointerMove', f.pointer(17))
    expect(f.label('loops.endHandle:first').props.title).toBe('00:37.00')
    f.dispatch(handle, 'onPointerCancel', f.pointer(17))
    expect(f.label('loops.endHandle:first').props.title).toBe('00:20.00')
    f.dispatch(handle, 'onPointerDown', f.pointer(0)); f.dispatch(handle, 'onPointerMove', f.pointer(-50))
    expect(f.label('loops.endHandle:first').props.title).toBe('00:10.01')
    expect(f.props().onRegionsChange).not.toHaveBeenCalled()
  })
  it('keeps a one-row timeline visible and expands settings without changing playback mode', () => {
    const f = fixture({ state: { mode: 'off', selectedId: 'first' } }, false)
    expect(f.nodes().some((node) => node.props.className === 'loop-library')).toBe(false)
    expect(f.nodes().filter((node) => node.props['data-loop-lane'] !== undefined)).toHaveLength(1)
    expect(f.nodes().some((node) => node.props.className === 'loop-region-name')).toBe(false)
    expect(f.nodes().some((node) => String(node.props.className).startsWith('loop-boundary '))).toBe(false)
    expect(f.label('loops.seek')).toBeDefined()
    f.click(f.text('loops.multiLooper'))
    expect(f.props().onStateChange).not.toHaveBeenCalled()
    expect(f.nodes().some((node) => node.props.className === 'loop-library')).toBe(true)
    expect(f.nodes().filter((node) => node.props['data-loop-lane'] !== undefined)).toHaveLength(2)
    expect(f.nodes().filter((node) => node.props.className === 'loop-region-name')).toHaveLength(1)
    expect(f.label('loops.startHandle:first')).toBeDefined()
    f.click(f.text('loops.multiLooper'))
    expect(f.nodes().some((node) => node.props.className === 'loop-library')).toBe(false)
    expect(f.nodes().some((node) => node.props.className === 'loop-timeline')).toBe(true)
    expect(f.nodes().some((node) => node.props.className === 'loop-region-name')).toBe(false)
    expect(f.nodes().some((node) => String(node.props.className).startsWith('loop-boundary '))).toBe(false)
  })
  it('moves a complete region, preserves duration, clamps both ends and saves only on release', async () => {
    const f = fixture()
    const body = f.find((node) => node.props.className === 'loop-region-name')
    f.dispatch(body, 'onPointerDown', f.pointer(10))
    f.dispatch(body, 'onPointerMove', f.pointer(35))
    expect(f.label('loops.startHandle:first').props.title).toBe('00:35.00')
    expect(f.label('loops.endHandle:first').props.title).toBe('00:45.00')
    expect(f.props().onRegionsChange).not.toHaveBeenCalled()
    f.dispatch(body, 'onPointerMove', f.pointer(1000))
    expect(f.label('loops.startHandle:first').props.title).toBe('01:30.00')
    expect(f.label('loops.endHandle:first').props.title).toBe('01:40.00')
    f.dispatch(body, 'onPointerMove', f.pointer(-1000))
    expect(f.label('loops.startHandle:first').props.title).toBe('00:00.00')
    expect(f.label('loops.endHandle:first').props.title).toBe('00:10.00')
    f.dispatch(body, 'onPointerUp', f.pointer(-1000)); await flush()
    expect(f.props().onRegionsChange).toHaveBeenCalledWith([expect.objectContaining({ start: 0, end: 10 })])
    f.dispatch(body, 'onClick', { detail: 1 })
    expect(f.props().onSeek).not.toHaveBeenCalled()
  })
  it('cancels a whole-region drag without changing saved timestamps and keeps tap selection', () => {
    const f = fixture()
    const body = f.find((node) => node.props.className === 'loop-region-name')
    f.dispatch(body, 'onPointerDown', f.pointer(10)); f.dispatch(body, 'onPointerMove', f.pointer(25))
    f.dispatch(body, 'onPointerCancel', f.pointer(25))
    expect(f.label('loops.startHandle:first').props.title).toBe('00:10.00')
    expect(f.props().onRegionsChange).not.toHaveBeenCalled()
    f.dispatch(body, 'onPointerDown', f.pointer(10)); f.dispatch(body, 'onPointerUp', f.pointer(10)); f.click(body)
    expect(f.props().onStateChange).toHaveBeenLastCalledWith({ mode: 'repeat', selectedId: 'first' })
  })
  it('limits overlapping timeline to two lanes while every loop remains in the library', () => {
    const f = fixture({ regions: [region('a'), region('b', 11, 21), region('c', 12, 22)] })
    expect(f.nodes().filter((node) => node.props['data-loop-lane'] !== undefined)).toHaveLength(2)
    expect(f.nodes().filter((node) => node.props.className === 'loop-library-select')).toHaveLength(3)
    expect(f.text('loops.overlapCount')).toBeDefined()
  })
  it('binary repeat toggles selected regions and exits sequence without playing a paused video', () => {
    const f = fixture({ state: { mode: 'sequence', selectedId: 'first' } })
    f.click(f.label('loops.enableRepeat'))
    expect(f.props().onStateChange).toHaveBeenLastCalledWith({ mode: 'repeat', selectedId: 'first' })
    expect(f.props().onSeek).toHaveBeenLastCalledWith(10)
    expect(f.props().onPlayFrom).not.toHaveBeenCalled()
    f.render({ state: { mode: 'repeat', selectedId: 'first' } })
    f.click(f.label('loops.disableRepeat'))
    expect(f.props().onStateChange).toHaveBeenLastCalledWith({ mode: 'off', selectedId: 'first' })
  })
  it('opens creation for an undefined repeat and saves a five-second loop at the current position', async () => {
    const f = fixture({ regions: [], state: { mode: 'off', selectedId: null } })
    f.click(f.label('loops.enableRepeat'))
    expect(f.props().onStateChange).not.toHaveBeenCalled()
    expect(f.nodes().filter((node) => node.type === 'input').map((node) => node.props.value)).toEqual(['loops.defaultName', '00:12.00', '00:17.00'])
    await f.submit()
    expect(f.props().onRegionsChange).toHaveBeenCalledWith([expect.objectContaining({ id: 'new-loop', start: 12, end: 17 })])
    expect(f.props().onStateChange).toHaveBeenLastCalledWith({ mode: 'repeat', selectedId: 'new-loop' })
  })
  it('closes first-loop setup on cancel without enabling an undefined repeat', () => {
    const f = fixture({ regions: [], state: { mode: 'off', selectedId: null } })
    f.click(f.label('loops.enableRepeat'))
    expect(f.label('loops.enableRepeat').props['aria-pressed']).toBe(false)
    f.click(f.text('Cancel'))
    expect(f.nodes().some((node) => node.props.className === 'loop-timeline')).toBe(true)
    expect(f.props().onStateChange).not.toHaveBeenCalled()
    expect(f.props().onRegionsChange).not.toHaveBeenCalled()
  })
  it('retains failed new loop drafts and disables playback until retry succeeds', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined)
    const f = fixture({ regions: [], onRegionsChange: save })
    f.click(f.text('loops.add')); await f.submit()
    expect(f.label('loops.disableRepeat').props.disabled).toBe(true)
    expect(f.label('loops.playAll').props.disabled).toBe(true)
    expect(f.nodes().find((node) => node.props.className === 'loop-library-select')?.props.disabled).toBe(true)
    expect(f.props().onStateChange).not.toHaveBeenCalled()
    f.click(f.text('Retry')); await flush()
    expect(f.label('loops.disableRepeat').props.disabled).toBe(false)
    expect(f.nodes().some((node) => node.type === 'form')).toBe(false)
    expect(save).toHaveBeenCalledTimes(2)
  })
  it('keeps edits intact across position ticks and equivalent incoming arrays', async () => {
    const f = fixture()
    f.click(f.label('loops.renameNamed:first')); f.input(0, 'My phrase')
    f.render({ position: 34, regions: [region()] })
    expect(f.nodes().find((node) => node.type === 'input')?.props.value).toBe('My phrase')
    await f.submit()
    expect(f.props().onRegionsChange).toHaveBeenCalledWith([expect.objectContaining({ name: 'My phrase' })])
  })
  it('validates typed boundaries rather than silently clamping and provides a repair editor', async () => {
    const f = fixture({ regions: [region('long', 10, 110)] })
    f.click(f.label('loops.editNamed:long')); f.input(1, '00:09.00'); await f.submit()
    expect(f.props().onRegionsChange).not.toHaveBeenCalled()
    expect(f.text('loops.invalidBounds')).toBeDefined()
    f.input(1, '00:40.50'); await f.submit()
    expect(f.props().onRegionsChange).toHaveBeenCalledWith([expect.objectContaining({ end: 40.5 })])
  })
  it('sorts sequence playback and keeps it separate from binary repeat', () => {
    const f = fixture({ regions: [region('later', 40, 50), region('early', 5, 8)], state: { mode: 'repeat', selectedId: 'later' } })
    f.click(f.label('loops.playAll'))
    expect(f.props().onStateChange).toHaveBeenCalledWith({ mode: 'sequence', selectedId: 'early' })
    expect(f.props().onPlayFrom).toHaveBeenCalledWith(5)
  })
  it('previews boundary dragging, persists only release and cancels a moved long press', async () => {
    vi.useFakeTimers()
    const f = fixture(); const handle = f.label('loops.startHandle:first')
    f.dispatch(handle, 'onPointerDown', f.pointer(10)); f.dispatch(handle, 'onPointerMove', f.pointer(16))
    expect(f.props().onRegionsChange).not.toHaveBeenCalled()
    expect(f.label('loops.startHandle:first').props.title).toBe('00:16.00')
    vi.advanceTimersByTime(600)
    expect(f.nodes().some((node) => node.type === 'form')).toBe(false)
    f.dispatch(handle, 'onPointerUp', f.pointer(16)); await Promise.resolve()
    expect(f.props().onRegionsChange).toHaveBeenCalledWith([expect.objectContaining({ start: 16 })])
  })
  it('opens a held precision editor without dragging and supports keyboard seeking', () => {
    vi.useFakeTimers(); const f = fixture(); const handle = f.label('loops.endHandle:first')
    f.dispatch(handle, 'onPointerDown', f.pointer(20)); vi.advanceTimersByTime(500)
    f.dispatch(handle, 'onPointerMove', f.pointer(30)); f.dispatch(handle, 'onPointerUp', f.pointer(30))
    expect(f.label('loops.precise')).toBeDefined(); expect(f.props().onRegionsChange).not.toHaveBeenCalled()
    f.dispatch(f.label('loops.seek'), 'onKeyDown', { key: 'End' })
    expect(f.props().onSeek).toHaveBeenLastCalledWith(100)
  })
  it('clears a deleted selection and cancels captured drag without saving', async () => {
    const f = fixture({ state: { mode: 'repeat', selectedId: 'first' } }); const handle = f.label('loops.startHandle:first')
    f.dispatch(handle, 'onPointerDown', f.pointer(10)); f.dispatch(handle, 'onPointerMove', f.pointer(16)); f.dispatch(handle, 'onPointerCancel', f.pointer(16))
    expect(f.label('loops.startHandle:first').props.title).toBe('00:10.00')
    expect(f.props().onRegionsChange).not.toHaveBeenCalled()
    f.click(f.label('loops.deleteNamed:first')); await flush()
    expect(f.props().onRegionsChange).toHaveBeenCalledWith([])
    expect(f.props().onStateChange).toHaveBeenLastCalledWith({ mode: 'off', selectedId: null })
  })
})
