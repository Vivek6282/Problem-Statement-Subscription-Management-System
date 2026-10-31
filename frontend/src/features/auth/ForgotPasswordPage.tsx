import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { api } from '@/lib/api'

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const res = await api.post('/auth/password-reset-request/', { email })
      setMessage(res.data.message || 'If an account exists, a reset link has been dispatched.')
      setIsSubmitted(true)
    } catch {
      setMessage('If an account exists, a reset link has been dispatched.')
      setIsSubmitted(true)
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
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Reset Password</h1>
          <p className="text-xs text-slate-500 mt-1">We'll send you an email with reset instructions</p>
        </div>

        {isSubmitted ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="text-xs text-slate-600 font-medium">{message}</p>
            <p className="text-[11px] text-slate-400">In development mode, check your backend server console for the link.</p>
            <Link to="/login" className="inline-block mt-4 text-xs font-bold text-primary hover:underline">
              Return to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
            <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
              Send Reset Link
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

