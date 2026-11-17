import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { transpileModule } from 'typescript'
import { describe, expect, it, vi } from 'vitest'
import * as speed from '../src/lib/playbackSpeedWheel'

type Node = { type: unknown; props: Record<string, unknown> }
type Props = { rate: number; rates?: number[]; disabled?: boolean; onRate: (rate: number) => void }

function wheel(initial: Partial<Props> = {}) {
  const slots: unknown[] = []
  let cursor = 0
  let props: Props = { rate: 1, onRate: vi.fn(), ...initial }
  const jsx = (type: unknown, value: Record<string, unknown>): Node => ({ type, props: value })
  const imports: Record<string, unknown> = {
    react: {
      useId: () => 'speed-label',
      useRef: (value: unknown) => { const index = cursor++; slots[index] ??= { current: value }; return slots[index] },
      useState: (value: unknown) => {
        const index = cursor++
        if (!(index in slots)) slots[index] = value
        return [slots[index], (next: unknown) => { slots[index] = typeof next === 'function' ? (next as (old: unknown) => unknown)(slots[index]) : next }]
      },
      useEffect: (effect: () => void) => { effect() },
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    '../lib/i18n': { useI18n: () => ({ t: (key: string) => key }) },
    '../lib/playbackSpeedWheel': speed,
  }
  const module = { exports: {} as { default?: (props: Props) => Node } }
  const compiled = transpileModule(readFileSync('src/components/PlaybackSpeedThumbwheel.tsx', 'utf8'), { compilerOptions: { jsx: 4, module: 1, target: 9 } }).outputText
  runInNewContext(compiled, { exports: module.exports, require: (name: string) => imports[name], Math })
  const render = (next: Partial<Props> = {}) => { cursor = 0; props = { ...props, ...next }; return module.exports.default!(props) }
  function children(node: Node): Node[] { return (Array.isArray(node.props.children) ? node.props.children : [node.props.children]).filter((child): child is Node => Boolean(child && typeof child === 'object')) }
  function slider(tree = render()) { return children(tree).find((child) => child.props.role === 'slider')! }
  const target = { focus: vi.fn(), setPointerCapture: vi.fn(), hasPointerCapture: () => true, releasePointerCapture: vi.fn() }
  const pointer = (clientX: number, pointerId = 1) => ({ clientX, pointerId, button: 0, isPrimary: true, currentTarget: target, preventDefault: vi.fn() })
  const dispatch = (node: Node, key: string, event: unknown) => (node.props[key] as (event: unknown) => void)(event)
  return { render, slider, children, dispatch, pointer, target, onRate: props.onRate }
}

describe('playback speed wheel detents', () => {
  it('exposes all 36 exact native steps with 1x default and clamped drag endpoints', () => {
    const steps = speed.playbackSpeedSteps()
    expect(steps).toHaveLength(36)
    expect(steps[0]).toBe(0.25)
    expect(steps.at(-1)).toBe(2)
    expect(steps).toContain(1)
    for (let index = 0; index < steps.length; index++) {
      expect(steps[index]).toBe((25 + index * 5) / 100)
      expect(speed.draggedPlaybackSpeed(steps, 15, (index - 15) * 12)).toBe(steps[index])
    }
    expect(speed.draggedPlaybackSpeed(steps, 15, -1e6)).toBe(0.25)
    expect(speed.draggedPlaybackSpeed(steps, 15, 1e6)).toBe(2)
  })
  it('keeps sparse YouTube detents honest and no more sensitive than native steps', () => {
    const steps = speed.playbackSpeedSteps([2, NaN, 0.1, 1, 1, 0.25, 0.5, 1.25, 3])
    expect(steps).toEqual([0.25, 0.5, 1, 1.25, 2])
    expect(speed.draggedPlaybackSpeed(steps, 2, 12)).toBe(1)
    expect(speed.draggedPlaybackSpeed(steps, 2, 60)).toBe(1.25)
    expect(speed.draggedPlaybackSpeed(steps, 2, -60)).toBe(1)
    expect(speed.draggedPlaybackSpeed(steps, 2, -120)).toBe(0.5)
    expect(speed.playbackSpeedSteps([])).toEqual([1])
  })
})

describe('executed thumbwheel pointer and keyboard handlers', () => {
  it('resets to supported normal speed on double click and waits for actual-rate acknowledgement', () => {
    const fixture = wheel({ rate: 1.5 })
    fixture.dispatch(fixture.slider(), 'onDoubleClick', { preventDefault: vi.fn(), stopPropagation: vi.fn() })
    expect(fixture.onRate).toHaveBeenLastCalledWith(1)
    expect(fixture.slider().props['aria-valuenow']).toBe(1.5)
    expect(fixture.slider(fixture.render({ rate: 1 })).props['aria-valuetext']).toBe('1.00×')
    const disabled = wheel({ rate: 1.5, disabled: true })
    disabled.dispatch(disabled.slider(), 'onDoubleClick', { preventDefault: vi.fn(), stopPropagation: vi.fn() })
    expect(disabled.onRate).not.toHaveBeenCalled()
    const unsupported = wheel({ rate: 1.5, rates: [0.5, 1.5] })
    unsupported.dispatch(unsupported.slider(), 'onDoubleClick', { preventDefault: vi.fn(), stopPropagation: vi.fn() })
    expect(unsupported.onRate).not.toHaveBeenCalled()
  })
  it('starts with acknowledged 1.00x, fixed references, a centered label and a normal-speed detent', () => {
    const fixture = wheel()
    const slider = fixture.slider()
    expect(slider.props).toMatchObject({ role: 'slider', 'aria-valuenow': 1, 'aria-valuetext': '1.00×', 'aria-valuemin': 0.25, 'aria-valuemax': 2, 'aria-orientation': 'horizontal' })
    expect(slider.props.className).toContain('is-normal')
    const tree = fixture.render()
    const children = fixture.children(tree)
    expect(children[0].props.children).toBe('Playback speed')
    expect(children.some((child) => child.props.className === 'playback-speed-wheel-value')).toBe(false)
    expect(fixture.children(children.find((child) => child.props.className === 'playback-speed-wheel-references')!).map((child) => child.props.children)).toEqual(['0.25×', ['1.00', '×'], '2.0×'])
  })
  it('captures a one-finger drag, moves grooves immediately but shows only acknowledged speed', () => {
    const fixture = wheel()
    fixture.dispatch(fixture.slider(), 'onPointerDown', fixture.pointer(100))
    expect(fixture.target.setPointerCapture).toHaveBeenCalledWith(1)
    expect(fixture.target.focus).toHaveBeenCalledWith({ preventScroll: true })
    fixture.dispatch(fixture.slider(), 'onPointerMove', fixture.pointer(112))
    expect(fixture.onRate).toHaveBeenLastCalledWith(1.05)
    let slider = fixture.slider()
    expect(slider.props['aria-valuenow']).toBe(1)
    const svg = fixture.children(slider)[0]
    const pattern = fixture.children(fixture.children(svg)[0])[0]
    expect(pattern.props.x).toBe(2)
    expect(pattern.props.width).toBe('10')
    slider = fixture.slider(fixture.render({ rate: 1.05 }))
    expect(slider.props['aria-valuetext']).toBe('1.05×')
    fixture.dispatch(slider, 'onPointerMove', fixture.pointer(124))
    expect(fixture.onRate).toHaveBeenLastCalledWith(1.1)
    fixture.dispatch(fixture.slider(), 'onPointerMove', fixture.pointer(88))
    expect(fixture.onRate).toHaveBeenLastCalledWith(0.95)
  })
  it('retains sparse-rate drag accumulation across acknowledgments and refuses secondary pointers', () => {
    const fixture = wheel({ rates: [0.25, 0.5, 1, 1.25, 1.5, 2] })
    fixture.dispatch(fixture.slider(), 'onPointerDown', { ...fixture.pointer(0), isPrimary: false })
    expect(fixture.target.setPointerCapture).not.toHaveBeenCalled()
    fixture.dispatch(fixture.slider(), 'onPointerDown', fixture.pointer(0))
    fixture.dispatch(fixture.slider(), 'onPointerMove', fixture.pointer(12))
    expect(fixture.onRate).not.toHaveBeenCalled()
    fixture.dispatch(fixture.slider(), 'onPointerMove', fixture.pointer(60, 2))
    expect(fixture.onRate).not.toHaveBeenCalled()
    fixture.dispatch(fixture.slider(), 'onPointerMove', fixture.pointer(60))
    expect(fixture.onRate).toHaveBeenLastCalledWith(1.25)
    fixture.render({ rate: 1.25 })
    fixture.dispatch(fixture.slider(), 'onPointerMove', fixture.pointer(120))
    expect(fixture.onRate).toHaveBeenLastCalledWith(1.5)
  })
  it('cancels capture cleanly and disables manipulation while media is unusable', () => {
    const fixture = wheel()
    fixture.dispatch(fixture.slider(), 'onPointerDown', fixture.pointer(0))
    fixture.dispatch(fixture.slider(), 'onPointerCancel', fixture.pointer(0))
    expect(fixture.target.releasePointerCapture).toHaveBeenCalledWith(1)
    fixture.dispatch(fixture.slider(), 'onPointerMove', fixture.pointer(120))
    expect(fixture.onRate).not.toHaveBeenCalled()
    const disabled = fixture.slider(fixture.render({ disabled: true }))
    expect(disabled.props).toMatchObject({ tabIndex: -1, 'aria-disabled': true })
    fixture.dispatch(disabled, 'onPointerDown', fixture.pointer(0))
    fixture.dispatch(disabled, 'onPointerMove', fixture.pointer(120))
    expect(fixture.onRate).not.toHaveBeenCalled()
  })
  it('supports arrows and Home/End without bubbling seeks; leaves Tab untouched', () => {
    const fixture = wheel()
    function key(key: string) { return { key, altKey: false, ctrlKey: false, metaKey: false, nativeEvent: { isComposing: false }, preventDefault: vi.fn(), stopPropagation: vi.fn() } }
    const right = key('ArrowRight')
    fixture.dispatch(fixture.slider(), 'onKeyDown', right)
    expect(fixture.onRate).toHaveBeenLastCalledWith(1.05)
    expect(right.preventDefault).toHaveBeenCalledOnce()
    expect(right.stopPropagation).toHaveBeenCalledOnce()
    fixture.dispatch(fixture.slider(), 'onKeyDown', key('Home'))
    expect(fixture.onRate).toHaveBeenLastCalledWith(0.25)
    fixture.dispatch(fixture.slider(), 'onKeyDown', key('End'))
    expect(fixture.onRate).toHaveBeenLastCalledWith(2)
    const tab = key('Tab')
    fixture.dispatch(fixture.slider(), 'onKeyDown', tab)
    expect(tab.preventDefault).not.toHaveBeenCalled()
    expect(tab.stopPropagation).not.toHaveBeenCalled()
    const youtube = wheel({ rates: [0.5, 1, 1.5] })
    youtube.dispatch(youtube.slider(), 'onKeyDown', key('ArrowRight'))
    expect(youtube.onRate).toHaveBeenLastCalledWith(1.5)
  })
})
