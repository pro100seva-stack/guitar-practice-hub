import { supabase } from './supabase'
import { defaultLanguage, getDefaultProgramCopy, isLanguage } from './language'

export async function ensureDefaultProgramContinuation() {
  const { data: program, error: programError } = await supabase
    .from('programs')
    .select('language')
    .eq('is_default', true)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (programError) {
    console.error('default program continuation failed', programError)
    return
  }
  if (!program) return
  const language = isLanguage(program.language) ? program.language : defaultLanguage
  const copy = getDefaultProgramCopy(language)

  const { error: rpcError } = await supabase.rpc('continue_default_program', {
    p_language: program.language,
    p_focuses: copy.focuses,
    p_tasks: copy.tasks,
  })

  if (rpcError && rpcError.message !== 'Continuation language does not match the Default program language') {
    console.error('default program continuation failed', rpcError)
  }
}