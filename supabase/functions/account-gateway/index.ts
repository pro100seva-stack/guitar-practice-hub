import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { defaultProgramBlockKeys, defaultProgramCopy } from './default-program.ts'
import { equalDigest, hashAnswer, InvalidRequest, limiterLoginHash, normalizeAnswer, parseBudget, readPayload } from './security.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const accountPepper = Deno.env.get('ACCOUNT_ANSWER_PEPPER') ?? ''
const limiterKey = Deno.env.get('ACCOUNT_LIMITER_HMAC_KEY') ?? ''
const internalAuthDomain = Deno.env.get('INTERNAL_AUTH_DOMAIN') ?? 'accounts.guitar-practice-hub.invalid'
const supabaseAdmin = supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Expose-Headers': 'Retry-After',
}

function json(body: Record<string, unknown>, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  })
}

function normalizeLoginName(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function authEmail(loginName: string) {
  return `${loginName}@${internalAuthDomain}`
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

function invalidRequest(error = 'Invalid account request.') {
  return json({ error, code: 'INVALID_REQUEST' }, 400)
}

function unavailable() {
  return json({ error: 'Account service is temporarily unavailable.', code: 'TEMPORARILY_UNAVAILABLE' }, 503)
}

function recoveryFailed() {
  return json({ error: 'Login name or security answer is incorrect.', code: 'RECOVERY_FAILED' }, 400)
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return invalidRequest('Method not allowed.')

  let payload: Record<string, unknown>
  try {
    payload = await readPayload(request)
  } catch {
    return invalidRequest()
  }

  const action = payload.action
  if (action !== 'create-account' && action !== 'reset-password' && action !== 'get-recovery-question') {
    return invalidRequest()
  }

  const loginName = normalizeLoginName(payload.loginName)
  const password = payload.password

  if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(loginName)) {
    return invalidRequest('Login name must be 3-32 characters using lowercase letters, numbers, dot, underscore, or hyphen.')
  }

  if (!supabaseAdmin || !accountPepper || !limiterKey.trim()) return unavailable()

  try {
    const loginHash = await limiterLoginHash(limiterKey, loginName)
    const { data, error } = await supabaseAdmin.rpc('consume_account_gateway_budget_v1', {
      p_login_hash: loginHash,
      p_action: action,
    })
    if (error) return unavailable()
    const budget = parseBudget(data)
    if (!budget.allowed) {
      return json({ error: 'Too many attempts. Try again later.', code: 'RATE_LIMITED', retryAfterSeconds: budget.retryAfterSeconds },
        429, { 'Retry-After': String(budget.retryAfterSeconds) })
    }
  } catch {
    return unavailable()
  }

  try {
  if (action === 'get-recovery-question') {
    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .select('security_question')
      .eq('login_name', loginName)
      .maybeSingle()
    if (error) return unavailable()
    return json({ securityQuestion: profile?.security_question ?? null })
  }

  if (action === 'create-account') {
    if (!isStrongEnoughPassword(password)) return invalidRequest('Password must be at least 8 characters and include uppercase, lowercase, and a number.')
    const securityQuestion = typeof payload.securityQuestion === 'string' ? payload.securityQuestion.trim() : ''
    const securityAnswer = normalizeAnswer(payload.securityAnswer)
    const language = isLanguage(payload.language) ? payload.language : 'en'
    if (!securityQuestion || securityAnswer.length < 2) return invalidRequest('Security question and answer are required.')

    const { data: existingProfile, error: lookupError } = await supabaseAdmin
      .from('user_profiles')
      .select('user_id')
      .eq('login_name', loginName)
      .maybeSingle()
    if (lookupError) return unavailable()
    if (existingProfile) return invalidRequest('Login name is already in use.')

    const { data: createdUser, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: authEmail(loginName),
      password,
      email_confirm: true,
    })
    if (userError || !createdUser.user) return unavailable()

    const { error: profileError } = await supabaseAdmin.from('user_profiles').insert({
      user_id: createdUser.user.id,
      login_name: loginName,
      security_question: securityQuestion,
      security_answer_hash: await hashAnswer(accountPepper, loginName, securityAnswer),
    })

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(createdUser.user.id)
      return unavailable()
    }

    const copy = defaultProgramCopy[language]
    const { error: settingsError } = await supabaseAdmin.from('app_settings').insert({
      user_id: createdUser.user.id,
      language,
      onboarding_tour_pending: true,
      show_target_practice_time: false,
    })
    if (settingsError) {
      await supabaseAdmin.from('user_profiles').delete().eq('user_id', createdUser.user.id)
      await supabaseAdmin.auth.admin.deleteUser(createdUser.user.id)
      return unavailable()
    }

    const { data: defaultProgram, error: programCreateError } = await supabaseAdmin
      .from('programs')
      .insert({
        user_id: createdUser.user.id,
        name: copy.name,
        language,
        is_default: true,
        status: 'active',
        block_set_mode: 'same_every_week',
      })
      .select('id')
      .single()
    if (programCreateError || !defaultProgram) {
      await supabaseAdmin.from('user_profiles').delete().eq('user_id', createdUser.user.id)
      await supabaseAdmin.auth.admin.deleteUser(createdUser.user.id)
      return unavailable()
    }

    const { error: programBlocksError } = await supabaseAdmin.from('program_blocks').insert(
      defaultProgramBlockKeys.map((blockKey, index) => ({
        program_id: defaultProgram.id,
        block_key: blockKey,
        sort_order: index + 1,
      })),
    )
    if (programBlocksError) {
      await supabaseAdmin.from('programs').delete().eq('id', defaultProgram.id)
      await supabaseAdmin.from('user_profiles').delete().eq('user_id', createdUser.user.id)
      await supabaseAdmin.auth.admin.deleteUser(createdUser.user.id)
      return unavailable()
    }

    const programStart = new Date()
    programStart.setUTCHours(0, 0, 0, 0)
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
      await supabaseAdmin.from('programs').delete().eq('id', defaultProgram.id)
      await supabaseAdmin.from('user_profiles').delete().eq('user_id', createdUser.user.id)
      await supabaseAdmin.auth.admin.deleteUser(createdUser.user.id)
      return unavailable()
    }

    return json({ ok: true })
  }

  if (action === 'reset-password') {
    if (!isStrongEnoughPassword(password)) return invalidRequest('New password must be at least 8 characters and include uppercase, lowercase, and a number.')
    const securityAnswer = normalizeAnswer(payload.securityAnswer)

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('user_id, security_answer_hash')
      .eq('login_name', loginName)
      .maybeSingle()
    if (profileError) return unavailable()

    const answerHash = await hashAnswer(accountPepper, loginName, securityAnswer)
    const matches = equalDigest(answerHash, profile?.security_answer_hash)
    if (!profile || !matches || !securityAnswer) return recoveryFailed()

    const { error: resetError } = await supabaseAdmin.auth.admin.updateUserById(profile.user_id, { password })
    if (resetError) return unavailable()

    return json({ ok: true })
  }
  return invalidRequest()
  } catch (error) {
    return error instanceof InvalidRequest ? invalidRequest() : unavailable()
  }
})
