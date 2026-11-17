import { describe, expect, it } from 'vitest'
import { editLoopBoundary, formatLoopTimestamp, layoutLoopRegions, loopPalette, loopPlaybackDecision, normalizeLoopRegions, orderedLoopRegions, parseLoopTimestamp, type LoopRegion } from '../src/lib/loopRegions'

const region = (id: string, start = 10, end = 20, order = 0): LoopRegion => ({ id, name: id, start, end, color: order % 8, order })

describe('persistent loop regions', () => {
  it('preserves independent overlapping loops and only controlled metadata', () => {
    const result = normalizeLoopRegions([{ ...region('lick', 10.004, 20.006), ownerUid: 'forged', videoId: 'foreign' }, region('solo', 10, 35, 1)])
    expect(result).toEqual([{ ...region('lick'), start: 10, end: 20.01 }, region('solo', 10, 35, 1)])
    expect(result[0]).not.toHaveProperty('ownerUid')
    expect(result[0]).not.toHaveProperty('videoId')
  })
  it('rejects invalid, duplicate and zero-length records without inventing regions', () => {
    expect(normalizeLoopRegions([null, 1, {}, region('valid'), region('valid'), region('unsafe"selector'), region(' space '), region('negative', -0.001, 1), region('zero', 1, 1), region('reverse', 4, 3), region('infinity', 0, Infinity), region('precision-zero', 1, 1.001)])).toEqual([region('valid')])
    expect(normalizeLoopRegions(undefined)).toEqual([])
  })
  it('bounds names, normalizes color/order and imposes no two-region storage limit', () => {
    const values = Array.from({ length: 100 }, (_, index) => ({ ...region(`r${index}`, index, index + 1), name: `  ${'🎸'.repeat(70)}  `, color: -1, order: NaN }))
    const normalized = normalizeLoopRegions(values)
    expect(normalized).toHaveLength(100)
    expect([...normalized[0].name]).toHaveLength(60)
    normalized.forEach((entry, index) => { expect(entry.color).toBe(index % loopPalette.length); expect(entry.order).toBe(index) })
  })
})

describe('centisecond editing', () => {
  it.each([['84.50', 84.5], ['01:24.50', 84.5], ['1:2.5', 62.5], ['01:02:03.45', 3723.45], ['90:00', 5400], ['00:00.01', 0.01], ['0', 0]])('parses %s without a beat/bar grid', (text, value) => {
    expect(parseLoopTimestamp(text)).toBe(value)
  })
  it.each(['', '-1', '1:60', '1:60:00', '1.234', 'abc', '1::2', 'Infinity', '1:2:3:4', '999999999999999999999'])('rejects invalid timestamp %s', (value) => {
    expect(parseLoopTimestamp(value)).toBeNull()
  })
  it('formats precise values with carry and optional hours', () => {
    expect(formatLoopTimestamp(84.5)).toBe('01:24.50')
    expect(formatLoopTimestamp(59.999)).toBe('01:00.00')
    expect(formatLoopTimestamp(3723.45)).toBe('01:02:03.45')
    expect(parseLoopTimestamp(formatLoopTimestamp(3723.45))).toBe(3723.45)
    for (const invalid of [-1, NaN, Infinity, 1e40]) expect(formatLoopTimestamp(invalid)).toBe('00:00.00')
  })
  it('clamps drag edits inside duration without crossing or zero length', () => {
    expect(editLoopBoundary(region('r'), 'start', 30, 40)?.start).toBe(19.99)
    expect(editLoopBoundary(region('r'), 'start', -100, 40)?.start).toBe(0)
    expect(editLoopBoundary(region('r'), 'end', 0, 40)?.end).toBe(10.01)
    expect(editLoopBoundary(region('r'), 'end', 100, 40)?.end).toBe(40)
    expect(editLoopBoundary(region('r'), 'start', NaN, 40)).toBeNull()
    expect(editLoopBoundary(region('r'), 'end', 25, 15)).toBeNull()
    expect(editLoopBoundary({ ...region('r'), start: NaN }, 'start', 1, 40)).toBeNull()
    expect(editLoopBoundary(region('r'), 'end', 25, 1e40)).toBeNull()
  })
})

describe('two-lane timeline layout', () => {
  it('places a spanning solo and adjacent phrases on only two lanes', () => {
    const solo = region('solo', 10, 35, 2)
    const lick1 = region('lick1', 10, 20)
    const lick2 = region('lick2', 20, 35, 1)
    expect(layoutLoopRegions([lick2, lick1, solo])).toEqual({ lanes: [[solo], [lick1, lick2]], overflow: [] })
    expect(layoutLoopRegions([solo, lick2, lick1])).toEqual(layoutLoopRegions([lick2, lick1, solo]))
  })
  it('retains every overlapping region in overflow instead of adding a third lane', () => {
    const rows = Array.from({ length: 15 }, (_, index) => region(`r${index}`, 0, 20 - index / 10, index))
    const layout = layoutLoopRegions(rows)
    expect(layout.lanes).toHaveLength(2)
    expect(layout.overflow).toHaveLength(13)
    expect(new Set([...layout.lanes.flat(), ...layout.overflow].map((entry) => entry.id))).toEqual(new Set(rows.map((entry) => entry.id)))
  })
  it('makes a selected overflow region directly editable while retaining displaced regions', () => {
    const rows = [region('a', 0, 20), region('b', 0, 19, 1), region('c', 2, 18, 2)]
    const selected = layoutLoopRegions(rows, 'c')
    expect(selected.lanes[1]).toEqual([rows[2]])
    expect(selected.overflow).toEqual([rows[1]])
    expect(selected.lanes.flat().concat(selected.overflow)).toHaveLength(3)
  })
})

describe('one selected-repeat / separate sequence architecture', () => {
  const regions = [region('first', 5, 10), region('second', 15, 20, 1), region('third', 25, 30, 2)]
  const decide = (options: Partial<Parameters<typeof loopPlaybackDecision>[0]> = {}) => loopPlaybackDecision({ mode: 'repeat', regions, selectedId: 'first', time: 10, state: 1, seeking: false, ...options })
  it('repeats a selected region at its end and corrects a playing seek before A', () => {
    expect(decide()).toEqual({ kind: 'seek', time: 5, regionId: 'first' })
    expect(decide({ time: 2 })).toEqual({ kind: 'seek', time: 5, regionId: 'first' })
    expect(decide({ time: 7 })).toBeNull()
    expect(decide({ selectedId: 'second', time: 20 })).toEqual({ kind: 'seek', time: 15, regionId: 'second' })
  })
  it('does not restart paused/buffering media or issue repeated seeks while one is pending', () => {
    for (const state of [-1, 2, 3, 5]) expect(decide({ state })).toBeNull()
    expect(decide({ seeking: true })).toBeNull()
    expect(decide({ mode: 'off' })).toBeNull()
    expect(decide({ selectedId: null })).toBeNull()
  })
  it('plays in timestamp order, skips gaps, then stops instead of repeating the last region', () => {
    expect(decide({ mode: 'sequence' })).toEqual({ kind: 'seek', time: 15, regionId: 'second' })
    expect(decide({ mode: 'sequence', selectedId: 'second', time: 20 })).toEqual({ kind: 'seek', time: 25, regionId: 'third' })
    expect(decide({ mode: 'sequence', selectedId: 'third', time: 30 })).toEqual({ kind: 'stop' })
    expect(decide({ mode: 'sequence', selectedId: 'third', time: 30, state: 0 })).toEqual({ kind: 'stop' })
  })
  it('keeps overlapping loops independent and applies stable ties', () => {
    const rows = [region('later', 10, 20, 2), region('first-tie', 10, 15), region('intro', 0, 5, 3)]
    expect(orderedLoopRegions(rows).map((row) => row.id)).toEqual(['intro', 'first-tie', 'later'])
    expect(decide({ mode: 'sequence', regions: rows, selectedId: 'first-tie', time: 15 })).toEqual({ kind: 'seek', time: 10, regionId: 'later' })
  })
})
