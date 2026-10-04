import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { defaultLanguage, isLanguage, supportedLanguages, type Language } from '../lib/language'
import { useI18n } from '../lib/i18n'

type LoginMode = 'sign-in' | 'create-account' | 'reset-password'

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
  const [securityQuestion, setSecurityQuestion] = useState('')
  const [securityAnswer, setSecurityAnswer] = useState('')
  const [loadedSecurityQuestion, setLoadedSecurityQuestion] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [language, setLanguage] = useState<Language>(interfaceLanguage ?? defaultLanguage)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    if (mode === 'sign-in') {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: authEmailForLogin(loginName),
        password,
      })
      if (signInError) setError(signInError.message)
      setLoading(false)
      return
    }

    const nextPassword = mode === 'create-account' ? password : newPassword
    if (!isValidPassword(nextPassword, t)) {
      setError(t('Choose a password that meets every requirement.'))
      setLoading(false)
      return
    }

    const functionPayload = mode === 'create-account'
      ? {
          action: mode,
          loginName,
          password,
          securityQuestion,
          securityAnswer,
          language,
        }
      : {
          action: mode,
          loginName,
          password: newPassword,
          securityAnswer,
        }

    const { data, error: functionError } = await supabase.functions.invoke('account-gateway', {
      body: functionPayload,
    })

    if (functionError) {
      setError(functionError.message)
      setLoading(false)
      return
    }

    if (data?.error) {
      setError(data.error)
      setLoading(false)
      return
    }

    if (mode === 'create-account') {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: authEmailForLogin(loginName),
        password,
      })
      if (signInError) setError(signInError.message)
      else setMessage(t('Account created. You are now signed in.'))
    } else {
      setMessage(t('Password reset. You can now sign in.'))
      setMode('sign-in')
      setPassword(newPassword)
      setNewPassword('')
      setSecurityAnswer('')
    }

    setLoading(false)
  }

  async function loadSecurityQuestion() {
    setError(null)
    setMessage(null)
    setLoading(true)
    const { data, error: functionError } = await supabase.functions.invoke('account-gateway', {
      body: { action: 'get-recovery-question', loginName },
    })
    if (functionError) setError(functionError.message)
    else if (data?.error) setError(data.error)
    else setLoadedSecurityQuestion(data?.securityQuestion ?? '')
    setLoading(false)
  }

  const isCreateMode = mode === 'create-account'
  const isResetMode = mode === 'reset-password'
  const activePassword = isResetMode ? newPassword : password

  const switchMode = (nextMode: LoginMode) => {
    setMode(nextMode)
    setError(null)
    setMessage(null)
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
            <select
              value={language}
              onChange={(e) => { if (isLanguage(e.target.value)) { setLanguage(e.target.value); setInterfaceLanguage(e.target.value) } }}
              className="field"
            >
              {supportedLanguages.map((option) => <option key={option} value={option}>{t(option.toUpperCase())}</option>)}
            </select>
          </label>
        )}
        <label className="block">
          <span className="label">{t('Login name or email')}</span>
          <input
            type="text"
            autoComplete="username"
            value={loginName}
            onChange={(e) => setLoginName(e.target.value)}
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
            <button type="button" onClick={() => { void loadSecurityQuestion() }} disabled={loading || !loginName.trim()} className="btn btn-secondary w-full">
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
              type="password"
              autoComplete={isResetMode ? 'new-password' : 'current-password'}
              value={isResetMode ? newPassword : password}
              onChange={(e) => isResetMode ? setNewPassword(e.target.value) : setPassword(e.target.value)}
              className="field"
              required
            />
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
        {error && <p role="alert" className="msg-error">{error}</p>}
        {message && <p role="status" className="msg-success">{message}</p>}
        <button type="submit" disabled={loading} className="btn btn-primary w-full">
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