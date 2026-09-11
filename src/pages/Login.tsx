import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

type LoginMode = 'sign-in' | 'create-account' | 'reset-password'

const internalAuthDomain = 'accounts.guitar-practice-hub.invalid'

function authEmailForLogin(value: string) {
  const normalizedValue = value.trim().toLowerCase()
  return normalizedValue.includes('@') ? normalizedValue : `${normalizedValue}@${internalAuthDomain}`
}

function getPasswordChecks(password: string) {
  return [
    { label: 'At least 8 characters', valid: password.length >= 8 },
    { label: 'At least one uppercase letter', valid: /[A-Z]/.test(password) },
    { label: 'At least one lowercase letter', valid: /[a-z]/.test(password) },
    { label: 'At least one number', valid: /\d/.test(password) },
  ]
}

function isValidPassword(password: string) {
  return getPasswordChecks(password).every((check) => check.valid)
}

export default function Login() {
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
    if (!isValidPassword(nextPassword)) {
      setError('Choose a password that meets every requirement.')
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
      else setMessage('Account created. You are now signed in.')
    } else {
      setMessage('Password reset. You can now sign in.')
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-100">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-lg border border-slate-800 p-6">
        <h1 className="text-lg font-semibold">Guitar Practice Hub</h1>
        <p className="text-sm text-slate-400">
          {isCreateMode ? 'Create a practice account.' : isResetMode ? 'Reset your password.' : 'Sign in to continue.'}
        </p>
        <input
          type="text"
          autoComplete="username"
          placeholder="Login name or email"
          value={loginName}
          onChange={(e) => setLoginName(e.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2"
          required
        />
        {isCreateMode && (
          <>
            <input
              type="text"
              placeholder="Security question"
              value={securityQuestion}
              onChange={(e) => setSecurityQuestion(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2"
              required
            />
            <input
              type="text"
              placeholder="Security answer"
              value={securityAnswer}
              onChange={(e) => setSecurityAnswer(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2"
              required
            />
          </>
        )}
        {isResetMode && (
          <>
            <button type="button" onClick={() => { void loadSecurityQuestion() }} disabled={loading || !loginName.trim()} className="w-full rounded border border-slate-700 px-3 py-2 text-left text-sm text-slate-300 disabled:opacity-50">
              {loading ? 'Loading question…' : 'Show security question'}
            </button>
            {loadedSecurityQuestion && <p className="rounded border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-300">{loadedSecurityQuestion}</p>}
            <input
              type="text"
              placeholder="Security answer"
              value={securityAnswer}
              onChange={(e) => setSecurityAnswer(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2"
              required
            />
          </>
        )}
        <input
          type="password"
          autoComplete={isResetMode ? 'new-password' : 'current-password'}
          placeholder={isResetMode ? 'New password' : 'Password'}
          value={isResetMode ? newPassword : password}
          onChange={(e) => isResetMode ? setNewPassword(e.target.value) : setPassword(e.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2"
          required
        />
        {(isCreateMode || isResetMode) && (
          <div className="space-y-1 rounded border border-slate-800 bg-slate-950/60 p-3 text-xs">
            <p className="text-slate-400">Password requirements</p>
            {getPasswordChecks(activePassword).map((check) => (
              <p key={check.label} className={check.valid ? 'text-emerald-300' : 'text-slate-500'}>
                {check.valid ? '✓' : '○'} {check.label}
              </p>
            ))}
          </div>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
        {message && <p className="text-sm text-emerald-400">{message}</p>}
        <button type="submit" disabled={loading}
          className="w-full rounded bg-slate-100 px-3 py-2 font-medium text-slate-900 disabled:opacity-50">
          {loading ? 'Working…' : isCreateMode ? 'Create account' : isResetMode ? 'Reset password' : 'Sign in'}
        </button>
        <div className="flex justify-between gap-3 text-xs text-slate-400">
          <button type="button" onClick={() => { setMode('sign-in'); setError(null); setMessage(null) }} className="hover:text-slate-200">
            Sign in
          </button>
          <button type="button" onClick={() => { setMode('create-account'); setError(null); setMessage(null) }} className="hover:text-slate-200">
            Create account
          </button>
          <button type="button" onClick={() => { setMode('reset-password'); setError(null); setMessage(null) }} className="hover:text-slate-200">
            Reset password
          </button>
        </div>
      </form>
    </div>
  )
}