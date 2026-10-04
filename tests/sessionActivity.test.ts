import { describe, expect, it } from 'vitest'
import { getCurrentStreak, getPracticedDates, hasPracticeMinutes, hasSessionActivity } from '../src/lib/sessionActivity'

describe('session activity eligibility', () => {
  it('excludes notes-only and empty records from activity', () => {
    expect(hasSessionActivity({ total_minutes: 0, session_blocks: [] })).toBe(false)
    expect(hasSessionActivity({ total_minutes: null, session_blocks: [] })).toBe(false)
  })

  it('retains rounded-zero block sessions without marking them as practiced days', () => {
    const shortSession = { total_minutes: 0, session_blocks: [{ block_key: 'warmup' }] }
    expect(hasSessionActivity(shortSession)).toBe(true)
    expect(hasPracticeMinutes(shortSession)).toBe(false)
  })

  it('recognizes positive historical totals even without saved blocks', () => {
    const historicalSession = { total_minutes: 10, session_blocks: [] }
    expect(hasSessionActivity(historicalSession)).toBe(true)
    expect(hasPracticeMinutes(historicalSession)).toBe(true)
  })

  it('excludes zero-minute days from the shared marker/streak date set', () => {
    const dates = getPracticedDates([
      { session_date: '2026-10-01', total_minutes: 10 },
      { session_date: '2026-10-02', total_minutes: 0 },
      { session_date: '2026-10-03', total_minutes: null },
      { session_date: '2026-10-04', total_minutes: 5 },
    ])
    expect([...dates]).toEqual(['2026-10-01', '2026-10-04'])
    expect(dates.has('2026-10-02')).toBe(false)
    expect(getPracticedDates([]).size).toBe(0)
  })
})

describe('local current streak', () => {
  const sessions = [
    { session_date: '2026-09-30', total_minutes: 10 },
    { session_date: '2026-10-01', total_minutes: 5 },
  ]

  it.each([0, 23])('counts local today and steps across the month boundary at %s:30', (hour) => {
    const today = new Date(2026, 9, 1, hour, 30)
    expect(getCurrentStreak(sessions, today)).toBe(2)
    expect(getCurrentStreak(sessions, new Date(2026, 9, 2, hour, 30))).toBe(0)
    expect(getCurrentStreak([], today)).toBe(0)
    expect(today.getHours()).toBe(hour)
  })

  it('excludes notes-only and rounded-zero blocks but includes positive totals without blocks', () => {
    const today = new Date(2026, 9, 1, 0, 30)
    const notesOnly = { session_date: '2026-10-01', total_minutes: 0, session_blocks: [] }
    const shortSession = { ...notesOnly, session_blocks: [{ block_key: 'warmup' }] }
    expect(getCurrentStreak([notesOnly], today)).toBe(0)
    expect(hasSessionActivity(shortSession)).toBe(true)
    expect(getCurrentStreak([shortSession], today)).toBe(0)
    expect(getCurrentStreak([{ ...notesOnly, total_minutes: 10 }], today)).toBe(1)
    expect(getCurrentStreak([...sessions, { session_date: '2026-10-02', total_minutes: 0 }], new Date(2026, 9, 2))).toBe(0)
  })
})