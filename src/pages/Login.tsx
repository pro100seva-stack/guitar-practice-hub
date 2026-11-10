import { useEffect, useRef, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { defaultLanguage, isLanguage, supportedLanguages, type Language } from '../lib/language'
import { useI18n } from '../lib/i18n'
import AppSelect from '../components/AppSelect'
import { isValidAccountIdentifier, normalizeAccountIdentifier } from '../lib/accountIdentifier'

type LoginMode = 'sign-in' | 'create-account' | 'reset-password'
type GatewayAction = Exclude<LoginMode, 'sign-in'> | 'get-recovery-question'
type GatewayFailure = { key: string; retryAfterSeconds?: number }

async function readGatewayFailure(data: unknown, error: unknown): Promise<GatewayFailure | null> {
  const response = error && typeof error === 'object' && 'context' in error && error.context instanceof Response ? error.context : null
  let payload: unknown = data
  if (response) {
    try { payload = await response.clone().json() } catch { payload = null }
  }
  const body = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : null
  const code = body && 'code' in body ? body.code : null
  if (response?.status === 429 || code === 'RATE_LIMITED') {
    const seconds = body && 'retryAfterSeconds' in body && typeof body.retryAfterSeconds === 'number' && Number.isFinite(body.retryAfterSeconds) ? body.retryAfterSeconds : 0
    const header = response?.headers.get('Retry-After')
    const headerSeconds = header ? (/^\d+$/.test(header.trim()) ? Number(header) : (Date.parse(header) - Date.now()) / 1000) : 0
    return { key: 'auth.rateLimited', retryAfterSeconds: Math.max(1, Math.ceil(seconds), Number.isFinite(headerSeconds) ? Math.ceil(headerSeconds) : 0) }
  }
  if (response?.status === 503 || code === 'TEMPORARILY_UNAVAILABLE') return { key: 'auth.unavailable' }
  if (code === 'RECOVERY_FAILED') return { key: 'auth.recoveryFailed' }
  if (code === 'INVALID_REQUEST') return { key: body && 'field' in body && body.field === 'loginName' ? 'auth.invalidIdentifier' : 'auth.invalidRequest' }
  if (response?.status === 400) return { key: 'auth.recoveryFailed' }
  if (error || !body || 'error' in body) return { key: 'auth.unavailable' }
  return null
}

const internalAuthDomain = 'accounts.guitar-practice-hub.invalid'

function authEmailForLogin(value: string) {
  const normalizedValue = value.trim().toLowerCase()
  return normalizedValue.includes('@') ? normalizedValue : `${normalizedValue}@${internalAuthDomain}`
}

function getPasswordChecks(password: string, t: (key: string) => string) {
  return [
    { label: t('At least 8 characters'), valid: password.length >= 8 },
    { label: t('At least one uppercase letter'), valid: /[A-Z]/.test(password) },
    { label: t('At least one lowercase letter'), valid: /[a-z]/.test(password) },
    { label: t('At least one number'), valid: /\d/.test(password) },
  ]
}

function isValidPassword(password: string, t: (key: string) => string) {
  return getPasswordChecks(password, t).every((check) => check.valid)
}

export default function Login() {
  const { language: interfaceLanguage, setLanguage: setInterfaceLanguage, t } = useI18n()
  const [mode, setMode] = useState<LoginMode>('sign-in')
  const [loginName, setLoginName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [securityQuestion, setSecurityQuestion] = useState('')
  const [securityAnswer, setSecurityAnswer] = useState('')
  const [loadedSecurityQuestion, setLoadedSecurityQuestion] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [language, setLanguage] = useState<Language>(interfaceLanguage ?? defaultLanguage)
  const requestRef = useRef(0)
  const pendingRef = useRef(false)
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({})
  const [now, setNow] = useState(Date.now())
  const budgetKey = (action: GatewayAction) => `${action}:${loginName.trim().toLowerCase()}`
  const remaining = (action: GatewayAction) => Math.max(0, Math.ceil(((cooldowns[budgetKey(action)] ?? 0) - now) / 1000))
  const submitCooldown = mode === 'sign-in' ? 0 : remaining(mode)
  const questionCooldown = mode === 'reset-password' ? remaining('get-recovery-question') : 0
  const cooldown = Math.max(submitCooldown, questionCooldown)
  const hasCooldown = Object.values(cooldowns).some((until) => until > now)

  useEffect(() => {
    if (!hasCooldown) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [hasCooldown])
  useEffect(() => () => { requestRef.current++; pendingRef.current = false }, [])

  function clearRequestState() {
    requestRef.current++
    setNow(Date.now())
    pendingRef.current = false
    setLoading(false)
    setLoadedSecurityQuestion('')
    setSecurityAnswer('')
    setError(null)
    setMessage(null)
  }

  function showGatewayFailure(failure: GatewayFailure, action: GatewayAction) {
    if (failure.retryAfterSeconds !== undefined) {
      const time = Date.now()
      const retryAfterSeconds = failure.retryAfterSeconds
      setNow(time)
      setCooldowns((current) => ({ ...current, [budgetKey(action)]: time + retryAfterSeconds * 1000 }))
      setError(null)
    } else setError(t(failure.key))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (pendingRef.current || submitCooldown > 0) return
    const request = ++requestRef.current
    pendingRef.current = true
    setError(null)
    setMessage(null)
    setLoading(true)

    try {
    if (mode === 'sign-in') {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: authEmailForLogin(loginName),
        password,
      })
      if (request !== requestRef.current) return
      if (signInError) setError(t('auth.signInFailed'))
      return
    }

    const identifier = normalizeAccountIdentifier(loginName)
    if (!isValidAccountIdentifier(identifier)) {
      setError(t('auth.invalidIdentifier'))
      return
    }

    const nextPassword = mode === 'create-account' ? password : newPassword
    if (!isValidPassword(nextPassword, t)) {
      setError(t('Choose a password that meets every requirement.'))
      return
    }

    const functionPayload = mode === 'create-account'
      ? {
          action: mode,
          loginName: identifier,
          password,
          securityQuestion,
          securityAnswer,
          language,
        }
      : {
          action: mode,
          loginName: identifier,
          password: newPassword,
          securityAnswer,
        }

    const { data, error: functionError } = await supabase.functions.invoke('account-gateway', {
      body: functionPayload,
    })

    if (request !== requestRef.current) return
    const failure = await readGatewayFailure(data, functionError)
    if (request !== requestRef.current) return
    if (failure) { showGatewayFailure(failure, mode); return }

    if (mode === 'create-account') {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: authEmailForLogin(loginName),
        password,
      })
      if (request !== requestRef.current) return
      if (signInError) setError(t('auth.signInFailed'))
      else setMessage(t('Account created. You are now signed in.'))
    } else {
      setMessage(t('Password reset. You can now sign in.'))
      setMode('sign-in')
      setPassword(newPassword)
      setNewPassword('')
      setSecurityAnswer('')
      setLoadedSecurityQuestion('')
    }
    } catch {
      if (request === requestRef.current) setError(t(mode === 'sign-in' ? 'auth.signInFailed' : 'auth.unavailable'))
    } finally {
      if (request === requestRef.current) { pendingRef.current = false; setLoading(false) }
    }
  }

  async function loadSecurityQuestion() {
    if (pendingRef.current || questionCooldown > 0) return
    const request = ++requestRef.current
    pendingRef.current = true
    setLoadedSecurityQuestion('')
    setError(null)
    setMessage(null)
    setLoading(true)
    try {
      const identifier = normalizeAccountIdentifier(loginName)
      if (!isValidAccountIdentifier(identifier)) {
        setError(t('auth.invalidIdentifier'))
        return
      }
      const { data, error: functionError } = await supabase.functions.invoke('account-gateway', {
        body: { action: 'get-recovery-question', loginName: identifier },
      })
      if (request !== requestRef.current) return
      const failure = await readGatewayFailure(data, functionError)
      if (request !== requestRef.current) return
      if (failure) showGatewayFailure(failure, 'get-recovery-question')
      else if (typeof data?.securityQuestion === 'string') setLoadedSecurityQuestion(data.securityQuestion)
      else setError(t('auth.unavailable'))
    } catch {
      if (request === requestRef.current) setError(t('auth.unavailable'))
    } finally {
      if (request === requestRef.current) { pendingRef.current = false; setLoading(false) }
    }
  }

  const isCreateMode = mode === 'create-account'
  const isResetMode = mode === 'reset-password'
  const activePassword = isResetMode ? newPassword : password

  const switchMode = (nextMode: LoginMode) => {
    clearRequestState()
    setShowPassword(false)
    setMode(nextMode)
  }

  return (
    <div className="min-h-dvh bg-slate-900 px-[var(--page-px)] py-8 text-slate-100 sm:flex sm:items-center sm:justify-center">
      <form onSubmit={handleSubmit} className="mx-auto w-full max-w-sm space-y-4">
        <h1 className="page-title">{t('Guitar Practice Hub')}</h1>
        <p className="meta">
          {isCreateMode ? t('Create a practice account.') : isResetMode ? t('Reset your password.') : t('Sign in to continue.')}
        </p>
        {isCreateMode && (
          <label className="block">
            <span className="label">{t('Language')}</span>
            <AppSelect
              aria-label={t('Language')}
              value={language}
              onValueChange={(value) => { if (isLanguage(value)) { setLanguage(value); setInterfaceLanguage(value) } }}
              className="field"
              options={supportedLanguages.map((option) => ({ value: option, label: t(option.toUpperCase()) }))}
            />
          </label>
        )}
        <label className="block">
          <span className="label">{t('Login name or email')}</span>
          <input
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={error === t('auth.invalidIdentifier') || undefined}
            aria-describedby={error === t('auth.invalidIdentifier') ? 'account-error' : undefined}
            value={loginName}
            onChange={(e) => { clearRequestState(); setLoginName(e.target.value) }}
            className="field"
            required
          />
        </label>
        {isCreateMode && (
          <>
            <label className="block">
              <span className="label">{t('Security question')}</span>
              <input
                type="text"
                value={securityQuestion}
                onChange={(e) => setSecurityQuestion(e.target.value)}
                className="field"
                required
              />
            </label>
            <label className="block">
              <span className="label">{t('Security answer')}</span>
              <input
                type="text"
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                className="field"
                required
              />
            </label>
          </>
        )}
        {isResetMode && (
          <>
            <button type="button" onClick={() => { void loadSecurityQuestion() }} disabled={loading || questionCooldown > 0 || !loginName.trim()} className="btn btn-secondary w-full">
              {loading ? t('Loading question…') : t('Show security question')}
            </button>
            {loadedSecurityQuestion && <p className="text-sm text-slate-300">{loadedSecurityQuestion}</p>}
            <label className="block">
              <span className="label">{t('Security answer')}</span>
              <input
                type="text"
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                className="field"
                required
              />
            </label>
          </>
        )}
        <div>
          <label className="block">
            <span className="label">{isResetMode ? t('New password') : t('Password')}</span>
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete={isResetMode || isCreateMode ? 'new-password' : 'current-password'}
              value={isResetMode ? newPassword : password}
              onChange={(e) => isResetMode ? setNewPassword(e.target.value) : setPassword(e.target.value)}
              className="field"
              required
            />
          </label>
          <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} className="h-5 w-5 shrink-0" />
            {t('ux.showPassword')}
          </label>
          {(isCreateMode || isResetMode) && (
            <div className="mt-2 text-xs">
              <p className="text-slate-300">{t('Password requirements')}</p>
              <ul className="mt-1 space-y-1">
                {getPasswordChecks(activePassword, t).map((check) => (
                  <li key={check.label} className={check.valid ? 'text-emerald-300' : 'text-slate-400'}>
                    {check.valid ? '✓' : '○'} {check.label}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        {error && <p id="account-error" role="alert" className="msg-error">{error}</p>}
        {cooldown > 0 && <p role="status" className="msg-error">{t('auth.rateLimited', { seconds: cooldown })}</p>}
        {message && <p role="status" className="msg-success">{message}</p>}
        <button type="submit" disabled={loading || submitCooldown > 0} className="btn btn-primary w-full">
          {loading ? t('Working…') : isCreateMode ? t('Create account') : isResetMode ? t('Reset password') : t('Sign in')}
        </button>
        <div className="flex flex-wrap justify-between gap-2">
          <button type="button" aria-current={mode === 'sign-in' ? 'true' : undefined} onClick={() => switchMode('sign-in')} className="btn btn-ghost aria-[current=true]:text-white aria-[current=true]:underline">
            {t('Sign in')}
          </button>
          <button type="button" aria-current={isCreateMode ? 'true' : undefined} onClick={() => switchMode('create-account')} className="btn btn-ghost aria-[current=true]:text-white aria-[current=true]:underline">
            {t('Create account')}
          </button>
          <button type="button" aria-current={isResetMode ? 'true' : undefined} onClick={() => switchMode('reset-password')} className="btn btn-ghost aria-[current=true]:text-white aria-[current=true]:underline">
            {t('Reset password')}
          </button>
        </div>
      </form>
    </div>
  )
}
