import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowUpRight } from 'lucide-react'
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
      <span className="bl-eyebrow">WELCOME BACK</span>
      <h1>
        A little clarity.
        <br />
        <em>Right this way.</em>
      </h1>
      <p className="bl-auth-description">
        Sign in to keep your subscriptions and payments in good order.
      </p>
      {error && (
        <div className="bl-notice bl-notice-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}
      <form onSubmit={handleSubmit} className="bl-form">
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
        <div className="bl-password-field">
          <div className="bl-field-heading">
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
        <Button type="submit" className="bl-submit" isLoading={isLoading}>
          Sign in <ArrowUpRight size={17} />
        </Button>
      </form>
      <div className="bl-demo">
        <span className="bl-eyebrow">JUST EXPLORING?</span>
        <p>Choose a demo account to fill in the details.</p>
        <div>
          <button
            type="button"
            onClick={() =>
              fillCredentials('admin@brightloop.io', 'BrightloopAdmin@2026')
            }
          >
            Admin <ArrowUpRight size={13} />
          </button>
          <button
            type="button"
            onClick={() =>
              fillCredentials('staff@brightloop.io', 'BrightloopStaff@2026')
            }
          >
            Staff <ArrowUpRight size={13} />
          </button>
          <button
            type="button"
            onClick={() =>
              fillCredentials('acme@example.com', 'CustomerUser@2026')
            }
          >
            Customer <ArrowUpRight size={13} />
          </button>
        </div>
      </div>
      <p className="bl-auth-switch">
        New here? <Link to="/register">Create your account</Link>
      </p>
    </AuthLayout>
  )
}
