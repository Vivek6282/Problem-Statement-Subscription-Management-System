import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Sparkles, Lock, Mail, AlertCircle } from 'lucide-react'
import { useAuth } from './AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export const LoginPage: React.FC = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      const user = await login(email, password)
      if (user.role === 'CUSTOMER') {
        navigate('/portal')
      } else {
        navigate('/dashboard')
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.non_field_errors?.[0] ||
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        'Failed to sign in. Please check your email and password.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const fillCredentials = (e: string, p: string) => {
    setEmail(e)
    setPassword(p)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-navy-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 border border-slate-100">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-primary to-blue-400 flex items-center justify-center text-white mx-auto mb-3 shadow-lg shadow-primary/25">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Welcome to Brightloop</h1>
          <p className="text-xs text-slate-500 mt-1">Enterprise Subscription Billing & Financial Operations</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-700 font-medium animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">Password</label>
              <Link to="/forgot-password" className="text-xs text-primary font-semibold hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="•••••••••"
            />
          </div>

          <Button type="submit" className="w-full mt-2" size="lg" isLoading={isLoading}>
            Sign In to Dashboard
          </Button>
        </form>

        {/* Demo Fast Fill Buttons */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center mb-3">
            Quick Fill Demo Accounts
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => fillCredentials('admin@brightloop.io', 'BrightloopAdmin@2026')}
              className="py-1.5 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 transition-colors"
            >
              👑 Admin
            </button>
            <button
              type="button"
              onClick={() => fillCredentials('staff@brightloop.io', 'BrightloopStaff@2026')}
              className="py-1.5 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 transition-colors"
            >
              💼 Staff
            </button>
            <button
              type="button"
              onClick={() => fillCredentials('acme@example.com', 'CustomerUser@2026')}
              className="py-1.5 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 transition-colors"
            >
              🏢 Customer
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-500">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary font-bold hover:underline">
            Register new company
          </Link>
        </div>
      </div>
    </div>
  )
}

