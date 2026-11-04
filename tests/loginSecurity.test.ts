import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { transpileModule } from 'typescript'
import * as language from '../src/lib/language'
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
  let tree: Node[] = []
  const invoke = vi.fn<(...args: unknown[]) => Promise<{ data: unknown; error: unknown }>>(async () => ({ data: { success: true }, error: null }))
  const signIn = vi.fn(async (_credentials: unknown) => ({ error: null }))
  const react = {
    useRef: (initial: unknown) => { const index = cursor++; values[index] ??= { current: initial }; return values[index] },
    useState: (initial: unknown) => {
      const index = cursor++
      if (!(index in values)) values[index] = initial
      return [values[index], (next: unknown) => { values[index] = typeof next === 'function' ? next(values[index]) : next }]
    },
    useEffect: (setup: Effect['setup'], dependencies?: unknown[]) => {
      const index = cursor++
      const previous = effects.get(index)
      if (!previous || !dependencies || dependencies.some((value, position) => !Object.is(value, previous.dependencies?.[position]))) {
        effects.set(index, { setup, dependencies, cleanup: previous?.cleanup }); pending.push(index)
      }
    },
  }
  const jsx = (type: string, props: Record<string, unknown>) => ({ type, props })
  const imports: Record<string, unknown> = {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx },
    '../lib/supabase': { supabase: { functions: { invoke }, auth: { signInWithPassword: signIn } } },
    '../lib/language': language,
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
    cursor = 0; pending = []
    tree = nodes(module.exports.default())
    for (const index of pending) { const effect = effects.get(index)!; effect.cleanup?.(); effect.cleanup = effect.setup() ?? undefined }
  }
  const click = (label: string) => {
    const button = tree.find((node) => node.type === 'button' && node.props.children === label)!
    return (button.props.onClick as () => Promise<void> | void)()
  }
  const change = (autocomplete: string, value: string) => {
    const input = tree.find((node) => node.type === 'input' && node.props.autoComplete === autocomplete)!
    ;(input.props.onChange as (event: unknown) => void)({ target: { value } })
  }
  const submit = () => (tree.find((node) => node.type === 'form')!.props.onSubmit as (event: unknown) => Promise<void>)({ preventDefault: vi.fn() })
  render()
  return { render, click, change, submit, invoke, signIn, text: () => JSON.stringify(tree), close: () => { for (const effect of effects.values()) effect.cleanup?.() } }
}

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
})

describe('Login async ownership', () => {
  it('clears a loaded question on login/mode change and drops delayed responses including A-B-A edits', async () => {
    const harness = loginHarness()
    harness.click('Reset password'); harness.render()
    harness.change('username', 'A'); harness.render()
    harness.invoke.mockResolvedValueOnce({ data: { securityQuestion: 'Visible question' }, error: null })
    harness.click('Show security question')
    for (let turn = 0; turn < 12; turn++) await Promise.resolve()
    harness.render()
    expect(harness.text()).toContain('Visible question')
    let finish: (value: { data: unknown; error: unknown }) => void = () => {}
    harness.invoke.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
    harness.click('Show security question')
    harness.change('username', 'B'); harness.render()
    harness.change('username', 'A'); harness.render()
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
    harness.change('username', 'A'); harness.change('new-password', 'Password9'); harness.render()
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
