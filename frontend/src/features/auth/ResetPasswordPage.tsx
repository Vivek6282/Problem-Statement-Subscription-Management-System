import React, { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react'
import { AuthLayout } from './AuthLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { api } from '@/lib/api'
import { formatApiError } from '@/lib/apiErrors'

// Same character set as ComplexPasswordValidator in backend/apps/accounts/validators.py.
const SPECIAL_CHARS = /[!@#$%^&*(),.?":{}|<>~`_\-+=[\]\\;/']/

/** Landing page for the emailed password reset link: /reset-password?uid=...&token=... */
export const ResetPasswordPage: React.FC = () => {
  const [params] = useSearchParams()
  const uid = params.get('uid') || ''
  const token = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const rules = [
    { ok: password.length >= 9, label: 'At least 9 characters' },
    { ok: /[A-Z]/.test(password), label: 'An uppercase letter' },
    { ok: /[a-z]/.test(password), label: 'A lowercase letter' },
    { ok: SPECIAL_CHARS.test(password), label: 'A special character' },
  ]
  const mismatch = confirm.length > 0 && confirm !== password
  const isValid = rules.every((r) => r.ok) && password === confirm

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    setError(null)
    setIsLoading(true)
    try {
      await api.post('/auth/password-reset-confirm/', {
        uid,
        token,
        new_password: password,
        new_password_confirm: confirm,
      })
      setIsDone(true)
    } catch (err) {
      setError(
        formatApiError(err, 'This reset link is invalid or has expired. Please request a new one.'),
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout mode="reset">
      <span className="auth-eyebrow">Almost there</span>
      <h1>
        Choose a new
        <br />
        <em>password.</em>
      </h1>
      <p className="auth-lede">
        Reset links work once and expire after a short time.
      </p>

      {!uid || !token ? (
        <div className="auth-notice" role="alert">
          <AlertCircle size={16} aria-hidden="true" />
          <span>
            This reset link is incomplete.{' '}
            <Link to="/forgot-password">Request a new link</Link>
          </span>
        </div>
      ) : isDone ? (
        <div className="auth-success" role="status">
          <CheckCircle2 size={24} aria-hidden="true" />
          <h2>Password updated.</h2>
          <p>You can now sign in with your new password.</p>
          <Link className="auth-link" to="/login">
            <ArrowLeft size={15} aria-hidden="true" /> Back to sign in
          </Link>
        </div>
      ) : (
        <>
          {error && (
            <div className="auth-notice" role="alert">
              <AlertCircle size={16} aria-hidden="true" />
              <span>
                {error} <Link to="/forgot-password">Request a new link</Link>
              </span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="auth-form">
            <Input
              label="New password"
              type="password"
              name="new_password"
              autoComplete="new-password"
              aria-describedby="reset-password-rules"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
            />
            <ul className="auth-hint" id="reset-password-rules" aria-live="polite">
              {rules.map((r) => (
                <li key={r.label}>
                  <span aria-hidden="true">{r.ok ? '✓' : '○'}</span> {r.label}
                  <span className="sr-only">{r.ok ? ' (done)' : ' (missing)'}</span>
                </li>
              ))}
            </ul>
            <Input
              label="Confirm new password"
              type="password"
              name="new_password_confirm"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat password"
              error={mismatch ? 'Passwords do not match.' : undefined}
            />
            <Button type="submit" className="auth-submit" isLoading={isLoading} disabled={!isValid}>
              Save new password <ArrowRight size={16} aria-hidden="true" />
            </Button>
            <Link className="auth-link" to="/login">
              <ArrowLeft size={15} aria-hidden="true" /> Back to sign in
            </Link>
          </form>
        </>
      )}
    </AuthLayout>
  )
}
