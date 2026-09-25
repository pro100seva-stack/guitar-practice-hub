import { supabase } from './supabase'
import { defaultLanguage, getDefaultProgramCopy, isLanguage } from './language'

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function addDays(date: Date, amount: number) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + amount)
  return next
}

export async function ensureDefaultProgramContinuation() {
  const today = toIsoDate(new Date())
  const { data: program, error: programError } = await supabase
    .from('programs')
    .select('id, name, status, language')
    .eq('is_default', true)
    .eq('status', 'active')
    .maybeSingle()

  if (programError || !program) return
  const language = isLanguage(program.language) ? program.language : defaultLanguage
  const copy = getDefaultProgramCopy(language)

  const { data: lastProgramWeek, error: weekError } = await supabase
    .from('plan_weeks')
    .select('end_date, program_sequence, week_number')
    .eq('program_id', program.id)
    .not('end_date', 'is', null)
    .order('program_sequence', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (weekError || !lastProgramWeek?.end_date || lastProgramWeek.end_date >= today) return

  const { data: lastCalendarWeek } = await supabase
    .from('plan_weeks')
    .select('week_number')
    .not('week_number', 'is', null)
    .order('week_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextSequence = (lastProgramWeek.program_sequence ?? 0) + 1
  const nextWeekNumber = (lastCalendarWeek?.week_number ?? lastProgramWeek.week_number ?? 0) + 1
  const startDate = addDays(new Date(`${lastProgramWeek.end_date}T00:00:00Z`), 1)
  const endDate = addDays(startDate, 6)

  const { error: insertError } = await supabase.from('plan_weeks').insert({
    program_id: program.id,
    program_sequence: nextSequence,
    week_number: nextWeekNumber,
    start_date: toIsoDate(startDate),
    end_date: toIsoDate(endDate),
    focus: copy.focuses[(nextSequence - 1) % copy.focuses.length],
    tasks: copy.tasks,
  })

  if (insertError && insertError.code !== '23505') {
    console.error('default program continuation failed', insertError)
  }
}