import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowUpRight } from 'lucide-react'
import { AuthLayout } from './AuthLayout'
import { useAuth } from './AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

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
      const resp = err?.response?.data
      if (resp) {
        const firstErrKey = Object.keys(resp)[0]
        const errVal = Array.isArray(resp[firstErrKey])
          ? resp[firstErrKey][0]
          : resp[firstErrKey]
        setError(`${firstErrKey}: ${errVal}`)
      } else {
        setError('Registration failed. Please check the details and try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout mode="register">
      <span className="bl-eyebrow">A FRESH START</span>
      <h1>
        Make yourself
        <br />
        <em>right at home.</em>
      </h1>
      <p className="bl-auth-description">
        Create your account. Bring your subscriptions together.
      </p>
      {error && (
        <div className="bl-notice bl-notice-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}
      <form onSubmit={handleSubmit} className="bl-form">
        <div className="bl-form-row">
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
        <div className="bl-form-row">
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
        <div className="bl-form-row">
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
        <p className="bl-form-hint" id="password-guidance">
          Use at least 9 characters, including uppercase and lowercase letters
          and a special character.
        </p>
        <Button type="submit" className="bl-submit" isLoading={isLoading}>
          Create account <ArrowUpRight size={17} />
        </Button>
      </form>
      <p className="bl-auth-switch">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </AuthLayout>
  )
}
