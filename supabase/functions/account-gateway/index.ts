import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const accountPepper = Deno.env.get('ACCOUNT_ANSWER_PEPPER') ?? ''
const internalAuthDomain = Deno.env.get('INTERNAL_AUTH_DOMAIN') ?? 'accounts.guitar-practice-hub.invalid'
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
const attempts = new Map<string, number[]>()
const attemptWindowMs = 15 * 60 * 1000
const maxAttempts = 5
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function normalizeLoginName(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function normalizeAnswer(value: unknown) {
  return typeof value === 'string' ? value.trim().toLocaleLowerCase() : ''
}

function authEmail(loginName: string) {
  return `${loginName}@${internalAuthDomain}`
}

async function hashAnswer(loginName: string, answer: string) {
  const input = new TextEncoder().encode(`${accountPepper}:${loginName}:${normalizeAnswer(answer)}`)
  const digest = await crypto.subtle.digest('SHA-256', input)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function isStrongEnoughPassword(value: unknown): value is string {
  return typeof value === 'string'
    && value.length >= 8
    && /[A-Z]/.test(value)
    && /[a-z]/.test(value)
    && /\d/.test(value)
}

function isLanguage(value: unknown): value is 'en' | 'ru' | 'it' | 'fr' {
  return value === 'en' || value === 'ru' || value === 'it' || value === 'fr'
}

const defaultProgramCopy = {
  en: { name: 'Default Practice Program', focuses: ['Warmup and foundation', 'Technique and rhythm', 'Repertoire building', 'Harmony and improvisation', 'Review and integration'], tasks: 'Warmup, Technique, Rhythm, and Improv./Solo practice blocks.' },
  ru: { name: 'Основная программа практики', focuses: ['Разминка и основа', 'Техника и ритм', 'Развитие репертуара', 'Гармония и импровизация', 'Повторение и интеграция'], tasks: 'Блоки разминки, техники, ритма и импровизации/сольной практики.' },
  it: { name: 'Programma di pratica predefinito', focuses: ['Riscaldamento e fondamenta', 'Tecnica e ritmo', 'Costruzione del repertorio', 'Armonia e improvvisazione', 'Ripasso e integrazione'], tasks: 'Blocchi di riscaldamento, tecnica, ritmo e improvvisazione/pratica solistica.' },
  fr: { name: 'Programme de pratique par défaut', focuses: ['Échauffement et bases', 'Technique et rythme', 'Développement du répertoire', 'Harmonie et improvisation', 'Révision et intégration'], tasks: "Blocs d'échauffement, de technique, de rythme et d'improvisation/pratique solo." },
} as const

function isRateLimited(request: Request, loginName: string, action: string) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const key = `${action}:${loginName}:${forwardedFor}`
  const now = Date.now()
  const recentAttempts = (attempts.get(key) ?? []).filter((timestamp) => now - timestamp < attemptWindowMs)
  recentAttempts.push(now)
  attempts.set(key, recentAttempts)
  return recentAttempts.length > maxAttempts
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)
  if (!supabaseUrl || !serviceRoleKey || !accountPepper) return json({ error: 'Account gateway is not configured.' }, 503)

  let payload: Record<string, unknown>
  try {
    payload = await request.json()
  } catch {
    return json({ error: 'Invalid JSON.' }, 400)
  }

  const action = payload.action
  if (action !== 'create-account' && action !== 'reset-password' && action !== 'get-recovery-question') {
    return json({ error: 'Unknown account action.' }, 400)
  }

  const loginName = normalizeLoginName(payload.loginName)
  const password = payload.password

  if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(loginName)) {
    return json({ error: 'Login name must be 3-32 characters using lowercase letters, numbers, dot, underscore, or hyphen.' }, 400)
  }

  if (action === 'create-account' || action === 'reset-password' || action === 'get-recovery-question') {
    if (isRateLimited(request, loginName, action)) return json({ error: 'Too many attempts. Try again later.' }, 429)
  }

  if (action === 'get-recovery-question') {
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('security_question')
      .eq('login_name', loginName)
      .maybeSingle()
    return json({ securityQuestion: profile?.security_question ?? null })
  }

  if (action === 'create-account') {
    if (!isStrongEnoughPassword(password)) return json({ error: 'Password must be at least 8 characters and include uppercase, lowercase, and a number.' }, 400)
    const securityQuestion = typeof payload.securityQuestion === 'string' ? payload.securityQuestion.trim() : ''
    const securityAnswer = normalizeAnswer(payload.securityAnswer)
    const language = isLanguage(payload.language) ? payload.language : 'en'
    if (!securityQuestion || securityAnswer.length < 2) return json({ error: 'Security question and answer are required.' }, 400)

    const { data: existingProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('user_id')
      .eq('login_name', loginName)
      .maybeSingle()
    if (existingProfile) return json({ error: 'Login name is already in use.' }, 409)

    const { data: createdUser, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: authEmail(loginName),
      password,
      email_confirm: true,
    })
    if (userError || !createdUser.user) return json({ error: userError?.message ?? 'Could not create account.' }, 400)

    const { error: profileError } = await supabaseAdmin.from('user_profiles').insert({
      user_id: createdUser.user.id,
      login_name: loginName,
      security_question: securityQuestion,
      security_answer_hash: await hashAnswer(loginName, securityAnswer),
    })

    if (profileError) {
      console.error('user_profiles insert failed', profileError)
      await supabaseAdmin.auth.admin.deleteUser(createdUser.user.id)
      return json({ error: 'Could not create account profile.' }, 500)
    }

    const copy = defaultProgramCopy[language]
    const { error: settingsError } = await supabaseAdmin.from('app_settings').insert({ user_id: createdUser.user.id, language })
    if (settingsError) {
      console.error('app_settings insert failed', settingsError)
      await supabaseAdmin.from('user_profiles').delete().eq('user_id', createdUser.user.id)
      await supabaseAdmin.auth.admin.deleteUser(createdUser.user.id)
      return json({ error: 'Could not create account preferences.' }, 500)
    }

    const { data: defaultProgram, error: programCreateError } = await supabaseAdmin
      .from('programs')
      .insert({
        user_id: createdUser.user.id,
        name: copy.name,
        language,
        is_default: true,
        status: 'active',
      })
      .select('id')
      .single()
    if (programCreateError || !defaultProgram) {
      console.error('default program create failed', programCreateError)
      await supabaseAdmin.from('user_profiles').delete().eq('user_id', createdUser.user.id)
      await supabaseAdmin.auth.admin.deleteUser(createdUser.user.id)
      return json({ error: 'Could not create the default practice program.' }, 500)
    }

    const programStart = new Date()
    const day = programStart.getUTCDay()
    programStart.setUTCDate(programStart.getUTCDate() + (day === 0 ? 1 : day === 1 ? 0 : 8 - day))
    const programWeeks = Array.from({ length: 5 }, (_, index) => {
      const startDate = new Date(programStart)
      startDate.setUTCDate(programStart.getUTCDate() + index * 7)
      const endDate = new Date(startDate)
      endDate.setUTCDate(startDate.getUTCDate() + 6)
      return {
        user_id: createdUser.user.id,
        program_id: defaultProgram.id,
        program_sequence: index + 1,
        week_number: index + 1,
        start_date: startDate.toISOString().slice(0, 10),
        end_date: endDate.toISOString().slice(0, 10),
        focus: copy.focuses[index],
        tasks: copy.tasks,
      }
    })

    const { error: programError } = await supabaseAdmin.from('plan_weeks').insert(programWeeks)
    if (programError) {
      console.error('default program insert failed', programError)
      await supabaseAdmin.from('programs').delete().eq('id', defaultProgram.id)
      await supabaseAdmin.from('user_profiles').delete().eq('user_id', createdUser.user.id)
      await supabaseAdmin.auth.admin.deleteUser(createdUser.user.id)
      return json({ error: 'Could not create the default practice program.' }, 500)
    }

    return json({ ok: true })
  }

  if (action === 'reset-password') {
    if (!isStrongEnoughPassword(password)) return json({ error: 'New password must be at least 8 characters and include uppercase, lowercase, and a number.' }, 400)
    const securityAnswer = normalizeAnswer(payload.securityAnswer)
    if (securityAnswer.length < 2) return json({ error: 'Security answer is required.' }, 400)

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('user_id, security_answer_hash')
      .eq('login_name', loginName)
      .maybeSingle()
    if (profileError || !profile) return json({ error: 'Login name or security answer is incorrect.' }, 400)

    const answerHash = await hashAnswer(loginName, securityAnswer)
    if (answerHash !== profile.security_answer_hash) return json({ error: 'Login name or security answer is incorrect.' }, 400)

    const { error: resetError } = await supabaseAdmin.auth.admin.updateUserById(profile.user_id, { password })
    if (resetError) return json({ error: 'Could not reset password.' }, 500)

    return json({ ok: true })
  }

})
