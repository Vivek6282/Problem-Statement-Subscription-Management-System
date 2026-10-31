import React, { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Sparkles, ArrowLeft, CheckCircle2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { api, getApiError } from '@/lib/api'

/** Landing page for the emailed, time-limited password reset link (/reset-password?uid=...&token=...). */
export const ResetPasswordPage: React.FC = () => {
  const [params] = useSearchParams()
  const uid = params.get('uid') || ''
  const token = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const rules = [
    { ok: password.length > 8, label: 'More than 8 characters' },
    { ok: /[A-Z]/.test(password), label: 'One uppercase letter' },
    { ok: /[a-z]/.test(password), label: 'One lowercase letter' },
    { ok: /[^A-Za-z0-9]/.test(password), label: 'One special character' },
  ]
  const valid = rules.every((r) => r.ok) && password === confirm

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    setIsLoading(true)
    setError(null)
    try {
      await api.get('/auth/csrf/')
      await api.post('/auth/password-reset-confirm/', {
        uid,
        token,
        new_password: password,
        new_password_confirm: confirm,
      })
      setDone(true)
    } catch (err) {
      setError(getApiError(err, 'This reset link is invalid or has expired. Please request a new one.'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-navy-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 border border-slate-100">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-primary to-blue-400 flex items-center justify-center text-white mx-auto mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Choose a New Password</h1>
          <p className="text-xs text-slate-500 mt-1">Reset links are single-use and expire after a short time</p>
        </div>

        {!uid || !token ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <p className="text-xs text-slate-600 font-medium">This reset link is incomplete. Please request a new one.</p>
            <Link to="/forgot-password" className="inline-block text-xs font-bold text-primary hover:underline">Request a new link</Link>
          </div>
        ) : done ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="text-xs text-slate-600 font-medium">Your password has been reset. You can now sign in.</p>
            <Link to="/login" className="inline-block mt-2 text-xs font-bold text-primary hover:underline">Go to Sign In</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-xs font-medium rounded-lg border border-red-100" role="alert">
                {error}{' '}
                <Link to="/forgot-password" className="font-bold underline">Request a new link</Link>
              </div>
            )}
            <Input label="New Password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
              {rules.map((r) => (
                <li key={r.label} className={`text-[11px] font-medium ${r.ok ? 'text-green-600' : 'text-slate-400'}`}>
                  {r.ok ? '✓' : '○'} {r.label}
                </li>
              ))}
            </ul>
            <Input
              label="Confirm New Password"
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              error={confirm && confirm !== password ? 'Passwords do not match' : undefined}
            />
            <Button type="submit" className="w-full" size="lg" isLoading={isLoading} disabled={!valid}>
              Reset Password
            </Button>
            <div className="text-center pt-2">
              <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-semibold hover:text-slate-900">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
