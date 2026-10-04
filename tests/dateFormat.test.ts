import { describe, expect, it } from 'vitest'
import { toLocalIsoDate } from '../src/lib/dateFormat'

describe('toLocalIsoDate', () => {
  it('uses local calendar fields, not UTC', () => {
    expect(toLocalIsoDate(new Date(2026, 0, 5, 0, 30))).toBe('2026-01-05')
    expect(toLocalIsoDate(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31')
  })

  it('zero-pads month and day', () => {
    expect(toLocalIsoDate(new Date(2026, 2, 4))).toBe('2026-03-04')
  })

  it('defaults to today', () => {
    expect(toLocalIsoDate()).toBe(toLocalIsoDate(new Date()))
  })
})
