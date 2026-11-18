import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { transpileModule } from 'typescript'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as model from '../src/lib/loopRegions'

function fixture(value = '00:10.00', max = 20) {
  const onChange = vi.fn()
  const cleanups: (() => void)[] = []
  const compiled = transpileModule(readFileSync('src/components/TimecodeInput.tsx', 'utf8'), { compilerOptions: { jsx: 4, module: 1, target: 9 } }).outputText
  const module = { exports: {} as { default?: (props: unknown) => { props: Record<string, any> } } }
  const imports: Record<string, unknown> = {
    react: { useRef: (current: unknown) => ({ current }), useEffect: (effect: () => () => void) => cleanups.push(effect()) },
    'react/jsx-runtime': { jsx: (_type: unknown, props: unknown) => ({ props }) },
    '../lib/loopRegions': model,
  }
  runInNewContext(compiled, { exports: module.exports, require: (name: string) => imports[name], setTimeout, clearTimeout })
  const input = module.exports.default!({ value, max, onChange })
  const target = { setPointerCapture: vi.fn(), hasPointerCapture: () => true, releasePointerCapture: vi.fn() }
  const send = (handler: string, extra: Record<string, unknown> = {}) => {
    const event = { pointerId: 1, clientY: 100, button: 0, isPrimary: true, currentTarget: target, preventDefault: vi.fn(), stopPropagation: vi.fn(), ...extra }
    input.props[handler](event)
    return event
  }
  return { input, onChange, send, target, cleanup: () => cleanups.forEach((cleanup) => cleanup()) }
}
afterEach(() => vi.useRealTimers())
describe('timecode input gestures', () => {
  it('offers a text keyboard and preserves normal manual input, including commas', () => {
    const f = fixture()
    expect(f.input.props.inputMode).toBe('text')
    f.send('onChange', { target: { value: '01:24,50' } })
    expect(f.onChange).toHaveBeenCalledWith('01:24,50')
  })
  it('requires a hold, scrubs up/down with bounds and releases pointer capture', () => {
    vi.useFakeTimers()
    const f = fixture()
    f.send('onPointerDown'); vi.advanceTimersByTime(350)
    expect(f.target.setPointerCapture).toHaveBeenCalledWith(1)
    f.send('onPointerMove', { clientY: 88 })
    expect(f.onChange).toHaveBeenLastCalledWith('00:10.20')
    f.send('onPointerMove', { clientY: 112 })
    expect(f.onChange).toHaveBeenLastCalledWith('00:09.80')
    f.send('onPointerMove', { clientY: -10000 })
    expect(f.onChange).toHaveBeenLastCalledWith('00:20.00')
    f.send('onPointerMove', { clientY: 10000 })
    expect(f.onChange).toHaveBeenLastCalledWith('00:00.00')
    f.send('onPointerUp')
    expect(f.target.releasePointerCapture).toHaveBeenCalledWith(1)
  })
  it('leaves a tap alone and cancels early motion or unmount before holding', () => {
    vi.useFakeTimers()
    const f = fixture()
    f.send('onPointerDown'); f.send('onPointerUp'); vi.advanceTimersByTime(400)
    expect(f.onChange).not.toHaveBeenCalled()
    f.send('onPointerDown'); f.send('onPointerMove', { clientY: 80 }); vi.advanceTimersByTime(400)
    expect(f.target.setPointerCapture).not.toHaveBeenCalled()
    f.send('onPointerDown'); f.cleanup(); vi.advanceTimersByTime(400)
    expect(f.target.setPointerCapture).not.toHaveBeenCalled()
  })
  it('restores original time after pointer cancellation and supports keyboard fine steps', () => {
    vi.useFakeTimers()
    const f = fixture()
    f.send('onPointerDown'); vi.advanceTimersByTime(350)
    f.send('onPointerMove', { clientY: 88 }); f.send('onPointerCancel')
    expect(f.onChange).toHaveBeenLastCalledWith('00:10.00')
    const key = f.send('onKeyDown', { key: 'ArrowUp', shiftKey: true })
    expect(f.onChange).toHaveBeenLastCalledWith('00:10.01')
    expect(key.stopPropagation).toHaveBeenCalledOnce()
  })
})
