import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { transpileModule } from 'typescript'
import * as language from '../src/lib/language'
import * as accountIdentifier from '../src/lib/accountIdentifier'
const loginSource = readFileSync('src/pages/Login.tsx', 'utf8')
const parserSource = loginSource.slice(loginSource.indexOf('type LoginMode'), loginSource.indexOf('const internalAuthDomain'))
const readGatewayFailure = runInNewContext(transpileModule(`${parserSource}\nreadGatewayFailure`, {}).outputText, { Response, Date }) as (data: unknown, error: unknown) => Promise<{ key: string; retryAfterSeconds?: number } | null>

afterEach(() => vi.useRealTimers())

type Node = { type: string; props: Record<string, unknown> }
type Effect = { setup: () => void | (() => void); dependencies?: unknown[]; cleanup?: () => void }
function loginHarness() {
  const values: unknown[] = []
  const effects = new Map<number, Effect>()
  let cursor = 0
  let pending: number[] = []
  let pendingLayout: number[] = []
  let tree: Node[] = []
  const updateGuards = new Map<string, boolean>()
  const registerPwaUpdateGuard = vi.fn((key: string, safe: boolean) => {
    updateGuards.set(key, safe)
    return () => { updateGuards.delete(key) }
  })
  const setPwaUpdateGuard = vi.fn((key: string, safe: boolean) => { updateGuards.set(key, safe) })
  const invoke = vi.fn<(...args: unknown[]) => Promise<{ data: unknown; error: unknown }>>(async () => ({ data: { success: true }, error: null }))
  const signIn = vi.fn(async (_credentials: unknown) => ({ error: null }))
  const scheduleEffect = (setup: Effect['setup'], dependencies: unknown[] | undefined, layout: boolean) => {
    const index = cursor++
    const previous = effects.get(index)
    if (!previous || !dependencies || dependencies.some((value, position) => !Object.is(value, previous.dependencies?.[position]))) {
      effects.set(index, { setup, dependencies, cleanup: previous?.cleanup })
      ;(layout ? pendingLayout : pending).push(index)
    }
  }
  const react = {
    useRef: (initial: unknown) => { const index = cursor++; values[index] ??= { current: initial }; return values[index] },
    useState: (initial: unknown) => {
      const index = cursor++
      if (!(index in values)) values[index] = initial
      return [values[index], (next: unknown) => { values[index] = typeof next === 'function' ? next(values[index]) : next }]
    },
    useEffect: (setup: Effect['setup'], dependencies?: unknown[]) => scheduleEffect(setup, dependencies, false),
    useLayoutEffect: (setup: Effect['setup'], dependencies?: unknown[]) => scheduleEffect(setup, dependencies, true),
  }
  const jsx = (type: string, props: Record<string, unknown>) => ({ type, props })
  const imports: Record<string, unknown> = {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx },
    '../lib/supabase': { supabase: { functions: { invoke }, auth: { signInWithPassword: signIn } } },
    '../lib/language': language,
    '../lib/accountIdentifier': accountIdentifier,
    '../lib/pwaUpdateRuntime': { registerPwaUpdateGuard, setPwaUpdateGuard },
    '../lib/i18n': { useI18n: () => ({ language: 'en', setLanguage: vi.fn(), t: (key: string) => key }) },
  }
  const module = { exports: {} as { default: () => Node } }
  const code = transpileModule(readFileSync('src/pages/Login.tsx', 'utf8'), { compilerOptions: { jsx: 4, module: 1 } }).outputText
  runInNewContext(code, { exports: module.exports, require: (name: string) => imports[name], Response, Date, window: { setInterval, clearInterval } })
  const nodes = (element: unknown): Node[] => {
    if (Array.isArray(element)) return element.flatMap(nodes)
    if (!element || typeof element !== 'object' || !('props' in element)) return []
    const node = element as Node
    return [node, ...nodes(node.props.children)]
  }
  const render = () => {
    cursor = 0; pending = []; pendingLayout = []
    tree = nodes(module.exports.default())
    for (const index of [...pendingLayout, ...pending]) { const effect = effects.get(index)!; effect.cleanup?.(); effect.cleanup = effect.setup() ?? undefined }
  }
  const click = (label: string) => {
    const button = tree.find((node) => node.type === 'button' && node.props.children === label)!
    return (button.props.onClick as () => Promise<void> | void)()
  }
  const change = (autocomplete: string, value: string) => {
    const input = tree.find((node) => node.type === 'input' && node.props.autoComplete === autocomplete)!
    ;(input.props.onChange as (event: unknown) => void)({ target: { value } })
  }
  const changeLabel = (label: string, value: string) => {
    const wrapper = tree.find((node) => node.type === 'label' && nodes(node.props.children).some((child) => child.type === 'span' && child.props.children === label))!
    const input = nodes(wrapper.props.children).find((node) => node.type === 'input')!
    ;(input.props.onChange as (event: unknown) => void)({ target: { value } })
  }
  const submit = () => (tree.find((node) => node.type === 'form')!.props.onSubmit as (event: unknown) => Promise<void>)({ preventDefault: vi.fn() })
  render()
  return { render, click, change, changeLabel, submit, invoke, signIn, updateGuards, registerPwaUpdateGuard, setPwaUpdateGuard, text: () => JSON.stringify(tree), close: () => { for (const effect of effects.values()) effect.cleanup?.() } }
}

describe('Login PWA update safety', () => {
  it('permits only a pristine idle form and removes its guard on unmount without submitting', () => {
    const harness = loginHarness()
    expect(harness.registerPwaUpdateGuard).toHaveBeenCalledWith('login', false)
    expect(harness.updateGuards.get('login')).toBe(true)
    harness.change('username', 'fixture@example.com'); harness.render()
    expect(harness.updateGuards.get('login')).toBe(false)
    harness.change('username', ''); harness.render()
    expect(harness.updateGuards.get('login')).toBe(true)
    harness.change('current-password', 'Private fixture password'); harness.render()
    expect(harness.updateGuards.get('login')).toBe(false)
    harness.change('current-password', ''); harness.render()
    expect(harness.updateGuards.get('login')).toBe(true)
    harness.click('Create account'); harness.render()
    harness.changeLabel('Security answer', 'Private fixture answer'); harness.render()
    expect(harness.updateGuards.get('login')).toBe(false)
    harness.changeLabel('Security answer', ''); harness.render()
    expect(harness.updateGuards.get('login')).toBe(true)
    expect(harness.invoke).not.toHaveBeenCalled()
    expect(harness.signIn).not.toHaveBeenCalled()
    harness.close()
    expect(harness.updateGuards.has('login')).toBe(false)
  })

  it('blocks a pending explicit sign-in even when the fixture has no field drafts', async () => {
    const harness = loginHarness()
    let finish!: (value: { error: null }) => void
    harness.signIn.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
    expect(harness.signIn).not.toHaveBeenCalled()
    const pending = harness.submit(); harness.render()
    expect(harness.signIn).toHaveBeenCalledOnce()
    expect(harness.updateGuards.get('login')).toBe(false)
    finish({ error: null }); await pending; harness.render()
    expect(harness.updateGuards.get('login')).toBe(true)
    expect(harness.signIn).toHaveBeenCalledOnce()
    harness.close()
  })
})

describe('frontend gateway error contract', () => {
  it('reads the actual non-2xx Edge payload and honors the longer Retry-After', async () => {
    const context = new Response(JSON.stringify({ error: 'Do not render raw input', code: 'RATE_LIMITED', retryAfterSeconds: 12 }), { status: 429, headers: { 'Retry-After': '30' } })
    expect(await readGatewayFailure(null, { context, message: 'generic FunctionsHttpError' })).toEqual({ key: 'auth.rateLimited', retryAfterSeconds: 30 })
    expect(await context.json()).toMatchObject({ code: 'RATE_LIMITED' })
  })
  it.each(['INVALID_REQUEST', 'RECOVERY_FAILED', 'TEMPORARILY_UNAVAILABLE'])('maps %s to localized keys, never raw error text', async (code) => {
    const expected = { INVALID_REQUEST: 'auth.invalidRequest', RECOVERY_FAILED: 'auth.recoveryFailed', TEMPORARILY_UNAVAILABLE: 'auth.unavailable' }[code]
    expect(await readGatewayFailure(null, { context: new Response(JSON.stringify({ code, error: 'secret or raw credentials' }), { status: code === 'TEMPORARILY_UNAVAILABLE' ? 503 : 400 }) })).toEqual({ key: expected })
  })
  it('treats broken responses/network failures as unavailable and generic 400 as recovery failure', async () => {
    expect(await readGatewayFailure(null, { context: new Response('not json', { status: 503 }) })).toEqual({ key: 'auth.unavailable' })
    expect(await readGatewayFailure(null, new Error('offline'))).toEqual({ key: 'auth.unavailable' })
    expect(await readGatewayFailure(null, { context: new Response('{}', { status: 400 }) })).toEqual({ key: 'auth.recoveryFailed' })
    expect(await readGatewayFailure({ success: true }, null)).toBeNull()
  })
  it('only uses safe identifier field metadata for actionable invalid-input feedback', async () => {
    const failure = { code: 'INVALID_REQUEST', field: 'loginName', error: 'Never display this raw address' }
    expect(await readGatewayFailure(failure, null)).toEqual({ key: 'auth.invalidIdentifier' })
    expect(await readGatewayFailure(null, { context: new Response(JSON.stringify(failure), { status: 400 }) })).toEqual({ key: 'auth.invalidIdentifier' })
    expect(await readGatewayFailure({ ...failure, field: 'securityAnswer' }, null)).toEqual({ key: 'auth.invalidRequest' })
  })
})

describe('Login async ownership', () => {
  it('clears a loaded question on login/mode change and drops delayed responses including A-B-A edits', async () => {
    const harness = loginHarness()
    harness.click('Reset password'); harness.render()
    harness.change('username', 'user_a'); harness.render()
    harness.invoke.mockResolvedValueOnce({ data: { securityQuestion: 'Visible question' }, error: null })
    harness.click('Show security question')
    for (let turn = 0; turn < 12; turn++) await Promise.resolve()
    harness.render()
    expect(harness.text()).toContain('Visible question')
    let finish: (value: { data: unknown; error: unknown }) => void = () => {}
    harness.invoke.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
    harness.click('Show security question')
    harness.change('username', 'user_b'); harness.render()
    harness.change('username', 'user_a'); harness.render()
    expect(harness.text()).not.toContain('Visible question')
    finish({ data: { securityQuestion: 'Stale question' }, error: null })
    await Promise.resolve(); await Promise.resolve()
    harness.render()
    expect(harness.text()).not.toContain('Stale question')
    harness.click('Sign in'); harness.render()
    expect(harness.text()).not.toContain('Visible question')
    harness.close()
  })

  it('retains cooldown across modes, never automatically retries mutations and keeps email sign-in', async () => {
    vi.useFakeTimers()
    const harness = loginHarness()
    harness.click('Reset password'); harness.render()
    harness.change('username', 'User@example.com'); harness.change('new-password', 'Password9'); harness.render()
    harness.invoke.mockResolvedValueOnce({ data: null, error: { context: new Response(JSON.stringify({ code: 'RATE_LIMITED', error: 'raw', retryAfterSeconds: 30 }), { status: 429, headers: { 'Retry-After': '60' } }) } })
    await harness.submit(); harness.render()
    expect(harness.text()).toContain('auth.rateLimited')
    harness.click('Sign in'); harness.render()
    harness.click('Reset password'); harness.render()
    await harness.submit()
    expect(harness.invoke).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(61000)
    harness.render()
    expect(harness.invoke).toHaveBeenCalledTimes(1)
    harness.click('Sign in'); harness.render()
    harness.change('current-password', 'Password9'); harness.render()
    await harness.submit()
    expect(harness.signIn).toHaveBeenCalledWith({ email: 'user@example.com', password: 'Password9' })
    harness.close()
  })

  it('does not sign in after an old create response or show an old question error in another mode', async () => {
    const harness = loginHarness()
    harness.click('Create account'); harness.render()
    harness.change('username', 'user_a'); harness.change('new-password', 'Password9'); harness.render()
    let finish: (value: { data: unknown; error: unknown }) => void = () => {}
    harness.invoke.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
    const create = harness.submit()
    harness.click('Sign in'); harness.render()
    finish({ data: { success: true }, error: null })
    await create
    expect(harness.signIn).not.toHaveBeenCalled()
    harness.click('Reset password'); harness.render()
    harness.invoke.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
    harness.click('Show security question')
    harness.click('Sign in'); harness.render()
    finish({ data: { code: 'RECOVERY_FAILED', error: 'raw' }, error: null })
    await Promise.resolve(); await Promise.resolve()
    harness.render()
    expect(harness.text()).not.toContain('auth.recoveryFailed')
    harness.close()
  })
})

describe('Login username and email gateway input', () => {
  it.each([' Musician+Lessons@Example.COM ', ' User.Name '])('creates using canonical %s and preserves Auth mapping', async (input) => {
    const harness = loginHarness()
    harness.click('Create account'); harness.render()
    harness.change('username', input)
    harness.change('new-password', 'Password9')
    harness.changeLabel('Security question', 'Synthetic fixture question')
    harness.changeLabel('Security answer', 'Synthetic fixture answer')
    harness.render()
    await harness.submit(); harness.render()
    const identifier = input.trim().toLowerCase()
    expect(harness.invoke).toHaveBeenCalledWith('account-gateway', { body: {
      action: 'create-account', loginName: identifier, password: 'Password9', language: 'en',
      securityQuestion: 'Synthetic fixture question', securityAnswer: 'Synthetic fixture answer',
    } })
    expect(harness.signIn).toHaveBeenCalledWith({ email: identifier.includes('@') ? identifier : `${identifier}@accounts.guitar-practice-hub.invalid`, password: 'Password9' })
    harness.close()
  })

  it('uses the same canonical email for recovery question and password reset', async () => {
    const harness = loginHarness()
    harness.click('Reset password'); harness.render()
    harness.change('username', ' Player+Practice@Example.COM '); harness.change('new-password', 'Password9'); harness.render()
    harness.invoke.mockResolvedValueOnce({ data: { securityQuestion: 'Synthetic fixture question' }, error: null })
    harness.click('Show security question')
    for (let turn = 0; turn < 12; turn++) await Promise.resolve()
    harness.render()
    expect(harness.invoke).toHaveBeenLastCalledWith('account-gateway', { body: { action: 'get-recovery-question', loginName: 'player+practice@example.com' } })
    harness.changeLabel('Security answer', 'Synthetic fixture answer'); harness.render()
    await harness.submit(); harness.render()
    expect(harness.invoke).toHaveBeenLastCalledWith('account-gateway', { body: { action: 'reset-password', loginName: 'player+practice@example.com', password: 'Password9', securityAnswer: 'Synthetic fixture answer' } })
    expect(harness.text()).toContain('Password reset. You can now sign in.')
    harness.close()
  })

  it.each(['bad@@example.com', 'user@accounts.guitar-practice-hub.invalid', 'x', `${'a'.repeat(65)}@example.com`])('rejects malformed/reserved gateway identifier %s without network requests', async (input) => {
    const harness = loginHarness()
    harness.click('Create account'); harness.render()
    harness.change('username', input); harness.change('new-password', 'Password9'); harness.render()
    await harness.submit(); harness.render()
    expect(harness.text()).toContain('auth.invalidIdentifier')
    expect(harness.invoke).not.toHaveBeenCalled()
    harness.click('Reset password'); harness.render()
    await harness.click('Show security question'); harness.render()
    expect(harness.text()).toContain('auth.invalidIdentifier')
    await harness.submit(); harness.render()
    expect(harness.invoke).not.toHaveBeenCalled()
    harness.close()
  })

  it('does not impose gateway identifier restrictions on legacy sign-in', async () => {
    const harness = loginHarness()
    harness.change('username', ' User@Accounts.Guitar-Practice-Hub.Invalid ')
    harness.change('current-password', 'Password9'); harness.render()
    await harness.submit()
    expect(harness.signIn).toHaveBeenCalledWith({ email: 'user@accounts.guitar-practice-hub.invalid', password: 'Password9' })
    expect(harness.invoke).not.toHaveBeenCalled()
    harness.close()
  })
})
