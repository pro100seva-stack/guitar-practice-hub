import { describe, expect, it } from 'vitest'
import { adjacentPracticeWeeks } from '../src/lib/practiceWeekNavigation'

const weeks = [
  { id: 'p1-w1', start_date: '2025-12-22' },
  { id: 'p1-w2', start_date: '2025-12-29' },
  { id: 'p2-w1', start_date: '2026-01-05' },
]

describe('practice previous/next week navigation', () => {
  it('moves chronologically across programs and year boundaries', () => {
    expect(adjacentPracticeWeeks(weeks, 'p1-w2')).toEqual({ previous: weeks[0], next: weeks[2] })
  })

  it('stops at the first and last available weeks without wrapping', () => {
    expect(adjacentPracticeWeeks(weeks, 'p1-w1')).toEqual({ previous: null, next: weeks[1] })
    expect(adjacentPracticeWeeks(weeks, 'p2-w1')).toEqual({ previous: weeks[1], next: null })
    expect(adjacentPracticeWeeks([weeks[0]], 'p1-w1')).toEqual({ previous: null, next: null })
  })

  it('offers no target when no week is selected or the selection is not an available week', () => {
    expect(adjacentPracticeWeeks(weeks, null)).toEqual({ previous: null, next: null })
    expect(adjacentPracticeWeeks(weeks, undefined)).toEqual({ previous: null, next: null })
    expect(adjacentPracticeWeeks(weeks, 'unscheduled')).toEqual({ previous: null, next: null })
    expect(adjacentPracticeWeeks([], 'p1-w1')).toEqual({ previous: null, next: null })
  })
})
