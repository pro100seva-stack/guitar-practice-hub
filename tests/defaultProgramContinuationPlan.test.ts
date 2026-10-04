import { describe, expect, it } from 'vitest'
import { planDefaultProgramContinuation } from '../src/lib/defaultProgramContinuationPlan'

describe('planDefaultProgramContinuation', () => {
  it('does not continue when the final week ends today or later', () => {
    const lastWeek = {
      end_date: '2026-10-03',
      program_sequence: 5,
      week_number: 20,
    }

    expect(planDefaultProgramContinuation(lastWeek, { week_number: 20 }, '2026-10-03')).toBeNull()
    expect(planDefaultProgramContinuation(lastWeek, { week_number: 20 }, '2026-10-02')).toBeNull()
  })

  it('plans Monday through Sunday for the current UTC week, even after stale months', () => {
    const plan = planDefaultProgramContinuation(
      {
        end_date: '2025-01-07',
        program_sequence: 3,
        week_number: 12,
      },
      { week_number: 40 },
      '2026-10-03',
    )

    expect(plan).toEqual({
      program_sequence: 4,
      week_number: 41,
      start_date: '2026-09-28',
      end_date: '2026-10-04',
    })
  })

  it('uses Monday as the start date when today is Monday', () => {
    expect(
      planDefaultProgramContinuation(
        { end_date: '2026-09-27', program_sequence: 1, week_number: 6 },
        { week_number: 6 },
        '2026-09-28',
      ),
    ).toMatchObject({
      start_date: '2026-09-28',
      end_date: '2026-10-04',
    })
  })

  it('uses the preceding Monday and today as the range when today is Sunday', () => {
    expect(
      planDefaultProgramContinuation(
        { end_date: '2026-09-27', program_sequence: 1, week_number: 6 },
        { week_number: 6 },
        '2026-10-04',
      ),
    ).toMatchObject({
      start_date: '2026-09-28',
      end_date: '2026-10-04',
    })
  })

  it('plans the UTC week across a year boundary', () => {
    expect(
      planDefaultProgramContinuation(
        { end_date: '2025-12-28', program_sequence: 1, week_number: 6 },
        { week_number: 6 },
        '2026-01-01',
      ),
    ).toMatchObject({
      start_date: '2025-12-29',
      end_date: '2026-01-04',
    })
  })

  it('does not continue again after the current week has been inserted', () => {
    const plan = planDefaultProgramContinuation(
      { end_date: '2026-10-02', program_sequence: 3, week_number: 12 },
      { week_number: 40 },
      '2026-10-07',
    )

    expect(plan).toMatchObject({
      start_date: '2026-10-05',
      end_date: '2026-10-11',
    })
    expect(
      planDefaultProgramContinuation(
        {
          end_date: plan?.end_date ?? null,
          program_sequence: plan?.program_sequence ?? null,
          week_number: plan?.week_number ?? null,
        },
        { week_number: plan?.week_number ?? null },
        '2026-10-07',
      ),
    ).toBeNull()
  })
})