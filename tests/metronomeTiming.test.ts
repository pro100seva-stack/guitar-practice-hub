import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { metronomeBeatSeconds } from '../src/lib/metronomeTiming'

const source = readFileSync('src/pages/Sessions.tsx', 'utf8')

describe('quarter-note BPM and meter note value', () => {
  it('makes an 8/8 bar last as long as 4/4, with twice as many clicks', () => {
    for (const bpm of [40, 60, 100, 120, 220]) {
      const quarter = metronomeBeatSeconds(bpm, 4)
      const eighth = metronomeBeatSeconds(bpm, 8)
      expect(quarter).toBeCloseTo(60 / bpm)
      expect(eighth).toBeCloseTo(quarter / 2)
      expect(8 * eighth).toBeCloseTo(4 * quarter)
    }
  })

  it('preserves quarter meters and gives other note values their actual duration', () => {
    expect(3 * metronomeBeatSeconds(120, 4)).toBeCloseTo(1.5)
    expect(5 * metronomeBeatSeconds(120, 4)).toBeCloseTo(2.5)
    expect(3 * metronomeBeatSeconds(120, 8)).toBeCloseTo(0.75)
    expect(2 * metronomeBeatSeconds(120, 2)).toBeCloseTo(2)
  })

  it('uses a safe quarter-note default for invalid note values instead of stalling the scheduler', () => {
    for (const invalid of [0, -4, NaN, Infinity]) {
      expect(metronomeBeatSeconds(120, invalid)).toBeCloseTo(0.5)
      expect(metronomeBeatSeconds(invalid, 8)).toBeCloseTo(0.3)
    }
  })
})

describe('running metronome meter changes', () => {
  it('reads the current denominator and BPM on each scheduler pass without creating another timer', () => {
    const start = source.indexOf('const activeContext = audioContextRef.current', source.indexOf('const startScheduler = async'))
    const code = source.slice(start, source.indexOf('}, 25)', start))
    const audioContextRef = { current: { currentTime: 0 } }
    const nextNoteTimeRef = { current: 0 }
    const metronomeBeatUnitRef = { current: 4 }
    const bpmRef = { current: 120 }
    const scheduleMetronomeClick = vi.fn()
    const run = new Function('audioContextRef', 'nextNoteTimeRef', 'lookaheadRef', 'scheduleMetronomeClick', 'bpmRef', 'metronomeBeatUnitRef', 'metronomeBeatSeconds', 'clampBpm', code)
    const tick = () => run(audioContextRef, nextNoteTimeRef, { current: 0.01 }, scheduleMetronomeClick, bpmRef, metronomeBeatUnitRef, metronomeBeatSeconds, (value: number) => value)
    tick()
    expect(nextNoteTimeRef.current).toBeCloseTo(0.5)
    metronomeBeatUnitRef.current = 8
    audioContextRef.current.currentTime = 0.5
    tick()
    expect(nextNoteTimeRef.current).toBeCloseTo(0.75)
    bpmRef.current = 60
    audioContextRef.current.currentTime = 0.75
    tick()
    expect(nextNoteTimeRef.current).toBeCloseTo(1.25)
    expect(scheduleMetronomeClick.mock.calls.map(([time]) => time)).toEqual([0, 0.5, 0.75])
  })

  it('updates the running denominator on custom input and resets it for quarter-note presets', () => {
    const start = source.indexOf('function handleTimeSignatureChange(')
    const handlers = source.slice(start, source.indexOf('function toggleTimer(', start))
      .replace(/nextMode: '3\/4' \| '4\/4' \| '5\/4' \| 'custom'/, 'nextMode')
      .replaceAll('value: string', 'value')
    const metronomeBeatUnitRef = { current: 4 }
    const make = new Function('metronomeBeatUnitRef', 'customBeatCount', 'customMeasureCount', 'setTimeSignatureMode', 'setBeatsPerMeasure', 'setCustomBeatCount', 'setCustomMeasureCount', `${handlers}; return { handleTimeSignatureChange, handleCustomMeasureChange };`)
    const handlersUnderTest = make(metronomeBeatUnitRef, '8', '8', vi.fn(), vi.fn(), vi.fn(), vi.fn())
    handlersUnderTest.handleTimeSignatureChange('custom')
    expect(metronomeBeatUnitRef.current).toBe(8)
    handlersUnderTest.handleCustomMeasureChange('2')
    expect(metronomeBeatUnitRef.current).toBe(2)
    handlersUnderTest.handleCustomMeasureChange('')
    expect(metronomeBeatUnitRef.current).toBe(2)
    handlersUnderTest.handleCustomMeasureChange('not a number')
    expect(metronomeBeatUnitRef.current).toBe(2)
    handlersUnderTest.handleTimeSignatureChange('3/4')
    expect(metronomeBeatUnitRef.current).toBe(4)
  })
})
