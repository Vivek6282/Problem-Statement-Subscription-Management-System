import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowRight } from 'lucide-react'
import { AuthLayout } from './AuthLayout'
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
          'Failed to sign in. Please check your email and password.',
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
    <AuthLayout>
      <span className="auth-eyebrow">Welcome back</span>
      <h1>
        A little clarity.
        <br />
        <em>Right this way.</em>
      </h1>
      <p className="auth-lede">
        Sign in to keep your subscriptions and payments in good order.
      </p>
      {error && (
        <div className="auth-notice" role="alert">
          <AlertCircle size={16} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
      <form onSubmit={handleSubmit} className="auth-form">
        <Input
          label="Email address"
          type="email"
          name="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
        />
        <div>
          <div className="auth-field-head">
            <label htmlFor="login-password">Password</label>
            <Link to="/forgot-password">Forgot password?</Link>
          </div>
          <Input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
          />
        </div>
        <Button type="submit" className="auth-submit" isLoading={isLoading}>
          Sign in <ArrowRight size={16} aria-hidden="true" />
        </Button>
      </form>
      <div className="auth-demo">
        <p className="auth-divider">Or try a demo account</p>
        <div className="auth-demo-options">
          <button
            type="button"
            onClick={() =>
              fillCredentials('admin@brightloop.io', 'BrightloopAdmin@2026')
            }
          >
            Admin
          </button>
          <button
            type="button"
            onClick={() =>
              fillCredentials('staff@brightloop.io', 'BrightloopStaff@2026')
            }
          >
            Staff
          </button>
          <button
            type="button"
            onClick={() =>
              fillCredentials('acme@example.com', 'CustomerUser@2026')
            }
          >
            Customer
          </button>
        </div>
      </div>
      <p className="auth-switch">
        New here? <Link to="/register">Create your account</Link>
      </p>
    </AuthLayout>
  )
}
