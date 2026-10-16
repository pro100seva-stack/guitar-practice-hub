import { readFileSync } from 'node:fs'
import { createHmac } from 'node:crypto'
import ts from 'typescript'
import { describe, expect, it, vi } from 'vitest'
import * as security from '../supabase/functions/account-gateway/security'
import * as defaults from '../supabase/functions/account-gateway/default-program'
import { equalDigest, hashAnswer, limiterLoginHash, maxBodyBytes, parseBudget, readPayload } from '../supabase/functions/account-gateway/security'

const gatewaySource = readFileSync(new URL('../supabase/functions/account-gateway/index.ts', import.meta.url), 'utf8')
const gatewayCode = ts.transpileModule(gatewaySource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

function fixture(options: {
  rpc?: (name: string, args: { p_login_hash: string; p_action: string }) => Promise<unknown>
  profile?: Record<string, unknown> | null
  missingKey?: boolean
  lookupError?: boolean
  resetError?: boolean
} = {}) {
  const rpc = vi.fn(options.rpc ?? (async () => ({ data: [{ allowed: true, retry_after_seconds: 0 }], error: null })))
  const updateUserById = vi.fn(async () => ({ error: options.resetError ? {} : null }))
  const createUser = vi.fn(async () => ({ data: { user: { id: 'synthetic-user' } }, error: null }))
  const insert = vi.fn((_rows: unknown) => query)
  const query = {
    select: vi.fn(() => query), eq: vi.fn(() => query), insert,
    maybeSingle: vi.fn(async () => ({ data: options.profile ?? null, error: options.lookupError ? {} : null })),
    single: vi.fn(async () => ({ data: { id: 'synthetic-program' }, error: null })),
    then: (resolve: (result: unknown) => unknown) => Promise.resolve({ error: null }).then(resolve),
  }
  const from = vi.fn(() => query)
  const admin = { rpc, from, auth: { admin: { updateUserById, createUser } } }
  let handler!: (request: Request) => Promise<Response>
  const env: Record<string, string> = {
    SUPABASE_URL: 'https://synthetic.invalid', SUPABASE_SERVICE_ROLE_KEY: 'synthetic-service',
    ACCOUNT_ANSWER_PEPPER: 'synthetic-pepper', ACCOUNT_LIMITER_HMAC_KEY: 'synthetic-key',
  }
  if (options.missingKey) delete env.ACCOUNT_LIMITER_HMAC_KEY
  new Function('require', 'Deno', 'exports', gatewayCode)((specifier: string) => {
    if (specifier === './security.ts') return security
    if (specifier === './default-program.ts') return defaults
    if (specifier === 'https://esm.sh/@supabase/supabase-js@2') return { createClient: () => admin }
    throw new Error('Unexpected import')
  }, { env: { get: (name: string) => env[name] }, serve: (callback: typeof handler) => { handler = callback } }, {})
  const call = (payload: unknown, headers: Record<string, string> = {}) => handler(new Request('https://unit.invalid', {
    method: 'POST', body: JSON.stringify(payload), headers,
  }))
  return { call, handler, rpc, from, query, updateUserById, createUser, insert }
}

const reset = { action: 'reset-password', loginName: ' PeRsOn ', password: 'NewPass123', securityAnswer: 'answer' }

describe('static SQL security contract, not database execution', () => {
  const migration = readFileSync(new URL('../supabase/migrations/20261016120000_account_gateway_security.sql', import.meta.url), 'utf8')
  const schema = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8')
  const policies = readFileSync(new URL('../supabase/rls-policies.sql', import.meta.url), 'utf8')

  it('keeps the snapshot RPC identical to the additive transactional migration', () => {
    const functionSql = (text: string) => text.slice(text.indexOf('create or replace function public.consume_account_gateway_budget_v1'), text.indexOf('$$;', text.indexOf('create or replace function public.consume_account_gateway_budget_v1')) + 3)
    expect(functionSql(schema)).toBe(functionSql(migration))
    expect(migration.startsWith('begin;')).toBe(true)
    expect(migration.trimEnd().endsWith('commit;')).toBe(true)
  })

  it('locks global before account, uses DB time, bounded cleanup and service-only entry', () => {
    expect(migration.indexOf("where bucket_key = 'global' for update")).toBeLessThan(migration.indexOf('where bucket_key = account_key for update'))
    expect(migration).toContain('decision_time := clock_timestamp()')
    expect(migration).toContain('cardinality(global_times) >= 100')
    expect(migration).toContain('cardinality(account_times) >= 5')
    expect(migration).toContain("interval '15 minutes'")
    expect(migration).toContain("interval '24 hours'")
    expect(migration).toContain('order by expires_at, bucket_key limit 100')
    expect(migration).toContain('set search_path = pg_catalog')
    expect(migration).toContain("auth.role() is distinct from 'service_role'")
    expect(migration).not.toMatch(/disable row level security|truncate|drop table/i)
  })

  it('denies browser credentials and private table access in migration and policies', () => {
    for (const sql of [migration, policies]) {
      expect(sql).toContain('revoke all on table public.user_profiles from public, anon, authenticated')
      expect(sql).toContain('revoke all on table account_gateway_private.budgets from public, anon, authenticated, service_role')
      expect(sql).toContain('grant execute on function public.consume_account_gateway_budget_v1(text, text) to service_role')
      expect(sql).not.toContain('create policy "user_profiles_owner_')
    }
  })
})

describe('actual gateway handler with synthetic admin/RPC dependencies', () => {
  it.each([null, [], {}, { ...reset, action: 'invalid' }, { ...reset, loginName: '$bad' }])('rejects invalid payload %j before RPC/admin', async (payload) => {
    const gateway = fixture()
    const response = await gateway.call(payload)
    expect(response.status).toBe(400)
    expect((await response.json()).code).toBe('INVALID_REQUEST')
    expect(gateway.rpc).not.toHaveBeenCalled()
    expect(gateway.from).not.toHaveBeenCalled()
  })

  it('bounds actual handler bodies and keeps preflight/methods controlled', async () => {
    const gateway = fixture()
    expect((await gateway.call({ ...reset, extra: 'a'.repeat(maxBodyBytes) })).status).toBe(400)
    const preflight = await gateway.handler(new Request('https://unit.invalid', { method: 'OPTIONS' }))
    expect(preflight.status).toBe(200)
    expect(preflight.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS')
    expect((await gateway.handler(new Request('https://unit.invalid'))).status).toBe(400)
    expect(gateway.rpc).not.toHaveBeenCalled()
  })

  it.each(['missing-key', 'rpc-error', 'rpc-throw', 'malformed'] as const)('fails closed before any account access: %s', async (failure) => {
    const gateway = fixture({
      missingKey: failure === 'missing-key',
      rpc: async () => {
        if (failure === 'rpc-throw') throw new Error('synthetic')
        return failure === 'rpc-error' ? { error: { message: 'missing RPC' } } : { data: [] }
      },
    })
    for (const action of ['create-account', 'get-recovery-question', 'reset-password']) {
      const response = await gateway.call({ ...reset, action })
      expect(response.status).toBe(503)
      expect((await response.json()).code).toBe('TEMPORARILY_UNAVAILABLE')
    }
    expect(gateway.from).not.toHaveBeenCalled()
    expect(gateway.createUser).not.toHaveBeenCalled()
    expect(gateway.updateUserById).not.toHaveBeenCalled()
  })

  it('returns CORS-readable cooldown without account access', async () => {
    const gateway = fixture({ rpc: async () => ({ data: [{ allowed: false, retry_after_seconds: 123 }] }) })
    const response = await gateway.call(reset)
    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBe('123')
    expect(response.headers.get('Access-Control-Expose-Headers')).toBe('Retry-After')
    expect(await response.json()).toMatchObject({ code: 'RATE_LIMITED', retryAfterSeconds: 123 })
    expect(gateway.from).not.toHaveBeenCalled()
  })

  it('keeps unknown login, wrong answer and missing answer failures indistinguishable', async () => {
    const digest = await hashAnswer('synthetic-pepper', 'person', 'answer')
    const unknown = fixture()
    const known = fixture({ profile: { user_id: 'synthetic-user', security_answer_hash: digest } })
    const responses = await Promise.all([
      unknown.call(reset), known.call({ ...reset, securityAnswer: 'wrong' }),
      known.call({ ...reset, securityAnswer: undefined }), unknown.call({ ...reset, securityAnswer: undefined }),
    ])
    expect(responses.map((response) => response.status)).toEqual([400, 400, 400, 400])
    const bodies = await Promise.all(responses.map((response) => response.json()))
    for (const body of bodies) expect(body).toEqual({ error: 'Login name or security answer is incorrect.', code: 'RECOVERY_FAILED' })
    expect(known.updateUserById).not.toHaveBeenCalled()
  })

  it('keeps compatible successful reset and never retries a failed password mutation', async () => {
    const profile = { user_id: 'synthetic-user', security_answer_hash: await hashAnswer('synthetic-pepper', 'person', 'answer') }
    const gateway = fixture({ profile })
    expect(await (await gateway.call({ ...reset, securityAnswer: ' ANSWER ' })).json()).toEqual({ ok: true })
    expect(gateway.updateUserById).toHaveBeenCalledExactlyOnceWith('synthetic-user', { password: 'NewPass123' })
    const failed = fixture({ profile, resetError: true })
    expect((await failed.call(reset)).status).toBe(503)
    expect(failed.updateUserById).toHaveBeenCalledTimes(1)
    expect(gateway.rpc.mock.calls[0][0]).toBe('consume_account_gateway_budget_v1')
    expect(gateway.rpc.mock.calls[0][1]).toEqual({ p_login_hash: await limiterLoginHash('synthetic-key', 'person'), p_action: 'reset-password' })
  })

  it('preserves known/unknown question content response and fails closed on lookup errors', async () => {
    expect(await (await fixture().call({ ...reset, action: 'get-recovery-question' })).json()).toEqual({ securityQuestion: null })
    expect(await (await fixture({ profile: { security_question: 'Synthetic question?' } }).call({ ...reset, action: 'get-recovery-question' })).json()).toEqual({ securityQuestion: 'Synthetic question?' })
    expect((await fixture({ lookupError: true }).call(reset)).status).toBe(503)
  })

  it('preserves successful signup defaults and payload', async () => {
    const gateway = fixture()
    const response = await gateway.call({ ...reset, action: 'create-account', securityQuestion: 'Synthetic question?', language: 'fr' })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(gateway.insert.mock.calls.map(([value]) => value)).toContainEqual(expect.objectContaining({ show_target_practice_time: false, language: 'fr' }))
    expect(gateway.insert.mock.calls.map(([value]) => value)).toContainEqual(expect.objectContaining({ block_set_mode: 'same_every_week', language: 'fr' }))
  })
})

describe('modeled serialized durable RPC, not PostgreSQL verification', () => {
  function budgetModel() {
    let now = 0
    let global: number[] = []
    const accounts = new Map<string, number[]>()
    let queue = Promise.resolve()
    const rpc = async (_name: string, args: { p_login_hash: string; p_action: string }) => {
      let result: unknown
      queue = queue.then(() => {
        global = global.filter((time) => time > now - 900)
        const key = `${args.p_login_hash}:${args.p_action}`
        const account = (accounts.get(key) ?? []).filter((time) => time > now - 900)
        const allowed = global.length < 100 && account.length < 5
        const waits = [global.length >= 100 ? global[0] + 900 - now : 0, account.length >= 5 ? account[0] + 900 - now : 0]
        if (allowed) { global.push(now); account.push(now); accounts.set(key, account) }
        result = { data: [{ allowed, retry_after_seconds: allowed ? 0 : Math.max(...waits) }] }
      })
      await queue
      return result
    }
    return { rpc, setTime: (value: number) => { now = value } }
  }

  it('shares five admissions across fresh handlers and changed IP headers; denials do not extend cooldown', async () => {
    const budget = budgetModel()
    const responses = await Promise.all(Array.from({ length: 20 }, (_, index) => fixture({ rpc: budget.rpc }).call(reset, { 'x-forwarded-for': `192.0.2.${index}` })))
    expect(responses.filter((response) => response.status === 400)).toHaveLength(5)
    expect(responses.filter((response) => response.status === 429)).toHaveLength(15)
    budget.setTime(899)
    expect((await fixture({ rpc: budget.rpc }).call(reset)).headers.get('Retry-After')).toBe('1')
    budget.setTime(900)
    expect((await fixture({ rpc: budget.rpc }).call(reset)).status).toBe(400)
  })

  it('separates actions without replenishing reset allowance and enforces the global budget', async () => {
    const budget = budgetModel()
    const gateway = fixture({ rpc: budget.rpc })
    for (let index = 0; index < 5; index += 1) await gateway.call(reset)
    expect((await gateway.call({ ...reset, action: 'get-recovery-question' })).status).toBe(200)
    expect((await gateway.call(reset)).status).toBe(429)
    const responses = await Promise.all(Array.from({ length: 120 }, (_, index) => gateway.call({ ...reset, loginName: `person-${index}` })))
    expect(responses.filter((response) => response.status === 400)).toHaveLength(94)
    expect(responses.filter((response) => response.status === 429)).toHaveLength(26)
  })
})

describe('account gateway security helpers', () => {
  it.each(['null', '[]', '42', '"text"', '{'])('rejects nonobject or malformed JSON %s', async (body) => {
    await expect(readPayload(new Request('https://unit.invalid', { method: 'POST', body }))).rejects.toThrow()
  })

  it('bounds actual bytes even without content-length', async () => {
    await expect(readPayload(new Request('https://unit.invalid', {
      method: 'POST', body: JSON.stringify({ value: 'a'.repeat(maxBodyBytes) }),
    }))).rejects.toThrow()
    expect(await readPayload(new Request('https://unit.invalid', { method: 'POST', body: '{}' }))).toEqual({})
  })

  it('allows exactly 16 KiB, rejects byte-heavy UTF-8 and misleading lengths', async () => {
    const exact = JSON.stringify({ value: 'a'.repeat(maxBodyBytes - 12) })
    expect(new TextEncoder().encode(exact)).toHaveLength(maxBodyBytes)
    expect(await readPayload(new Request('https://unit.invalid', { method: 'POST', body: exact }))).toEqual({ value: 'a'.repeat(maxBodyBytes - 12) })
    for (const [body, length] of [
      [JSON.stringify({ value: '\u00e9'.repeat(maxBodyBytes / 2) }), '1'],
      ['{}', String(maxBodyBytes + 1)], ['{}', 'invalid'],
    ]) {
      await expect(readPayload(new Request('https://unit.invalid', { method: 'POST', body, headers: { 'content-length': length } }))).rejects.toThrow()
    }
  })

  it('rejects streamed oversize, invalid UTF-8 and absent bodies', async () => {
    const cancel = vi.fn()
    let count = 0
    const body = new ReadableStream({
      pull(controller) { count += 1; controller.enqueue(new Uint8Array(maxBodyBytes / 2)); },
      cancel,
    })
    await expect(readPayload(new Request('https://unit.invalid', { method: 'POST', body, duplex: 'half' } as RequestInit))).rejects.toThrow()
    expect(cancel).toHaveBeenCalledTimes(1)
    expect(count).toBeLessThanOrEqual(4)
    await expect(readPayload(new Request('https://unit.invalid', { method: 'POST', body: new Uint8Array([0xff]) }))).rejects.toThrow()
    await expect(readPayload(new Request('https://unit.invalid', { method: 'POST' }))).rejects.toThrow()
  })

  it('preserves legacy pepper/login/normalized answer SHA-256', async () => {
    const digest = await hashAnswer('synthetic-pepper', 'person', '  AnSwEr  ')
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('synthetic-pepper:person:answer'))
    expect(digest).toBe(Buffer.from(bytes).toString('hex'))
    expect(equalDigest(digest, digest)).toBe(true)
    expect(equalDigest(digest, '0'.repeat(64))).toBe(false)
    expect(equalDigest(digest, null)).toBe(false)
  })

  it('uses dedicated domain-separated HMAC rather than an unkeyed login digest', async () => {
    const digest = await limiterLoginHash('synthetic-key', 'person')
    expect(digest).toMatch(/^[a-f0-9]{64}$/)
    expect(digest).toBe(createHmac('sha256', 'synthetic-key').update('account-gateway:budget:v1:login\0person').digest('hex'))
    expect(await limiterLoginHash('synthetic-key', 'person')).toBe(digest)
    expect(await limiterLoginHash('other-key', 'person')).not.toBe(digest)
    await expect(limiterLoginHash('', 'person')).rejects.toThrow()
  })

  it.each([null, [], [{ allowed: true, retry_after_seconds: 1 }],
    [{ allowed: false, retry_after_seconds: 0 }], [{ allowed: false, retry_after_seconds: 901 }],
    [{ allowed: 'true', retry_after_seconds: 0 }], [{ allowed: true, retry_after_seconds: 0 }, {}],
  ])('fails closed for malformed budget response %j', (data) => {
    expect(() => parseBudget(data)).toThrow()
  })

  it('accepts only bounded admission/cooldown replies', () => {
    expect(parseBudget([{ allowed: true, retry_after_seconds: 0 }])).toEqual({ allowed: true, retryAfterSeconds: 0 })
    expect(parseBudget([{ allowed: false, retry_after_seconds: 900 }])).toEqual({ allowed: false, retryAfterSeconds: 900 })
  })
})