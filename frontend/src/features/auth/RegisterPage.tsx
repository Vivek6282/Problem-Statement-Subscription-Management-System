import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowRight } from 'lucide-react'
import { AuthLayout } from './AuthLayout'
import { useAuth } from './AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatApiError } from '@/lib/apiErrors'

export const RegisterPage: React.FC = () => {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    company_name: '',
    first_name: '',
    last_name: '',
    phone: '',
    password: '',
    password_confirm: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (formData.password !== formData.password_confirm) {
      setError('Passwords do not match.')
      return
    }

    if (formData.password.length < 9) {
      setError('Password must be at least 9 characters long.')
      return
    }

    setIsLoading(true)
    try {
      await register(formData)
      navigate('/portal')
    } catch (err: any) {
      setError(
        formatApiError(err, 'Registration failed. Please check the details and try again.'),
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout mode="register">
      <span className="auth-eyebrow">A fresh start</span>
      <h1>
        Make yourself
        <br />
        <em>right at home.</em>
      </h1>
      <p className="auth-lede">
        Create your account. Bring your subscriptions together.
      </p>
      {error && (
        <div className="auth-notice" role="alert">
          <AlertCircle size={16} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="auth-row">
          <Input
            label="First name"
            name="first_name"
            autoComplete="given-name"
            required
            value={formData.first_name}
            onChange={handleChange}
            placeholder="Alice"
          />
          <Input
            label="Last name"
            name="last_name"
            autoComplete="family-name"
            required
            value={formData.last_name}
            onChange={handleChange}
            placeholder="Smith"
          />
        </div>
        <Input
          label="Company name (optional)"
          name="company_name"
          autoComplete="organization"
          value={formData.company_name}
          onChange={handleChange}
          placeholder="Your company"
        />
        <div className="auth-row">
          <Input
            label="Email address"
            type="email"
            name="email"
            autoComplete="email"
            required
            value={formData.email}
            onChange={handleChange}
            placeholder="you@company.com"
          />
          <Input
            label="Phone (optional)"
            type="tel"
            name="phone"
            autoComplete="tel"
            value={formData.phone}
            onChange={handleChange}
            placeholder="+1 (555) 000-0000"
          />
        </div>
        <div className="auth-row">
          <Input
            label="Password"
            type="password"
            name="password"
            autoComplete="new-password"
            aria-describedby="password-guidance"
            required
            value={formData.password}
            onChange={handleChange}
            placeholder="Create a password"
          />
          <Input
            label="Confirm password"
            type="password"
            name="password_confirm"
            autoComplete="new-password"
            required
            value={formData.password_confirm}
            onChange={handleChange}
            placeholder="Repeat password"
          />
        </div>
        <p className="auth-hint" id="password-guidance">
          Use at least 9 characters, including uppercase and lowercase letters
          and a special character.
        </p>
        <Button type="submit" className="auth-submit" isLoading={isLoading}>
          Create account <ArrowRight size={16} aria-hidden="true" />
        </Button>
      </form>
      <p className="auth-switch">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </AuthLayout>
  )
}
